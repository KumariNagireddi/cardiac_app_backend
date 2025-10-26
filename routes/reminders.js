// backend/routes/reminders.js
const express = require('express');
const db = require('../database/db');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { sendMail } = require('../utils/mailer'); // <-- ADD THIS

function authMiddleware(req, res, next) {
  const h = req.headers.authorization;
  if (!h) return res.status(401).json({ error: 'No token' });
  const token = h.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'replace_with_secure_secret');
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

router.use(authMiddleware);

router.post('/create', (req, res) => {
  const { id, userId, patient_id, message, frequency, enabled, remind_time } = req.body;
  
  db.run(
    `INSERT INTO reminders (id, user_id, patient_id, message, frequency, enabled, remind_time, created_at, updated_at, sent)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), 0)`,
    [id, userId, patient_id, message, frequency, enabled ? 1 : 0, remind_time || null],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });

      // ✅ Send email if enabled
      if (enabled) {
        sendMail({
          to: process.env.FROM_EMAIL, // or the user’s email
          subject: 'Reminder Activated',
          html: `<p>Your ${frequency} reminder has been activated!</p>`,
        });
      }

      res.json({ id });
    }
  );
});

router.put('/update', (req, res) => {
  const { id, frequency, enabled, remind_time } = req.body;
  db.run(
    `UPDATE reminders SET frequency = ?, enabled = ?, remind_time = ?, updated_at = datetime('now') WHERE id = ?`,
    [frequency, enabled ? 1 : 0, remind_time || null, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });

      // ✅ Send email if enabled
      if (enabled) {
        sendMail({
          to: process.env.FROM_EMAIL, // or user’s email address
          subject: 'Reminder Updated',
          html: `<p>Your ${frequency} reminder has been updated and enabled.</p>`,
        });
      }

      res.json({ changed: this.changes });
    }
  );
});

module.exports = router;
