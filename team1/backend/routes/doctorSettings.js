const express = require('express');
const router = express.Router();
const DoctorSettings = require('../models/DoctorSettings');
const Doctor = require('../models/Doctor');
const bcrypt = require('bcryptjs');

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
router.post('/:doctorId/change-password', async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
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
