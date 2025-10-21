require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const cron = require('node-cron');
const db = require('./database/db');
const mailer = require('./utils/mailer');

const authRoutes = require('./routes/auth');
const patientsRoutes = require('./routes/patients');
const readingsRoutes = require('./routes/readings');
const remindersRoutes = require('./routes/reminders');
const profileRoutes = require('./routes/profile');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
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
  app.use(express.static(path.join(__dirname, 'public')));
  // send index.html for unknown routes (if using client‑side routing)
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
}

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Cron job for reminders
cron.schedule('* * * * *', () => {
  const now = new Date().toISOString();
  console.log('[CRON] checking reminders at', now);
  const q = `
    SELECT r.*, u.email, u.name AS user_name, p.name AS patient_name
    FROM reminders r
    JOIN users u ON r.user_id = u.id
    LEFT JOIN patients p ON r.patient_id = p.id
    WHERE r.enabled = 1 AND r.sent = 0 AND (r.remind_time IS NULL OR datetime(r.remind_time) <= datetime(?))
  `;
  db.all(q, [now], (err, rows) => {
    if (err) {
      console.error('[CRON] reminders query error:', err);
      return;
    }
    rows.forEach(rem => {
      const q2 = `SELECT * FROM readings WHERE user_id = ? ORDER BY created_at DESC LIMIT 5`;
      db.all(q2, [rem.user_id], (err2, readings) => {
        if (err2) {
          console.error('[CRON] readings query error:', err2);
          return;
        }
        let html = `<p>Hi ${rem.user_name},</p>`;
        html += `<p>Your reminder: <strong>${rem.message || 'Please check your blood pressure'}</strong></p>`;
        if (rem.patient_name) {
          html += `<p>Patient: <strong>${rem.patient_name}</strong></p>`;
        }
        if (readings && readings.length) {
          html += `<h4>Recent Readings</h4><table border="1" cellpadding="6" style="border-collapse:collapse"><tr><th>Date</th><th>SBP</th><th>DBP</th><th>HR</th></tr>`;
          readings.forEach(r => {
            html += `<tr><td>${r.createdAt}</td><td>${r.systolic}</td><td>${r.diastolic}</td><td>${r.heart_rate || ''}</td></tr>`;
          });
          html += `</table>`;
        }
        html += `<p>Regards,<br/>Cardiac System</p>`;
        if (mailer) {
          mailer.sendMail({
            from: process.env.FROM_EMAIL || process.env.SMTP_USER,
            to: rem.email,
            subject: `Health reminder: ${rem.message || 'BP check'}`,
            html
          }, (errMail, info) => {
            if (errMail) {
              console.error('[CRON] email error', errMail);
            } else {
              console.log('[CRON] email sent to', rem.email);
              db.run('UPDATE reminders SET sent = 1 WHERE id = ?', [rem.id], errupd => {
                if (errupd) console.error('[CRON] failed to mark sent for reminder', rem.id, errupd);
              });
            }
          });
        } else {
          console.warn('[CRON] mailer not configured, skipping email for', rem.email);
        }
      });
    });
  });
});

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
