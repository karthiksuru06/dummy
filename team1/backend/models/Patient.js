const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  full_name: { type: String, required: true },
  last_name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  dob: { type: Date, required: true },
  gender: { type: String, required: true },
  address: { type: String, required: true },
  emergency_contact: { type: String, required: true },
  blood_group: { type: String, required: true },
  medical_history: { type: String },
  current_medications: { type: String },
  medical_reports: { type: String }, // File path
  height: { type: String },
  weight: { type: String },
  bpm: { type: String },
  agreed_terms: { type: Boolean, default: false },
  // Explicit informed-consent capture at registration (PHI compliance).
  consent_version: { type: String, default: null },
  consented_at: { type: Date, default: null },
  otp: { type: String, default: null },
  otp_hash: { type: String, default: null },
  otp_created_at: { type: Date, default: null },
  otp_attempts: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Patient', patientSchema);
