const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  patient_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  doctor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  patient_name: {
    type: String,
    required: true
  },
  service_type: {
    type: String,
    required: true,
    enum: ['Video Consultation', 'In-Person Consultation', 'Follow-up', 'Emergency']
  },
  appointment_date: {
    type: Date,
    required: true
  },
  appointment_time: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'scheduled', 'rescheduled', 'cancelled', 'completed'],
    default: 'pending'
  },
  reason: {
    type: String,
    default: ''
  },
  meeting_link: {
    type: String,
    default: ''
  },
  meeting_notes: {
    type: String,
    default: ''
  },
  clinic_name: {
    type: String,
    default: ''
  },
  clinic_address: {
    type: String,
    default: ''
  },
  latitude: {
    type: Number
  },
  longitude: {
    type: Number
  },
  cancellation_reason: {
    type: String,
    default: ''
  },
  original_date: {
    type: Date
  },
  original_time: {
    type: String
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// ---- Indexes (every route queries by these; without them Mongo full-scans) ----
appointmentSchema.index({ doctor_id: 1, status: 1, appointment_date: 1 });
appointmentSchema.index({ patient_id: 1, status: 1, appointment_date: 1 });
appointmentSchema.index({ status: 1, appointment_date: 1 }); // cron jobs

// Prevent double-booking at the DB layer (closes the read-then-write race).
// A given doctor cannot hold two active appointments in the same slot.
appointmentSchema.index(
  { doctor_id: 1, appointment_date: 1, appointment_time: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['pending', 'scheduled', 'rescheduled'] } } }
);

// Update the updated_at timestamp before saving
appointmentSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model('Appointment', appointmentSchema);