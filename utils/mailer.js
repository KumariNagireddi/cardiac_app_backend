// backend/utils/mailer.js
const axios = require('axios');

async function sendMail({ from, to, subject, html }, callback) {
  try {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) throw new Error('Missing BREVO_API_KEY environment variable');
    const senderEmail = from || process.env.FROM_EMAIL;

    await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: { name: 'CardiSave', email: 'nagireddi709@gmail.com' },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      },
      {
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(`✅ Email sent to ${to}`);
    if (callback) callback(null, { success: true });
  } catch (err) {
    console.error('❌ Failed to send email:', err.response?.data || err.message);
    if (callback) callback(err);
  }
}

module.exports = { sendMail };
