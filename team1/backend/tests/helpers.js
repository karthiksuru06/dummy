const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Admin = require('../models/Admin');
const Appointment = require('../models/Appointment');

let n = 0;
const uniqEmail = (p) => `${p}${++n}-${process.pid}@test.local`;

const sign = (id, role) => jwt.sign({ id: String(id), role }, process.env.JWT_SECRET);

async function makePatient(over = {}) {
  const p = await Patient.create({
    full_name: 'Pat', last_name: 'One', email: uniqEmail('patient'),
    phone: '5550000000', password: await bcrypt.hash('pw', 10),
    dob: new Date('1990-01-01'), gender: 'male', address: '1 St',
    emergency_contact: '5551112222', blood_group: 'O+', ...over,
  });
  return { doc: p, token: sign(p._id, 'patient') };
}

async function makeDoctor(over = {}) {
  const d = await Doctor.create({
    full_name: 'Doc', last_name: 'Tor', email: uniqEmail('doctor'),
    phone: '5559990000', password: await bcrypt.hash('pw', 10),
    dob: new Date('1980-01-01'), gender: 'female', address: '2 Ave',
    status: 'approved', ...over,
  });
  return { doc: d, token: sign(d._id, 'doctor') };
}

async function makeAdmin(over = {}) {
  const a = await Admin.create({
    email: uniqEmail('admin'), password: await bcrypt.hash('pw', 10),
    full_name: 'Ad Min', ...over,
  });
  return { doc: a, token: sign(a._id, 'admin') };
}

async function makeAppointment(patientId, doctorId, over = {}) {
  return Appointment.create({
    patient_id: patientId, doctor_id: doctorId, patient_name: 'Pat One',
    service_type: 'Video Consultation', appointment_date: new Date(Date.now() + 86400000),
    appointment_time: '10:00 AM', status: 'pending', ...over,
  });
}

const bearer = (t) => ({ Authorization: `Bearer ${t}` });

module.exports = { makePatient, makeDoctor, makeAdmin, makeAppointment, sign, bearer };
