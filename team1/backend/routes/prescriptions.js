const express = require('express');
const router = express.Router();
const Prescription = require('../models/Prescription');
const Appointment = require('../models/Appointment');
const Notification = require('../models/Notification');
const Patient = require('../models/Patient');
const Task = require('../models/Task');
const { requireRole } = require('../middleware/auth');
const { validateObjectIdParam } = require('../middleware/validate');

// ---- Ownership guards (router is authenticated in server.js) ----
async function loadPrescription(req, res, next) {
  try {
    const rx = await Prescription.findById(req.params.id);
    if (!rx) return res.status(404).json({ message: 'Prescription not found' });
    req.prescription = rx;
    next();
  } catch (err) { next(err); }
}
// The prescription's patient, its prescribing doctor, or an admin.
function rxParticipantOrAdmin(req, res, next) {
  if (req.user.role === 'admin') return next();
  const uid = req.user.id;
  if (String(req.prescription.patient_id) === uid || String(req.prescription.doctor_id) === uid) return next();
  return res.status(403).json({ message: 'Forbidden: not your prescription' });
}
// A patient may only read their own prescriptions by patientId (doctors/admins any).
function patientParamSelfOrStaff(req, res, next) {
  if (req.user.role === 'doctor' || req.user.role === 'admin') return next();
  if (req.user.id === String(req.params.patientId)) return next();
  return res.status(403).json({ message: 'Forbidden' });
}
// Participant on the underlying appointment, or staff.
async function apptParamParticipantOrAdmin(req, res, next) {
  try {
    if (req.user.role === 'admin') return next();
    const appt = await Appointment.findById(req.params.appointmentId);
    if (!appt) return res.status(404).json({ message: 'Appointment not found' });
    if (String(appt.patient_id) === req.user.id || String(appt.doctor_id) === req.user.id) return next();
    return res.status(403).json({ message: 'Forbidden' });
  } catch (err) { next(err); }
}

// Create a new prescription
router.post('/', requireRole('doctor', 'admin'), async (req, res) => {
  try {
    const {
      appointment_id,
      patient_id,
      doctor_id,
      patient_name,
      patient_age,
      patient_gender,
      diagnosis,
      medicines,
      tests_recommended,
      additional_advice
    } = req.body;

    // If patient_id is not provided, try to get it from the appointment
    let finalPatientId = patient_id;
    if (!finalPatientId && appointment_id) {
      const appointment = await Appointment.findById(appointment_id);
      if (appointment) {
        finalPatientId = appointment.patient_id;
      }
    }

    // Validate required fields
    if (!finalPatientId) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID is required'
      });
    }

    if (!doctor_id) {
      return res.status(400).json({
        success: false,
        message: 'Doctor ID is required'
      });
    }

    const prescription = new Prescription({
      appointment_id,
      patient_id: finalPatientId,
      doctor_id,
      patient_name,
      patient_age,
      patient_gender,
      diagnosis,
      medicines,
      tests_recommended: tests_recommended || '',
      additional_advice: additional_advice || ''
    });

    await prescription.save();

    // Update appointment status to completed
    if (appointment_id) {
      await Appointment.findByIdAndUpdate(appointment_id, {
        status: 'completed'
      });

      // Mark related tasks as completed
      await Task.updateMany(
        {
          related_appointment_id: appointment_id,
          task_type: 'upcoming_appointment',
          status: 'pending'
        },
        { status: 'completed' }
      );
    }

    // Create notification for patient only
    const notification = new Notification({
      doctor_id,
      patient_id: finalPatientId,
      patient_name,
      prescription_id: prescription._id,
      appointment_id,
      message: `Your prescription is ready. Diagnosis: ${diagnosis}`,
      type: 'prescription',
      status: 'pending'
    });
    await notification.save();

    // Create alert notification for patient
    const alertNotification = new Notification({
      doctor_id,
      patient_id: finalPatientId,
      patient_name,
      prescription_id: prescription._id,
      appointment_id,
      message: `💊 New Prescription Available! Your doctor has added a prescription. Diagnosis: ${diagnosis}`,
      type: 'alert',
      status: 'pending'
    });
    await alertNotification.save();

    res.status(201).json({
      success: true,
      message: 'Prescription created successfully',
      prescription
    });
  } catch (error) {
    console.error('Error creating prescription:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating prescription',
      error: error.message
    });
  }
});

// Get prescription by ID
router.get('/:id', validateObjectIdParam('id'), loadPrescription, rxParticipantOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const prescription = await Prescription.findById(id)
      .populate('patient_id', 'full_name last_name email phone')
      .populate('doctor_id', 'full_name last_name specialization clinic_name clinic_address');

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found'
      });
    }

    res.json({
      success: true,
      prescription
    });
  } catch (error) {
    console.error('Error fetching prescription:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching prescription',
      error: error.message
    });
  }
});

// Get prescriptions for a patient
router.get('/patient/:patientId', validateObjectIdParam('patientId'), patientParamSelfOrStaff, async (req, res) => {
  try {
    const { patientId } = req.params;

    const prescriptions = await Prescription.find({ patient_id: patientId })
      .populate('doctor_id', 'full_name last_name specialization')
      .sort({ created_at: -1 });

    res.json({
      success: true,
      prescriptions
    });
  } catch (error) {
    console.error('Error fetching prescriptions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching prescriptions',
      error: error.message
    });
  }
});

// Get prescriptions for an appointment
router.get('/appointment/:appointmentId', validateObjectIdParam('appointmentId'), apptParamParticipantOrAdmin, async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const prescription = await Prescription.findOne({ appointment_id: appointmentId })
      .populate('patient_id', 'full_name last_name email phone')
      .populate('doctor_id', 'full_name last_name specialization clinic_name clinic_address');

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'No prescription found for this appointment'
      });
    }

    res.json({
      success: true,
      prescription
    });
  } catch (error) {
    console.error('Error fetching prescription:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching prescription',
      error: error.message
    });
  }
});

// Download prescription as PDF (placeholder - returns JSON for now)
router.get('/:id/download', validateObjectIdParam('id'), loadPrescription, rxParticipantOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const prescription = await Prescription.findById(id)
      .populate('patient_id', 'full_name last_name email phone blood_group')
      .populate('doctor_id', 'full_name last_name specialization clinic_name clinic_address phone');

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found'
      });
    }

    // In a real application, you would generate a PDF here
    // For now, return formatted data that can be used to generate PDF on frontend
    res.json({
      success: true,
      message: 'Prescription data for PDF generation',
      data: {
        prescriptionId: prescription._id,
        date: prescription.created_at,
        doctor: {
          name: prescription.doctor_id ? `Dr. ${prescription.doctor_id.full_name} ${prescription.doctor_id.last_name}` : 'Unknown Doctor',
          specialization: prescription.doctor_id?.specialization || 'N/A',
          clinic: prescription.doctor_id?.clinic_name || 'N/A',
          address: prescription.doctor_id?.clinic_address || 'N/A',
          phone: prescription.doctor_id?.phone || 'N/A'
        },
        patient: {
          name: prescription.patient_name,
          age: prescription.patient_age,
          gender: prescription.patient_gender,
          bloodGroup: prescription.patient_id?.blood_group || 'N/A',
          phone: prescription.patient_id?.phone || 'N/A'
        },
        diagnosis: prescription.diagnosis,
        medicines: prescription.medicines,
        testsRecommended: prescription.tests_recommended,
        additionalAdvice: prescription.additional_advice
      }
    });
  } catch (error) {
    console.error('Error downloading prescription:', error);
    res.status(500).json({
      success: false,
      message: 'Error downloading prescription',
      error: error.message
    });
  }
});

module.exports = router;
