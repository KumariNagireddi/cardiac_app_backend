require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const cron = require('node-cron');
const db = require('./database/db');
const { sendMail } = require('./utils/mailer');

const authRoutes = require('./routes/auth');
const patientsRoutes = require('./routes/patients');
const readingsRoutes = require('./routes/readings');
const remindersRoutes = require('./routes/reminders');
const profileRoutes = require('./routes/profile');

const app = express();
const PORT = process.env.PORT || 5000;

// app.use(cors());
app.use(cors({
  origin: ['http://localhost:3000', 'https://your-frontend-domain.com'], // both local + deployed
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

app.use(bodyParser.json());

// Make sure route prefix is consistent with frontend expectations
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientsRoutes);
app.use('/api/readings', readingsRoutes);
app.use('/api/reminders', remindersRoutes);
app.use('/api/profile', profileRoutes);
app.use((req, res, next) => {
  console.log('[INCOMING REQUEST]', req.method, req.url);
  next();
});

// Serve frontend build if in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'frontend/dist')));
  // send index.html for unknown routes (if using client‑side routing)
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'frontend/dist', 'index.html')));
}

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Cron job for reminders
// ✅ Cron job for reminders — improved version

cron.schedule('* * * * *', () => {
  const now = new Date().toISOString();
  console.log(`[CRON] Checking reminders at ${now}`);

  const query = `
    SELECT r.*, u.email, u.name AS user_name, p.name AS patient_name
    FROM reminders r
    JOIN users u ON r.user_id = u.id
    LEFT JOIN patients p ON r.patient_id = p.id
    WHERE r.enabled = 1
      AND (r.remind_time IS NULL OR datetime(r.remind_time) <= datetime(?))
  `;

  db.all(query, [now], (err, rows) => {
    if (err) {
      console.error('[CRON] Reminder query error:', err);
      return;
    }

    if (!rows.length) {
      console.log('[CRON] No reminders due.');
      return;
    }

    rows.forEach(rem => {
      console.log(`[CRON] Sending reminder for ${rem.user_name} (${rem.email})`);

      const html = `
        <p>Hi ${rem.user_name},</p>
        <p>${rem.message || 'Please check your blood pressure.'}</p>
        ${rem.patient_name ? `<p>Patient: <strong>${rem.patient_name}</strong></p>` : ''}
        <p>Regards,<br/>CardiSave</p>
      `;

      sendMail({
        from: process.env.FROM_EMAIL,
        to: rem.email,
        subject: `Reminder: ${rem.message || 'BP Check'}`,
        html
      }, (errMail) => {
        if (errMail) {
          console.error('[CRON] Failed to send email:', errMail);
          return;
        }

        console.log(`[CRON] Email sent successfully to ${rem.email}`);

        // ✅ Calculate next remind_time based on frequency
        const nextTime = new Date();
        if (rem.frequency === 'daily') nextTime.setDate(nextTime.getDate() + 1);
        if (rem.frequency === 'weekly') nextTime.setDate(nextTime.getDate() + 7);
        if (rem.frequency === 'monthly') nextTime.setMonth(nextTime.getMonth() + 1);

        // ✅ Update the reminder for the next run
        db.run(
          `UPDATE reminders SET remind_time = ?, updated_at = datetime('now'), sent = 0 WHERE id = ?`,
          [nextTime.toISOString(), rem.id],
          errUpd => {
            if (errUpd)
              console.error('[CRON] Failed to update next reminder time:', errUpd);
            else
              console.log(`[CRON] Next reminder scheduled for ${nextTime.toISOString()}`);
          }
        );
      });
    });
  });
});


app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
