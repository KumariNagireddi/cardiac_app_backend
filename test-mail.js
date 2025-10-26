require('dotenv').config();
const { sendMail } = require('./utils/mailer');

sendMail({
  from: process.env.FROM_EMAIL,
  to: process.env.FROM_EMAIL,
  subject: 'Test Email from CardiSave',
  html: '<p>This is a test email from your reminder system.</p>'
}, (err) => {
  if (err) console.error('❌ Mail test failed:', err);
  else console.log('✅ Mail test successful!');
});
