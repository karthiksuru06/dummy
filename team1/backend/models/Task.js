const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  doctor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  },
  patient_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient'
  },
  patient_name: {
    type: String,
    default: ''
  },
  doctor_name: {
    type: String,
    default: ''
  },
  assigned_to: {
    type: String,
    required: true,
    enum: ['doctor', 'patient']
  },
  task_type: {
    type: String,
    required: true,
    enum: [
      'appointment_approval',
      'report_review',
      'prescription_renewal',
      'patient_request',
      'follow_up',
      'test_authorization',
      'emergency_consultation',
      'upcoming_appointment',
      'prepare_documents'
    ]
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  priority: {
    type: String,
    required: true,
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'in_progress', 'completed'],
    default: 'pending'
  },
  related_appointment_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
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
taskSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

taskSchema.index({ doctor_id: 1, status: 1 });
taskSchema.index({ patient_id: 1 });
taskSchema.index({ related_appointment_id: 1 });

module.exports = mongoose.model('Task', taskSchema);
