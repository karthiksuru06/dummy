const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  full_name: { type: String, required: true },
  role: { type: String, default: 'admin' },
  otp: { type: String, default: null },
  otp_hash: { type: String, default: null },
  otp_created_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Admin', adminSchema);
