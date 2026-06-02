const nodemailer = require('nodemailer');

// Lazy transporter, same approach as utils/otpService.js
let transporter = null;
let transporterInitialized = false;

const getTransporter = () => {
  if (transporterInitialized) {
    return transporter;
  }

  transporterInitialized = true;

  try {
    if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
      return null;
    }

    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: (process.env.SMTP_PASSWORD || '').trim()
      }
    });

    return transporter;
  } catch (error) {
    console.error('[email] Failed to initialize transporter:', error.message);
    return null;
  }
};

// Best-effort email send. Never throws; never rejects in a way that breaks callers.
const sendEmail = async ({ to, subject, text, html }) => {
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  const tx = getTransporter();
  if (!tx) {
    console.log('[email] SMTP not configured, skipping');
    return;
  }

  try {
    await tx.sendMail({
      from: process.env.SMTP_EMAIL,
      to,
      subject,
      text,
      html
    });
    console.log(`[email] Sent "${subject}" to ${to}`);
  } catch (error) {
    console.error('[email] Send failed:', error.message);
  }
};

module.exports = { sendEmail };
