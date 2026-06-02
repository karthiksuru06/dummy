const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Admin = require('../models/Admin');
const RefreshToken = require('../models/RefreshToken');
const { generateOTP, hashOTP, verifyOTP, sendOTPEmail, isOTPExpired } = require('../utils/otpService');

const router = express.Router();

// Configure multer for file uploads
const crypto = require('crypto');

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const hashRefreshToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// Mints a random refresh token, persists its hash, and returns the raw token.
async function issueRefreshToken(userId, role) {
  const token = crypto.randomBytes(40).toString('hex');
  await RefreshToken.create({
    user_id: userId,
    role,
    token_hash: hashRefreshToken(token),
    expires_at: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });
  return token;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // Random, collision-free name (was Date.now(), which collides under
    // concurrency and produces guessable URLs).
    cb(null, `${crypto.randomUUID()}${path.extname(file.originalname)}`);
  }
});

// Restrict type + size on the public registration upload (was unrestricted).
const ALLOWED = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Unsupported file type'));
  },
});

// Patient Registration
router.post('/patients/register', upload.single('medical_reports'), async (req, res) => {
  try {
    const { full_name, last_name, email, phone, password, dob, gender, address, emergency_contact, blood_group, medical_history, current_medications, height, weight, bpm, agreed_terms } = req.body;

    // Validate required fields
    if (!full_name || !last_name || !email || !phone || !password || !dob || !gender || !address || !emergency_contact || !blood_group) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    // Check if patient already exists
    const existingPatient = await Patient.findOne({ email });
    if (existingPatient) {
      return res.status(400).json({ message: 'Patient with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create patient
    const patient = new Patient({
      full_name,
      last_name,
      email,
      phone,
      password: hashedPassword,
      dob: new Date(dob),
      gender,
      address,
      emergency_contact,
      blood_group,
      medical_history,
      current_medications,
      medical_reports: req.file ? req.file.path : null,
      height,
      weight,
      bpm,
      agreed_terms: agreed_terms === 'true' || agreed_terms === true,
    });

    await patient.save();
    res.status(201).json({ message: 'Patient registered successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Doctor Registration
router.post('/doctors/register', upload.single('cert_docs'), async (req, res) => {
  try {
    const { full_name, last_name, email, phone, password, dob, gender, address, specialization, experience, available_day, start_time, end_time, clinic_name, clinic_address, agreed_terms, availability_schedule } = req.body;

    // Validate required fields
    if (!full_name || !last_name || !email || !phone || !password || !dob || !gender || !address) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    // Check if doctor already exists
    const existingDoctor = await Doctor.findOne({ email });
    if (existingDoctor) {
      return res.status(400).json({ message: 'Doctor with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Parse availability schedule if provided
    let parsedAvailability = [];
    if (availability_schedule) {
      try {
        parsedAvailability = JSON.parse(availability_schedule);
      } catch (error) {
        console.error('Error parsing availability_schedule:', error);
      }
    }

    // Create doctor
    const doctor = new Doctor({
      full_name,
      last_name,
      email,
      phone,
      password: hashedPassword,
      dob: new Date(dob),
      gender,
      address,
      specialization,
      experience,
      available_day,
      start_time,
      end_time,
      clinic_name,
      clinic_address,
      cert_docs: req.file ? req.file.path : null,
      availability_schedule: parsedAvailability,
      agreed_terms: agreed_terms === 'true' || agreed_terms === true,
    });

    await doctor.save();
    res.status(201).json({
      message: 'Registration successful! Your account is pending admin approval. You will be able to login once approved.',
      status: 'pending',
      requiresApproval: true
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Patient Login
router.post('/patients/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find patient
    const patient = await Patient.findOne({ email });
    if (!patient) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, patient.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Generate JWT
    const token = jwt.sign({ id: patient._id, role: 'patient' }, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
    const refreshToken = await issueRefreshToken(patient._id, 'patient');

    // Return token and patient data (excluding password)
    res.json({
      message: 'Login successful',
      token,
      refreshToken,
      user: {
        _id: patient._id,
        full_name: patient.full_name,
        last_name: patient.last_name,
        email: patient.email,
        phone: patient.phone,
        role: 'patient'
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Doctor Login
router.post('/doctors/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find doctor
    const doctor = await Doctor.findOne({ email });
    if (!doctor) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, doctor.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Check if doctor is approved
    if (doctor.status === 'pending') {
      return res.status(403).json({
        message: 'Your account is pending approval. Please wait for admin to approve your registration.',
        status: 'pending'
      });
    }

    if (doctor.status === 'rejected') {
      return res.status(403).json({
        message: 'Your account has been rejected by the admin. Please contact support for more information.',
        status: 'rejected'
      });
    }

    if (doctor.status === 'deactivated') {
      return res.status(403).json({
        message: 'Your account has been deactivated. Please contact admin for reactivation.',
        status: 'deactivated'
      });
    }

    // Only allow login if status is 'approved'
    if (doctor.status !== 'approved') {
      return res.status(403).json({
        message: 'Your account is not active. Please contact admin.',
        status: doctor.status
      });
    }

    // Generate JWT
    const token = jwt.sign({ id: doctor._id, role: 'doctor' }, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
    const refreshToken = await issueRefreshToken(doctor._id, 'doctor');

    // Return token and doctor data (excluding password)
    res.json({
      message: 'Login successful',
      token,
      refreshToken,
      user: {
        _id: doctor._id,
        full_name: doctor.full_name,
        last_name: doctor.last_name,
        email: doctor.email,
        phone: doctor.phone,
        specialization: doctor.specialization,
        status: doctor.status,
        role: 'doctor'
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin Login
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find admin
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: admin._id, role: 'admin', email: admin.email },
      process.env.JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_TTL }
    );
    const refreshToken = await issueRefreshToken(admin._id, 'admin');

    res.json({
      message: 'Admin login successful',
      token,
      refreshToken,
      admin: {
        id: admin._id,
        email: admin.email,
        full_name: admin.full_name
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin Registration — gated. Previously this was open to the public, allowing
// anyone to self-grant admin and read all PHI. Now it requires a one-time
// bootstrap secret (set ADMIN_REGISTRATION_SECRET in env for initial seeding,
// then unset it). Prefer the seed script over leaving this enabled.
router.post('/admin/register', async (req, res) => {
  try {
    const bootstrapSecret = process.env.ADMIN_REGISTRATION_SECRET;
    if (!bootstrapSecret || req.headers['x-admin-bootstrap'] !== bootstrapSecret) {
      return res.status(403).json({ message: 'Admin registration is disabled' });
    }

    const { email, password, full_name } = req.body;

    // Validate required fields
    if (!email || !password || !full_name) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin
    const admin = new Admin({
      email,
      password: hashedPassword,
      full_name,
    });

    await admin.save();
    res.status(201).json({ message: 'Admin registered successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Forgot Password - Send OTP
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check if user exists in any of the three collections
    let user = null;
    let userType = null;

    const patient = await Patient.findOne({ email });
    if (patient) {
      user = patient;
      userType = 'patient';
    } else {
      const doctor = await Doctor.findOne({ email });
      if (doctor) {
        user = doctor;
        userType = 'doctor';
      } else {
        const admin = await Admin.findOne({ email });
        if (admin) {
          user = admin;
          userType = 'admin';
        }
      }
    }

    if (!user) {
      return res.status(404).json({ message: 'No user found with this email' });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpHash = hashOTP(otp);

    // Save OTP to user document
    user.otp_hash = otpHash;
    user.otp_created_at = new Date();
    await user.save();

    // Send OTP via email (best effort - doesn't fail the request if email is not configured)
    try {
      await sendOTPEmail(email, otp, userType);
      res.status(200).json({
        message: 'OTP sent successfully to your email',
        email: email,
        userType: userType,
        testMode: false
      });
    } catch (emailError) {
      console.warn('Email not sent (test mode):', emailError.message);
      // In test mode, we still return success but indicate it's in test mode
      // OTP is printed to console for testing
      res.status(200).json({
        message: 'OTP request processed. Check console for OTP in test mode.',
        email: email,
        userType: userType,
        testMode: true,
        note: 'Email service not configured. Check backend console for OTP.'
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    // Find user in any collection
    let user = null;
    let userType = null;

    const patient = await Patient.findOne({ email });
    if (patient) {
      user = patient;
      userType = 'patient';
    } else {
      const doctor = await Doctor.findOne({ email });
      if (doctor) {
        user = doctor;
        userType = 'doctor';
      } else {
        const admin = await Admin.findOne({ email });
        if (admin) {
          user = admin;
          userType = 'admin';
        }
      }
    }

    if (!user) {
      return res.status(404).json({ message: 'No user found with this email' });
    }

    if (!user.otp_hash || !user.otp_created_at) {
      return res.status(400).json({ message: 'No OTP request found. Please request OTP first' });
    }

    // Check if OTP has expired
    if (isOTPExpired(user.otp_created_at)) {
      user.otp_hash = null;
      user.otp_created_at = null;
      await user.save();
      return res.status(400).json({ message: 'OTP has expired. Please request a new one' });
    }

    // Verify OTP
    if (!verifyOTP(otp, user.otp_hash)) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Generate temporary token for password reset
    const resetToken = jwt.sign(
      { id: user._id, email: user.email, type: 'password-reset', userType: userType },
      process.env.JWT_SECRET,
      { expiresIn: '15m' } // Token valid for 15 minutes
    );

    // Clear OTP after successful verification
    user.otp_hash = null;
    user.otp_created_at = null;
    await user.save();

    res.status(200).json({
      message: 'OTP verified successfully',
      resetToken: resetToken,
      email: email,
      userType: userType
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, newPassword, confirmPassword, resetToken } = req.body;

    if (!email || !newPassword || !confirmPassword || !resetToken) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Verify reset token
    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ message: 'Invalid or expired reset token' });
    }

    // Ensure token is for password reset
    if (decoded.type !== 'password-reset') {
      return res.status(401).json({ message: 'Invalid token type' });
    }

    // Find user
    let user = null;
    if (decoded.userType === 'patient') {
      user = await Patient.findOne({ email });
    } else if (decoded.userType === 'doctor') {
      user = await Doctor.findOne({ email });
    } else if (decoded.userType === 'admin') {
      user = await Admin.findOne({ email });
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.email !== email) {
      return res.status(400).json({ message: 'Email mismatch' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: 'Password reset successfully. Please login with your new password' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Refresh Access Token (with rotation)
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const stored = await RefreshToken.findOne({
      token_hash: hashRefreshToken(refreshToken),
      revoked: false,
      expires_at: { $gt: new Date() },
    });

    if (!stored) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    // Rotate: revoke the presented token, issue a fresh one.
    stored.revoked = true;
    await stored.save();

    const token = jwt.sign(
      { id: stored.user_id, role: stored.role },
      process.env.JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_TTL }
    );
    const newRefreshToken = await issueRefreshToken(stored.user_id, stored.role);

    res.json({ message: 'Token refreshed', token, refreshToken: newRefreshToken });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Logout — revoke a refresh token (idempotent)
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await RefreshToken.updateOne(
        { token_hash: hashRefreshToken(refreshToken) },
        { $set: { revoked: true } }
      );
    }
    res.status(200).json({ message: 'Logged out' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
