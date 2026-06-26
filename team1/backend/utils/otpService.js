const crypto = require('crypto');
const { Resend } = require('resend');

// Initialize Resend client
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Generate a 6-digit OTP using a CSPRNG (Math.random is predictable).
const generateOTP = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

// Hash OTP for storage
const hashOTP = (otp) => {
  return crypto.createHash('sha256').update(otp).digest('hex');
};

// Verify OTP against hashed value (constant-time to avoid timing leaks)
const verifyOTP = (otp, hashedOTP) => {
  if (!otp || !hashedOTP) return false;
  const a = Buffer.from(hashOTP(otp), 'hex');
  const b = Buffer.from(String(hashedOTP), 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

// Send OTP email via Resend
const sendOTPEmail = async (email, otp, userType) => {
  if (!resend) {
    // SECURITY: never expose the OTP via logs/response in production. If email
    // is not configured in prod, the reset flow must hard-fail (an attacker
    // could otherwise read the OTP from logs and take over any account).
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ RESEND_API_KEY not configured — refusing to issue OTP in production.');
      throw new Error('Email service is not configured');
    }
    // Local/dev only: print to console so developers can test without email.
    console.log(`\n📧 [DEV ONLY] OTP for ${email}: ${otp} (valid ${process.env.OTP_EXPIRY || 10} min)\n`);
    return {
      success: true,
      message: 'OTP sent.',
    };
  }

  try {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5; border-radius: 10px;">
        <h2 style="color: #333; text-align: center;">MEDviz - Password Reset Request</h2>
        <p style="color: #666; font-size: 16px;">Hello,</p>
        <p style="color: #666; font-size: 16px;">You requested to reset your password. Here is your One-Time Password (OTP):</p>
        
        <div style="background-color: #007bff; color: white; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0;">
          <h1 style="margin: 0; font-size: 48px; letter-spacing: 5px;">${otp}</h1>
        </div>
        
        <p style="color: #666; font-size: 16px;">
          This OTP will expire in <strong>${process.env.OTP_EXPIRY || 10} minutes</strong>.
        </p>
        
        <p style="color: #666; font-size: 16px;">
          If you did not request a password reset, please ignore this email.
        </p>
        
        <p style="color: #999; font-size: 14px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
          This is an automated email from MEDviz. Please do not reply to this email.
        </p>
      </div>
    `;

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'MEDviz <onboarding@resend.dev>',
      to: email,
      subject: 'MEDviz - Password Reset OTP',
      html: htmlContent,
    });

    console.log(`✅ OTP email sent successfully to ${email}`);
    return { success: true, message: 'OTP sent successfully to your email' };
  } catch (error) {
    console.error('❌ Email sending error:', error.message);
    throw error;
  }
};

// Check if OTP has expired (based on createdAt timestamp)
const isOTPExpired = (createdAt) => {
  const expiryMinutes = parseInt(process.env.OTP_EXPIRY || 10);
  const expiryTime = new Date(createdAt).getTime() + expiryMinutes * 60 * 1000;
  return Date.now() > expiryTime;
};

module.exports = {
  generateOTP,
  hashOTP,
  verifyOTP,
  sendOTPEmail,
  isOTPExpired
};