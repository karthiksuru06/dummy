const mongoose = require('mongoose');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const Prescription = require('../models/Prescription');
require('dotenv').config();

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is not set. Refusing to run.');
  process.exit(1);
}
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('MongoDB connected'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

async function checkData() {
  try {
    console.log('=== DATABASE SUMMARY ===\n');

    // Doctors
    const doctors = await Doctor.find().select('full_name last_name email status specialization');
    console.log(`DOCTORS: ${doctors.length} total`);
    doctors.forEach((doc, index) => {
      console.log(`  ${index + 1}. Dr. ${doc.full_name} ${doc.last_name}`);
      console.log(`     Email: ${doc.email}`);
      console.log(`     Specialization: ${doc.specialization || 'Not specified'}`);
      console.log(`     Status: ${doc.status}`);
      console.log('');
    });

    // Patients
    const patients = await Patient.find().select('full_name last_name email phone');
    console.log(`\nPATIENTS: ${patients.length} total`);
    patients.forEach((patient, index) => {
      console.log(`  ${index + 1}. ${patient.full_name} ${patient.last_name}`);
      console.log(`     Email: ${patient.email}`);
      console.log(`     Phone: ${patient.phone}`);
      console.log('');
    });

    // Prescriptions
    const prescriptions = await Prescription.find();
    console.log(`\nPRESCRIPTIONS: ${prescriptions.length} total\n`);

    console.log('=== END SUMMARY ===');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkData();
