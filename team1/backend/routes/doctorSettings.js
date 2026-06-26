const express = require('express');
const router = express.Router();
const DoctorSettings = require('../models/DoctorSettings');
const Doctor = require('../models/Doctor');
const bcrypt = require('bcryptjs');
const { audit } = require('../middleware/audit');

// Ownership guard: this router is mounted behind authenticate + requireRole('doctor').
// A doctor may only ever read/modify their OWN settings — reject any :doctorId
// that is not the authenticated doctor (previously any doctor could read/update
// another doctor's settings and change their password).
router.param('doctorId', (req, res, next, doctorId) => {
  if (!req.user || String(doctorId) !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Forbidden: not your settings' });
  }
  next();
});

// Get doctor settings
router.get('/:doctorId', async (req, res) => {
  try {
    const { doctorId } = req.params;

    let settings = await DoctorSettings.findOne({ doctor_id: doctorId });

    // If settings don't exist, create default settings
    if (!settings) {
      settings = new DoctorSettings({
        doctor_id: doctorId
      });
      await settings.save();
    }

    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Error fetching doctor settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching doctor settings',
      error: error.message
    });
  }
});

// Update doctor settings
router.put('/:doctorId', async (req, res) => {
  try {
    const { doctorId } = req.params;
    const settingsData = req.body;

    let settings = await DoctorSettings.findOne({ doctor_id: doctorId });

    if (!settings) {
      // Create new settings if they don't exist
      settings = new DoctorSettings({
        doctor_id: doctorId,
        ...settingsData
      });
    } else {
      // Update existing settings
      Object.assign(settings, settingsData);
    }

    await settings.save();

    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings
    });
  } catch (error) {
    console.error('Error updating doctor settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating doctor settings',
      error: error.message
    });
  }
});

// Change password
router.post('/:doctorId/change-password', audit('doctor.password.change', 'Doctor'), async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (typeof new_password !== 'string' || new_password.length < 8 || !/[a-zA-Z]/.test(new_password) || !/\d/.test(new_password)) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters and include a letter and a number'
      });
    }

    const doctor = await Doctor.findById(doctorId);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(current_password, doctor.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(new_password, salt);

    // Update password
    doctor.password = hashedPassword;
    await doctor.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing password',
      error: error.message
    });
  }
});

module.exports = router;
