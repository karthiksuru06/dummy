const mongoose = require('mongoose');

const doctorSettingsSchema = new mongoose.Schema({
  doctor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true,
    unique: true
  },
  // Security Settings
  two_factor_enabled: {
    type: Boolean,
    default: false
  },
  session_timeout: {
    type: Number, // in minutes
    default: 30
  },
  // Notification Preferences
  email_notifications: {
    type: Boolean,
    default: true
  },
  sms_notifications: {
    type: Boolean,
    default: false
  },
  appointment_reminders: {
    type: Boolean,
    default: true
  },
  patient_report_notifications: {
    type: Boolean,
    default: true
  },
  task_notifications: {
    type: Boolean,
    default: true
  },
  // Display Preferences
  theme: {
    type: String,
    enum: ['light', 'dark', 'auto'],
    default: 'light'
  },
  language: {
    type: String,
    default: 'en'
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Update the updated_at timestamp before saving
doctorSettingsSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model('DoctorSettings', doctorSettingsSchema);
