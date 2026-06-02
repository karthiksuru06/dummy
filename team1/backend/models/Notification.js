const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Receiver information (who should receive this notification)
  receiver_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'receiver_type'
  },
  receiver_type: {
    type: String,
    required: true,
    enum: ['Doctor', 'Patient']
  },

  // Sender information (who triggered this notification)
  sender_id: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'sender_type'
  },
  sender_type: {
    type: String,
    enum: ['Doctor', 'Patient', 'System']
  },
  sender_name: {
    type: String,
    default: ''
  },

  // Legacy fields (kept for backward compatibility)
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

  // Related entities
  appointment_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  prescription_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prescription'
  },

  // Notification content
  message: {
    type: String,
    required: true
  },
  title: {
    type: String,
    default: 'Notification'
  },
  type: {
    type: String,
    required: true,
    enum: ['appointment', 'appointment_accepted', 'appointment_rejected', 'appointment_rescheduled',
           'appointment_cancelled', 'report', 'alert', 'reminder', 'message', 'general',
           'prescription', 'system']
  },

  // Status fields
  status: {
    type: String,
    enum: ['pending', 'processed'],
    default: 'pending'
  },
  is_read: {
    type: Boolean,
    default: false
  },

  // Action link (optional - where to redirect when clicked)
  action_link: {
    type: String,
    default: ''
  },

  created_at: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
notificationSchema.index({ receiver_id: 1, receiver_type: 1, created_at: -1 });
notificationSchema.index({ is_read: 1, receiver_id: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
