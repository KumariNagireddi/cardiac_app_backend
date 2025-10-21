const express = require('express');
const db = require('../database/db');
const router = express.Router();
const jwt = require('jsonwebtoken');

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

router.post('/', (req, res) => {
  const { name, dob, contact, notes } = req.body;
  db.run(`INSERT INTO patients (user_id, name, dob, contact, notes) VALUES (?, ?, ?, ?, ?)`, [req.user.id, name, dob, contact, notes], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

router.get('/', (req, res) => {
  db.all(`SELECT * FROM patients WHERE user_id = ? ORDER BY created_at DESC`, [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

module.exports = router;
