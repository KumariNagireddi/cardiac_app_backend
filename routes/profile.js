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

router.get('/:userId', (req, res) => {
  const userId = req.params.userId;
  db.get(`SELECT * FROM profiles WHERE user_id = ? LIMIT 1`, [userId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row || null);
  });
});

router.post('/create', (req, res) => {
  const { id, userId, age, gender, weight, height, bmi } = req.body;
  db.run(`INSERT INTO profiles (id, user_id, age, gender, weight, height, bmi, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`, [id, userId, age, gender, weight, height, bmi], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id });
  });
});

router.put('/update', (req, res) => {
  const { id, age, gender, weight, height, bmi } = req.body;
  db.run(`UPDATE profiles SET age = ?, gender = ?, weight = ?, height = ?, bmi = ?, updated_at = datetime('now') WHERE id = ?`, [age, gender, weight, height, bmi, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changed: this.changes });
  });
});

module.exports = router;
