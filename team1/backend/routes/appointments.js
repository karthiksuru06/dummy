const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const Notification = require('../models/Notification');
const Task = require('../models/Task');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const { requireRole } = require('../middleware/auth');
const { validateObjectIdParam } = require('../middleware/validate');

// ---- Ownership guards (router is already authenticated in server.js) ----
// Loads the appointment so guards/handlers can check the real owner, not a
// client-supplied id. 404 if it doesn't exist.
async function loadAppointment(req, res, next) {
  try {
    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ message: 'Appointment not found' });
    req.appointment = appt;
    next();
  } catch (err) { next(err); }
}
// Only the appointment's doctor (or an admin) may act.
function apptDoctorOrAdmin(req, res, next) {
  if (req.user.role === 'admin') return next();
  if (req.user.role === 'doctor' && String(req.appointment.doctor_id) === req.user.id) return next();
  return res.status(403).json({ message: 'Forbidden: not your appointment' });
}
// Either party (patient or doctor) on the appointment, or an admin.
function apptParticipantOrAdmin(req, res, next) {
  if (req.user.role === 'admin') return next();
  if (String(req.appointment.patient_id) === req.user.id || String(req.appointment.doctor_id) === req.user.id) return next();
  return res.status(403).json({ message: 'Forbidden: not your appointment' });
}
// A doctor may only read their own lists (admins any).
function doctorParamSelfOrAdmin(req, res, next) {
  if (req.user.role === 'admin') return next();
  if (req.user.role === 'doctor' && req.user.id === String(req.params.doctorId)) return next();
  return res.status(403).json({ message: 'Forbidden' });
}

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
const autoCompleteOldAppointments = async (doctorId) => {
  try {
    const now = new Date();
    const sixHoursAgo = new Date(now.getTime() - (6 * 60 * 60 * 1000));

    // Find all scheduled appointments for this doctor
    const scheduledAppointments = await Appointment.find({
      doctor_id: doctorId,
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

// Create a new appointment
router.post('/', async (req, res) => {
  try {
    let {
      patient_id,
      doctor_id,
      patient_name,
      service_type,
      appointment_date,
      appointment_time,
      reason
    } = req.body;

    // Identity binding: never trust client-supplied ids for the caller's own
    // side. A patient can only book as themselves; a doctor only as themselves.
    if (req.user.role === 'patient') {
      patient_id = req.user.id;
      const acct = await Patient.findById(req.user.id).select('full_name last_name');
      if (acct) patient_name = `${acct.full_name || ''} ${acct.last_name || ''}`.trim();
    } else if (req.user.role === 'doctor') {
      doctor_id = req.user.id;
    }
    // admin may pass explicit ids.

    // Check for conflicting appointments
    const existingAppointment = await Appointment.findOne({
      doctor_id,
      appointment_date,
      appointment_time,
      status: { $in: ['pending', 'scheduled', 'rescheduled'] }
    });
    if (existingAppointment) {
      return res.status(409).json({
        success: false,
        message: 'This time slot is already booked. Please choose a different time.'
      });
    }

    const appointment = new Appointment({
      patient_id,
      doctor_id,
      patient_name,
      service_type,
      appointment_date,
      appointment_time,
      reason,
      status: 'pending'
    });

    await appointment.save();

    // Create notification for doctor (RECEIVER: Doctor, SENDER: Patient)
    const doctorNotification = new Notification({
      receiver_id: doctor_id,
      receiver_type: 'Doctor',
      sender_id: patient_id,
      sender_type: 'Patient',
      sender_name: patient_name,
      appointment_id: appointment._id,
      title: 'New Appointment Request',
      message: `New appointment request from ${patient_name}`,
      type: 'appointment',
      action_link: '/doctor/appointments',
      status: 'pending',
      // Legacy fields for backward compatibility
      doctor_id,
      patient_id,
      patient_name
    });
    await doctorNotification.save();

    // Create confirmation notification for patient (RECEIVER: Patient, SENDER: System)
    const patientConfirmation = new Notification({
      receiver_id: patient_id,
      receiver_type: 'Patient',
      sender_type: 'System',
      sender_name: 'MEDviz System',
      appointment_id: appointment._id,
      title: 'Appointment Request Sent',
      message: `Your appointment request has been sent to the doctor. You will be notified once the doctor reviews your request.`,
      type: 'appointment',
      action_link: '/patient/appointments',
      status: 'pending',
      // Legacy fields
      doctor_id,
      patient_id,
      patient_name
    });
    await patientConfirmation.save();

    // Create task for doctor to approve appointment
    const task = new Task({
      doctor_id,
      patient_id,
      patient_name,
      assigned_to: 'doctor',
      task_type: 'appointment_approval',
      title: 'Appointment Approval',
      description: `Review and approve appointment request from ${patient_name}`,
      priority: 'high',
      related_appointment_id: appointment._id
    });
    await task.save();

    res.status(201).json({
      success: true,
      message: 'Appointment created successfully',
      appointment
    });
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating appointment',
      error: error.message
    });
  }
});

// Book appointment endpoint (for patient appointment booking)
router.post('/book', async (req, res) => {
  try {
    let {
      patientId,
      doctorId,
      doctorName,
      patientName,
      date,
      time,
      consultationType,
      reason,
      symptoms,
      notes,
      status
    } = req.body;

    // Identity binding (see POST '/'): a patient books only as themselves.
    if (req.user.role === 'patient') {
      patientId = req.user.id;
      const acct = await Patient.findById(req.user.id).select('full_name last_name');
      if (acct) patientName = `${acct.full_name || ''} ${acct.last_name || ''}`.trim();
    }
    // doctors/admins booking on behalf of a patient keep the supplied patientId.

    // Check for conflicting appointments
    const existingAppointment = await Appointment.findOne({
      doctor_id: doctorId,
      appointment_date: date,
      appointment_time: time,
      status: { $in: ['pending', 'scheduled', 'rescheduled'] }
    });
    if (existingAppointment) {
      return res.status(409).json({
        success: false,
        message: 'This time slot is already booked. Please choose a different time.'
      });
    }

    // Create appointment with the provided data
    const appointment = new Appointment({
      patient_id: patientId,
      doctor_id: doctorId,
      patient_name: patientName || 'Patient',
      service_type: consultationType || 'In-Person Consultation',
      appointment_date: date,
      appointment_time: time,
      reason: reason || symptoms || 'General Consultation',
      status: status || 'pending',
      meeting_notes: notes || ''
    });

    await appointment.save();

    // Get doctor details for clinic information
    const doctor = await Doctor.findById(doctorId);
    const clinicInfo = doctor && (consultationType === 'In-Person Consultation' || consultationType === 'Offline')
      ? ` at ${doctor.clinic_name || 'clinic'} (${doctor.clinic_address || 'clinic address'})`
      : '';

    // Create notification for doctor (RECEIVER: Doctor, SENDER: Patient)
    const doctorNotification = new Notification({
      receiver_id: doctorId,
      receiver_type: 'Doctor',
      sender_id: patientId,
      sender_type: 'Patient',
      sender_name: patientName || 'Patient',
      appointment_id: appointment._id,
      title: 'New Appointment Request',
      message: `New appointment request from ${patientName || 'a patient'} for ${consultationType || 'consultation'} on ${new Date(date).toLocaleDateString()} at ${time}${clinicInfo}`,
      type: 'appointment',
      action_link: '/doctor/appointments',
      status: 'pending',
      // Legacy fields
      doctor_id: doctorId,
      patient_id: patientId,
      patient_name: patientName || 'Patient'
    });
    await doctorNotification.save();

    // Create confirmation notification for patient (RECEIVER: Patient, SENDER: System)
    const isOfflineConsultation = consultationType === 'In-Person Consultation' || consultationType === 'Offline';
    const patientMessage = isOfflineConsultation
      ? `Your in-person appointment request has been sent to the doctor. Please visit ${doctor?.clinic_name || 'the clinic'} at ${doctor?.clinic_address || 'the clinic address'} on ${new Date(date).toLocaleDateString()} at ${time}. You will be notified once the doctor confirms.`
      : `Your appointment request has been sent to the doctor. You will be notified once the doctor reviews your request.`;

    const patientConfirmation = new Notification({
      receiver_id: patientId,
      receiver_type: 'Patient',
      sender_type: 'System',
      sender_name: 'MEDviz System',
      appointment_id: appointment._id,
      title: isOfflineConsultation ? 'In-Person Appointment Request Sent' : 'Appointment Request Sent',
      message: patientMessage,
      type: 'appointment',
      action_link: '/patient/appointments',
      status: 'pending',
      // Legacy fields
      doctor_id: doctorId,
      patient_id: patientId,
      patient_name: patientName || 'Patient'
    });
    await patientConfirmation.save();

    // Create task for doctor to approve appointment
    const task = new Task({
      doctor_id: doctorId,
      patient_id: patientId,
      patient_name: patientName || 'Patient',
      assigned_to: 'doctor',
      task_type: 'appointment_approval',
      title: 'Appointment Approval',
      description: `Review and approve appointment request from ${patientName || 'a patient'}`,
      priority: 'high',
      related_appointment_id: appointment._id
    });
    await task.save();

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      appointmentId: appointment._id,
      data: appointment
    });
  } catch (error) {
    console.error('Error booking appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Error booking appointment',
      error: error.message
    });
  }
});

// Get upcoming appointments for a doctor
router.get('/upcoming/:doctorId', doctorParamSelfOrAdmin, async (req, res) => {
  try {
    const { doctorId } = req.params;
    const currentDate = new Date();

    // Auto-complete appointments that are 6+ hours past scheduled time
    await autoCompleteOldAppointments(doctorId);

    const appointments = await Appointment.find({
      doctor_id: doctorId,
      appointment_date: { $gte: currentDate },
      status: 'scheduled'
    })
    .populate('patient_id', 'full_name last_name email phone')
    .sort({ appointment_date: 1, appointment_time: 1 })
    .limit(10);

    res.json({
      success: true,
      appointments
    });
  } catch (error) {
    console.error('Error fetching upcoming appointments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching upcoming appointments',
      error: error.message
    });
  }
});

// Get all appointments for a doctor
router.get('/doctor/:doctorId', doctorParamSelfOrAdmin, async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { status } = req.query; // Optional filter by status

    // Auto-complete appointments that are 6+ hours past scheduled time
    await autoCompleteOldAppointments(doctorId);

    const query = { doctor_id: doctorId };
    if (status) {
      query.status = status;
    }

    const appointments = await Appointment.find(query)
      .populate('patient_id', 'full_name last_name email phone')
      .sort({ appointment_date: -1, appointment_time: -1 });

    res.json({
      success: true,
      appointments
    });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching appointments',
      error: error.message
    });
  }
});

// Approve an appointment
router.post('/:id/approve', validateObjectIdParam('id'), loadAppointment, apptDoctorOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { meeting_link, meeting_notes } = req.body;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    appointment.status = 'scheduled';
    appointment.meeting_link = meeting_link;
    appointment.meeting_notes = meeting_notes;
    await appointment.save();

    // Get doctor information for the patient task
    const doctor = await Doctor.findById(appointment.doctor_id);
    const doctorName = doctor ? `Dr. ${doctor.full_name} ${doctor.last_name}` : 'Doctor';

    // Mark the original notification as processed
    await Notification.updateMany(
      { appointment_id: id, type: 'appointment', status: 'pending' },
      { status: 'processed' }
    );

    // Create notification for patient (approval) - RECEIVER: Patient, SENDER: Doctor
    const isOffline = appointment.service_type === 'In-Person Consultation';
    const clinicDetails = isOffline && doctor
      ? ` at ${doctor.clinic_name || 'clinic'} (${doctor.clinic_address || 'clinic address'})`
      : '';
    const appointmentMessage = isOffline
      ? `Your in-person appointment with ${doctorName} has been approved for ${new Date(appointment.appointment_date).toLocaleDateString()} at ${appointment.appointment_time}${clinicDetails}. Please arrive 10 minutes early.`
      : `Your appointment with ${doctorName} has been approved for ${new Date(appointment.appointment_date).toLocaleDateString()} at ${appointment.appointment_time}${meeting_link ? `. Meeting link: ${meeting_link}` : ''}`;

    const patientNotification = new Notification({
      receiver_id: appointment.patient_id,
      receiver_type: 'Patient',
      sender_id: appointment.doctor_id,
      sender_type: 'Doctor',
      sender_name: doctorName,
      appointment_id: appointment._id,
      title: 'Appointment Approved',
      message: appointmentMessage,
      type: 'appointment_accepted',
      action_link: '/patient/appointments',
      status: 'pending',
      // Legacy fields
      doctor_id: appointment.doctor_id,
      patient_id: appointment.patient_id,
      patient_name: appointment.patient_name
    });
    await patientNotification.save();

    // Mark the doctor's approval task as completed
    await Task.findOneAndUpdate(
      { related_appointment_id: id, task_type: 'appointment_approval', assigned_to: 'doctor' },
      { status: 'completed' }
    );

    // Create a new pending task for doctor to track the scheduled appointment
    const doctorScheduledTask = new Task({
      doctor_id: appointment.doctor_id,
      patient_id: appointment.patient_id,
      patient_name: appointment.patient_name,
      assigned_to: 'doctor',
      task_type: 'upcoming_appointment',
      title: 'Scheduled Appointment',
      description: `Scheduled appointment with ${appointment.patient_name} on ${new Date(appointment.appointment_date).toLocaleDateString()} at ${appointment.appointment_time}. Meeting link: ${meeting_link}`,
      priority: 'medium',
      related_appointment_id: appointment._id
    });
    await doctorScheduledTask.save();

    // Create task for patient for the upcoming appointment
    const patientTaskDescription = isOffline
      ? `You have an in-person appointment with ${doctorName} on ${new Date(appointment.appointment_date).toLocaleDateString()} at ${appointment.appointment_time}${clinicDetails}. Please arrive 10 minutes early and bring necessary medical documents.`
      : `You have an appointment with ${doctorName} on ${new Date(appointment.appointment_date).toLocaleDateString()} at ${appointment.appointment_time}. Please prepare necessary documents and join on time. Meeting link: ${meeting_link}`;

    const patientTask = new Task({
      doctor_id: appointment.doctor_id,
      patient_id: appointment.patient_id,
      patient_name: appointment.patient_name,
      doctor_name: doctorName,
      assigned_to: 'patient',
      task_type: 'upcoming_appointment',
      title: 'Upcoming Appointment',
      description: patientTaskDescription,
      priority: 'high',
      related_appointment_id: appointment._id
    });
    await patientTask.save();

    res.json({
      success: true,
      message: 'Appointment approved successfully',
      appointment
    });
  } catch (error) {
    console.error('Error approving appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving appointment',
      error: error.message
    });
  }
});

// Reject an appointment
router.post('/:id/reject', validateObjectIdParam('id'), loadAppointment, apptDoctorOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { rejection_reason } = req.body;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    appointment.status = 'cancelled';
    appointment.cancellation_reason = rejection_reason || 'Rejected by doctor';
    await appointment.save();

    // Mark the original notification as processed
    await Notification.updateMany(
      { appointment_id: id, type: 'appointment', status: 'pending' },
      { status: 'processed' }
    );

    // Get doctor information
    const doctor = await Doctor.findById(appointment.doctor_id);
    const doctorName = doctor ? `Dr. ${doctor.full_name} ${doctor.last_name}` : 'Doctor';

    // Create notification for patient - RECEIVER: Patient, SENDER: Doctor
    const patientNotification = new Notification({
      receiver_id: appointment.patient_id,
      receiver_type: 'Patient',
      sender_id: appointment.doctor_id,
      sender_type: 'Doctor',
      sender_name: doctorName,
      appointment_id: appointment._id,
      title: 'Appointment Declined',
      message: `Your appointment request has been declined by ${doctorName}. Reason: ${appointment.cancellation_reason}`,
      type: 'appointment_rejected',
      action_link: '/patient/appointments',
      status: 'pending',
      // Legacy fields
      doctor_id: appointment.doctor_id,
      patient_id: appointment.patient_id,
      patient_name: appointment.patient_name
    });
    await patientNotification.save();

    // Update related task to completed
    await Task.findOneAndUpdate(
      { related_appointment_id: id, task_type: 'appointment_approval' },
      { status: 'completed' }
    );

    res.json({
      success: true,
      message: 'Appointment rejected successfully',
      appointment
    });
  } catch (error) {
    console.error('Error rejecting appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting appointment',
      error: error.message
    });
  }
});

// Reschedule an appointment
router.put('/:id/reschedule', validateObjectIdParam('id'), loadAppointment, apptParticipantOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { new_date, new_time, reschedule_reason } = req.body;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Save original date and time
    appointment.original_date = appointment.appointment_date;
    appointment.original_time = appointment.appointment_time;

    // Update with new date and time
    appointment.appointment_date = new_date;
    appointment.appointment_time = new_time;
    appointment.status = 'rescheduled';
    appointment.meeting_notes = reschedule_reason || 'Rescheduled by doctor';
    await appointment.save();

    // Get doctor information
    const doctor = await Doctor.findById(appointment.doctor_id);
    const doctorName = doctor ? `Dr. ${doctor.full_name} ${doctor.last_name}` : 'Doctor';

    // Create notification for patient only - RECEIVER: Patient, SENDER: Doctor
    const patientNotification = new Notification({
      receiver_id: appointment.patient_id,
      receiver_type: 'Patient',
      sender_id: appointment.doctor_id,
      sender_type: 'Doctor',
      sender_name: doctorName,
      appointment_id: appointment._id,
      title: 'Appointment Rescheduled',
      message: `Your appointment with ${doctorName} has been rescheduled to ${new Date(new_date).toLocaleDateString()} at ${new_time}. ${reschedule_reason ? `Reason: ${reschedule_reason}` : ''}`,
      type: 'appointment_rescheduled',
      action_link: '/patient/appointments',
      status: 'pending',
      // Legacy fields
      doctor_id: appointment.doctor_id,
      patient_id: appointment.patient_id,
      patient_name: appointment.patient_name
    });
    await patientNotification.save();

    res.json({
      success: true,
      message: 'Appointment rescheduled successfully',
      appointment
    });
  } catch (error) {
    console.error('Error rescheduling appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Error rescheduling appointment',
      error: error.message
    });
  }
});

// Cancel an appointment
router.delete('/:id', validateObjectIdParam('id'), loadAppointment, apptParticipantOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { cancellation_reason } = req.body;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    appointment.status = 'cancelled';
    appointment.cancellation_reason = cancellation_reason || 'Cancelled by doctor';
    await appointment.save();

    // Get doctor information
    const doctor = await Doctor.findById(appointment.doctor_id);
    const doctorName = doctor ? `Dr. ${doctor.full_name} ${doctor.last_name}` : 'Doctor';

    // Create notification for patient only - RECEIVER: Patient, SENDER: Doctor
    const patientNotification = new Notification({
      receiver_id: appointment.patient_id,
      receiver_type: 'Patient',
      sender_id: appointment.doctor_id,
      sender_type: 'Doctor',
      sender_name: doctorName,
      appointment_id: appointment._id,
      title: 'Appointment Cancelled',
      message: `Your appointment with ${doctorName} on ${new Date(appointment.appointment_date).toLocaleDateString()} at ${appointment.appointment_time} has been cancelled. Reason: ${appointment.cancellation_reason}`,
      type: 'appointment_cancelled',
      action_link: '/patient/appointments',
      status: 'pending',
      // Legacy fields
      doctor_id: appointment.doctor_id,
      patient_id: appointment.patient_id,
      patient_name: appointment.patient_name
    });
    await patientNotification.save();

    res.json({
      success: true,
      message: 'Appointment cancelled successfully',
      appointment
    });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling appointment',
      error: error.message
    });
  }
});

// Get appointment by ID
router.get('/:id', validateObjectIdParam('id'), loadAppointment, apptParticipantOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await Appointment.findById(id)
      .populate('patient_id', 'full_name last_name email phone')
      .populate('doctor_id', 'full_name last_name specialization');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    res.json({
      success: true,
      appointment
    });
  } catch (error) {
    console.error('Error fetching appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching appointment',
      error: error.message
    });
  }
});

module.exports = router;
