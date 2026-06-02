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

// Update the updated_at timestamp before saving
appointmentSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model('Appointment', appointmentSchema);
