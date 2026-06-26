const { Resend } = require('resend');

// Initialize Resend client
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Best-effort email send. Never throws; never rejects in a way that breaks callers.
const sendEmail = async ({ to, subject, text, html }) => {
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  if (!resend) {
    console.log('[email] Resend API key not configured, skipping');
    return;
  }

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'MEDviz <onboarding@resend.dev>',
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