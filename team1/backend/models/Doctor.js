const mongoose = require('mongoose');

const availabilitySlotSchema = new mongoose.Schema({
  day: {
    type: String,
    required: true,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  },
  time_slot: {
    type: String,
    required: true
  },
  is_available: {
    type: Boolean,
    default: true
  }
}, { _id: false });

const doctorSchema = new mongoose.Schema({
  full_name: { type: String, required: true },
  last_name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  dob: { type: Date, required: true },
  gender: { type: String, required: true },
  address: { type: String, required: true },
  specialization: { type: String },
  experience: { type: String },
  available_day: { type: String },
  start_time: { type: String },
  end_time: { type: String },
  clinic_name: { type: String },
  clinic_address: { type: String },
  cert_docs: { type: String }, // File path
  profile_picture: { type: String, default: '' }, // File path
  availability_schedule: [availabilitySlotSchema],
  total_consultations: { type: Number, default: 0 },
  agreed_terms: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'deactivated'],
    default: 'pending'
  },
  otp: { type: String, default: null },
  otp_hash: { type: String, default: null },
  otp_created_at: { type: Date, default: null },
  registration_date: { type: Date, default: Date.now },
  created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Doctor', doctorSchema);
