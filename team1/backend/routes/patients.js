const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');
const Report = require('../models/Report');
const Task = require('../models/Task');

// Helper function to parse appointment time string
const parseAppointmentTime = (timeString) => {
  const timeMatch = timeString.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!timeMatch) return null;

  let hours = parseInt(timeMatch[1]);
  const minutes = parseInt(timeMatch[2]);
  const meridiem = timeMatch[3];

  if (meridiem) {
    if (meridiem.toUpperCase() === 'PM' && hours !== 12) {
      hours += 12;
    } else if (meridiem.toUpperCase() === 'AM' && hours === 12) {
      hours = 0;
    }
  }

  return { hours, minutes };
};

// Helper function to auto-complete appointments that are 6+ hours past scheduled time
const autoCompleteOldAppointments = async (patientId) => {
  try {
    const now = new Date();
    const sixHoursAgo = new Date(now.getTime() - (6 * 60 * 60 * 1000));

    // Find all scheduled appointments for this patient
    const scheduledAppointments = await Appointment.find({
      patient_id: patientId,
      status: 'scheduled'
    });

    // Filter appointments that are more than 6 hours old
    const oldAppointments = scheduledAppointments.filter(appointment => {
      const appointmentDate = new Date(appointment.appointment_date);
      const timeParts = parseAppointmentTime(appointment.appointment_time);

      if (!timeParts) return false;

      appointmentDate.setHours(timeParts.hours, timeParts.minutes, 0, 0);
      return appointmentDate <= sixHoursAgo;
    });

    // Mark each old appointment as completed
    for (const appointment of oldAppointments) {
      appointment.status = 'completed';
      await appointment.save();

      // Also mark related tasks as completed
      await Task.updateMany(
        {
          related_appointment_id: appointment._id,
          status: 'pending'
        },
        { status: 'completed' }
      );

      console.log(`Auto-completed appointment ${appointment._id} for being 6+ hours past scheduled time`);
    }

    return oldAppointments.length;
  } catch (error) {
    console.error('Error auto-completing old appointments:', error);
    return 0;
  }
};

// Get all patients for a specific doctor
router.get('/doctor/:doctorId', async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { filter } = req.query; // 'all', 'recent', 'chronic'

    // Get all unique patient IDs from appointments with this doctor
    const appointments = await Appointment.find({ doctor_id: doctorId })
      .distinct('patient_id');

    // Build patient query
    const patientIds = appointments;

    // Get patients with their appointment count
    const patients = await Patient.find({ _id: { $in: patientIds } })
      .select('-password');

    // Get additional data for each patient
    const patientsWithData = await Promise.all(
      patients.map(async (patient) => {
        // Count total visits
        const totalVisits = await Appointment.countDocuments({
          patient_id: patient._id,
          doctor_id: doctorId,
          status: 'completed'
        });

        // Get last consultation
        const lastConsultation = await Appointment.findOne({
          patient_id: patient._id,
          doctor_id: doctorId,
          status: 'completed'
        }).sort({ appointment_date: -1 });

        // Get latest prescription for diagnosis
        const latestPrescription = await Prescription.findOne({
          patient_id: patient._id,
          doctor_id: doctorId
        }).sort({ created_at: -1 });

        // Calculate age from dob
        const age = patient.dob ?
          Math.floor((new Date() - new Date(patient.dob)) / (365.25 * 24 * 60 * 60 * 1000)) :
          null;

        return {
          _id: patient._id,
          name: `${patient.full_name} ${patient.last_name}`,
          email: patient.email,
          phone: patient.phone,
          age,
          gender: patient.gender,
          blood_group: patient.blood_group,
          address: patient.address,
          emergency_contact: patient.emergency_contact,
          medical_history: patient.medical_history,
          current_medications: patient.current_medications,
          lastConsultation: lastConsultation?.appointment_date || patient.created_at,
          diagnosis: latestPrescription?.diagnosis || 'No diagnosis available',
          totalVisits
        };
      })
    );

    // Apply filters
    let filteredPatients = patientsWithData;

    if (filter === 'recent') {
      // Patients seen in last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      filteredPatients = patientsWithData.filter(p =>
        new Date(p.lastConsultation) >= sevenDaysAgo
      );
    } else if (filter === 'chronic') {
      // Patients with more than 10 visits
      filteredPatients = patientsWithData.filter(p => p.totalVisits > 10);
    }

    // Sort by last consultation date (most recent first)
    filteredPatients.sort((a, b) =>
      new Date(b.lastConsultation) - new Date(a.lastConsultation)
    );

    res.json({
      success: true,
      patients: filteredPatients
    });
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching patients',
      error: error.message
    });
  }
});

// Get patient details with reports and prescriptions
router.get('/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;

    const patient = await Patient.findById(patientId).select('-password');
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Get patient reports
    const reports = await Report.find({ patient_id: patientId })
      .sort({ uploadedDate: -1 });

    // Get patient prescriptions
    const prescriptions = await Prescription.find({ patient_id: patientId })
      .populate('doctor_id', 'full_name last_name specialization')
      .sort({ created_at: -1 });

    // Get consultation history
    const consultations = await Appointment.find({
      patient_id: patientId,
      status: 'completed'
    })
    .populate('doctor_id', 'full_name last_name specialization')
    .sort({ appointment_date: -1 });

    // Calculate age
    const age = patient.dob ?
      Math.floor((new Date() - new Date(patient.dob)) / (365.25 * 24 * 60 * 60 * 1000)) :
      null;

    res.json({
      success: true,
      patient: {
        _id: patient._id,
        name: `${patient.full_name} ${patient.last_name}`,
        email: patient.email,
        phone: patient.phone,
        age,
        gender: patient.gender,
        blood_group: patient.blood_group,
        address: patient.address,
        emergency_contact: patient.emergency_contact,
        medical_history: patient.medical_history,
        current_medications: patient.current_medications,
        height: patient.height,
        weight: patient.weight,
        bpm: patient.bpm,
        reports,
        prescriptions,
        consultations
      }
    });
  } catch (error) {
    console.error('Error fetching patient details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching patient details',
      error: error.message
    });
  }
});

// Get patient appointments
router.get('/:patientId/appointments', async (req, res) => {
  try {
    const { patientId } = req.params;
    const { status } = req.query; // Optional filter by status

    // Auto-complete appointments that are 6+ hours past scheduled time
    await autoCompleteOldAppointments(patientId);

    const query = { patient_id: patientId };
    if (status) {
      query.status = status;
    }

    const appointments = await Appointment.find(query)
      .populate('doctor_id', 'full_name last_name specialization clinic_name clinic_address')
      .sort({ appointment_date: 1, appointment_time: 1 }); // Sort by upcoming first

    res.json({
      success: true,
      appointments
    });
  } catch (error) {
    console.error('Error fetching patient appointments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching appointments',
      error: error.message
    });
  }
});

// Get authenticated patient's profile (using token)
router.get('/profile', async (req, res) => {
  try {
    console.log('=== GET /profile called ===');

    // Get token from Authorization header
    const token = req.headers.authorization?.split(' ')[1];
    console.log('Token received:', token ? 'Yes' : 'No');

    if (!token) {
      console.log('No token provided');
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Verify token and get patient ID
    let decoded;
    try {
      console.log('Verifying token...');
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token verified successfully. Patient ID:', decoded.id);
    } catch (jwtError) {
      console.log('JWT Error caught:', jwtError.name, jwtError.message);
      if (jwtError.name === 'TokenExpiredError') {
        console.log('Returning 401 - Token expired');
        return res.status(401).json({
          success: false,
          message: 'Token has expired. Please login again.',
          tokenExpired: true
        });
      }
      if (jwtError.name === 'JsonWebTokenError') {
        console.log('Returning 401 - Invalid token');
        return res.status(401).json({
          success: false,
          message: 'Invalid token. Please login again.',
          tokenExpired: false
        });
      }
      console.log('Throwing unknown JWT error');
      throw jwtError;
    }

    const patientId = decoded.id;
    console.log('Looking up patient:', patientId);

    const patient = await Patient.findById(patientId).select('-password');
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Calculate age
    const age = patient.dob ?
      Math.floor((new Date() - new Date(patient.dob)) / (365.25 * 24 * 60 * 60 * 1000)) :
      null;

    res.json({
      success: true,
      profile: {
        _id: patient._id,
        name: `${patient.full_name} ${patient.last_name}`,
        full_name: patient.full_name,
        last_name: patient.last_name,
        email: patient.email,
        phone: patient.phone,
        age,
        dob: patient.dob,
        gender: patient.gender,
        address: patient.address,
        emergency_contact: patient.emergency_contact,
        blood_group: patient.blood_group,
        medical_history: patient.medical_history,
        current_medications: patient.current_medications,
        height: patient.height,
        weight: patient.weight,
        bpm: patient.bpm
      }
    });
  } catch (error) {
    console.error('=== Error in GET /profile ===');
    console.error('Error message:', error.message);
    console.error('Error name:', error.name);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error fetching patient profile',
      error: error.message,
      errorName: error.name
    });
  }
});

// Get patient profile for dashboard
router.get('/:patientId/profile', async (req, res) => {
  try {
    const { patientId } = req.params;

    const patient = await Patient.findById(patientId).select('-password');
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Calculate age
    const age = patient.dob ?
      Math.floor((new Date() - new Date(patient.dob)) / (365.25 * 24 * 60 * 60 * 1000)) :
      null;

    res.json({
      success: true,
      profile: {
        _id: patient._id,
        name: `${patient.full_name} ${patient.last_name}`,
        full_name: patient.full_name,
        last_name: patient.last_name,
        email: patient.email,
        phone: patient.phone,
        age,
        dob: patient.dob,
        gender: patient.gender,
        address: patient.address,
        emergency_contact: patient.emergency_contact,
        blood_group: patient.blood_group,
        medical_history: patient.medical_history,
        current_medications: patient.current_medications,
        height: patient.height,
        weight: patient.weight,
        bpm: patient.bpm
      }
    });
  } catch (error) {
    console.error('Error fetching patient profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching patient profile',
      error: error.message
    });
  }
});

// Update authenticated patient's profile (using token)
router.put('/profile', async (req, res) => {
  try {
    // Get token from Authorization header
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
        tokenExpired: false
      });
    }

    // Verify token and get patient ID
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token has expired. Please login again.',
          tokenExpired: true
        });
      }
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token. Please login again.',
          tokenExpired: false
        });
      }
      throw jwtError;
    }

    const patientId = decoded.id;

    const updates = req.body;

    // Remove fields that shouldn't be updated directly
    delete updates.password;
    delete updates.email; // Email shouldn't be changed this way
    delete updates._id;
    delete updates.created_at;

    // Find patient
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Update allowed fields
    const allowedFields = [
      'full_name',
      'last_name',
      'phone',
      'address',
      'emergency_contact',
      'blood_group',
      'medical_history',
      'current_medications',
      'height',
      'weight',
      'bpm',
      'dob',
      'gender'
    ];

    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        patient[field] = updates[field];
      }
    });

    await patient.save();

    // Calculate age
    const age = patient.dob ?
      Math.floor((new Date() - new Date(patient.dob)) / (365.25 * 24 * 60 * 60 * 1000)) :
      null;

    res.json({
      success: true,
      message: 'Profile updated successfully',
      profile: {
        _id: patient._id,
        name: `${patient.full_name} ${patient.last_name}`,
        full_name: patient.full_name,
        last_name: patient.last_name,
        email: patient.email,
        phone: patient.phone,
        age,
        dob: patient.dob,
        gender: patient.gender,
        address: patient.address,
        emergency_contact: patient.emergency_contact,
        blood_group: patient.blood_group,
        medical_history: patient.medical_history,
        current_medications: patient.current_medications,
        height: patient.height,
        weight: patient.weight,
        bpm: patient.bpm
      }
    });
  } catch (error) {
    console.error('Error updating patient profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating patient profile',
      error: error.message
    });
  }
});

// Update patient profile
router.put('/:patientId/profile', async (req, res) => {
  try {
    const { patientId } = req.params;
    const updates = req.body;

    // Remove fields that shouldn't be updated directly
    delete updates.password;
    delete updates.email; // Email shouldn't be changed this way
    delete updates._id;
    delete updates.created_at;

    // Find patient
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Update allowed fields
    const allowedFields = [
      'full_name',
      'last_name',
      'phone',
      'address',
      'emergency_contact',
      'blood_group',
      'medical_history',
      'current_medications',
      'height',
      'weight',
      'bpm',
      'dob',
      'gender'
    ];

    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        patient[field] = updates[field];
      }
    });

    await patient.save();

    // Calculate age
    const age = patient.dob ?
      Math.floor((new Date() - new Date(patient.dob)) / (365.25 * 24 * 60 * 60 * 1000)) :
      null;

    res.json({
      success: true,
      message: 'Profile updated successfully',
      profile: {
        _id: patient._id,
        name: `${patient.full_name} ${patient.last_name}`,
        full_name: patient.full_name,
        last_name: patient.last_name,
        email: patient.email,
        phone: patient.phone,
        age,
        dob: patient.dob,
        gender: patient.gender,
        address: patient.address,
        emergency_contact: patient.emergency_contact,
        blood_group: patient.blood_group,
        medical_history: patient.medical_history,
        current_medications: patient.current_medications,
        height: patient.height,
        weight: patient.weight,
        bpm: patient.bpm
      }
    });
  } catch (error) {
    console.error('Error updating patient profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating patient profile',
      error: error.message
    });
  }
});

// Change password endpoint
router.put('/changePassword', async (req, res) => {
  try {
    // Get token from Authorization header
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Verify token and get patient ID
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token has expired. Please login again.',
          tokenExpired: true
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    const patientId = decoded.id;
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    // Find patient with password field
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, patient.password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    patient.password = hashedPassword;
    await patient.save();

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
