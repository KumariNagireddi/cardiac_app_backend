const nodemailer = require('nodemailer');

let transporter = null;

if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: (process.env.SMTP_PORT === '465'),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  transporter.verify().then(() => {
    console.log('SMTP transporter ready');
  }).catch(err => {
    console.error('SMTP verify failed:', err.message);
    transporter = null;
  });
} else {
  console.warn('SMTP not configured: set SMTP_HOST, SMTP_USER, SMTP_PASS to enable emails.');
}

module.exports = transporter;
