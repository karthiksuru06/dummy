const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Configure Nodemailer transporter with lazy initialization
let transporter = null;
let transporterInitialized = false;

// Function to get or create transporter (lazy initialization)
const getTransporter = () => {
  if (transporterInitialized) {
    return transporter;
  }

  transporterInitialized = true;

  try {
    if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
      console.warn('⚠️  Email service not configured. OTP feature will work but emails won\'t be sent.');
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
    console.warn('⚠️  Failed to initialize email transporter:', error.message);
    return null;
  }
};

// Generate a 6-digit OTP using a CSPRNG (Math.random is predictable).
const generateOTP = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

// Hash OTP for storage
const hashOTP = (otp) => {
  return crypto.createHash('sha256').update(otp).digest('hex');
};

// Verify OTP against hashed value
const verifyOTP = (otp, hashedOTP) => {
  return hashOTP(otp) === hashedOTP;
};

// Send OTP email
const sendOTPEmail = async (email, otp, userType) => {
  const transporter = getTransporter();

  // If email service is not configured, allow OTP to work in test mode
  if (!transporter) {
    console.log(`\n📧 ═══════════════════════════════════════════════════════`);
    console.log(`📧 TEST MODE - OTP Generated`);
    console.log(`📧 Email: ${email}`);
    console.log(`📧 OTP: ${otp}`);
    console.log(`📧 Valid for: ${process.env.OTP_EXPIRY || 10} minutes`);
    console.log(`📧 ═══════════════════════════════════════════════════════\n`);
    return { 
      success: true, 
      message: 'OTP generated in test mode. Check console for OTP.' 
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

    const mailOptions = {
      from: process.env.SMTP_EMAIL,
      to: email,
      subject: 'MEDviz - Password Reset OTP',
      html: htmlContent
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent successfully to ${email}`);
    return { success: true, message: 'OTP sent successfully to your email' };
  } catch (error) {
    console.error('❌ Email sending error:', error.message);
    // Throw error so calling code can handle it
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
