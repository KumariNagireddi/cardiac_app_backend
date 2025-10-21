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
  const { systolic, diastolic, heartRate, patient_id, notes } = req.body;
  if (systolic == null || diastolic == null) return res.status(400).json({ error: 'Missing vitals' });
  const map = (systolic + 2 * diastolic) / 3;
  const pulsePressure = systolic - diastolic;
  const shockIndex = heartRate ? (heartRate / systolic) : null;

  let risk = 'Normal', advice = 'No immediate concern';
  if (systolic > 180 || diastolic > 120) {
    risk = 'Hypertensive Crisis'; advice = 'Seek emergency care immediately';
  } else if (systolic >= 140 || diastolic >= 90) {
    risk = 'High Blood Pressure'; advice = 'Consult your doctor soon';
  } else if (systolic < 90 || diastolic < 60) {
    risk = 'Low Blood Pressure'; advice = 'Monitor symptoms and consult doctor';
  }

  db.run(`INSERT INTO readings (user_id, patient_id, systolic, diastolic, heart_rate, map_value, pulse_pressure, shock_index, risk_level, advice, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [req.user.id, patient_id, systolic, diastolic, heartRate, map, pulsePressure, shockIndex, risk, advice, notes], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, map, pulsePressure, shockIndex, risk, advice });
  });
});

router.get('/:userId', (req, res) => {
  const userId = req.params.userId;
  db.all(`SELECT * FROM readings WHERE user_id = ? ORDER BY created_at DESC`, [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

module.exports = router;
