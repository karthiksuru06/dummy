const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  medicine_name: {
    type: String,
    required: true
  },
  dosage: {
    type: String,
    required: true
  },
  duration: {
    type: String,
    required: true
  },
  notes: {
    type: String,
    default: ''
  }
}, { _id: false });

const prescriptionSchema = new mongoose.Schema({
  appointment_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true
  },
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
  patient_age: {
    type: Number,
    required: true
  },
  patient_gender: {
    type: String,
    required: true
  },
  diagnosis: {
    type: String,
    required: true
  },
  medicines: [medicineSchema],
  tests_recommended: {
    type: String,
    default: ''
  },
  additional_advice: {
    type: String,
    default: ''
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Prescription', prescriptionSchema);
