const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'replace_with_secure_secret';

function generateToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
}

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });
  try {
    const hash = await bcrypt.hash(password, 10);
    db.run(`INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)`, [name, email, hash], function(err) {
      if (err) {
        return res.status(400).json({ error: 'Email exists or DB error' });
      }
      const user = { id: this.lastID, name, email };
      const token = generateToken(user);
      res.json({ user, token });
    });
  } catch (e) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  console.log("Login attempt:", email);

  db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ error: 'DB error' });
    }
    if (!user) {
      console.warn("User not found for email:", email);
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      console.warn("Password mismatch for email:", email);
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = generateToken({ id: user.id, email: user.email });
    res.json({ user: { id: user.id, name: user.name, email: user.email }, token });
  });
});


module.exports = router;
