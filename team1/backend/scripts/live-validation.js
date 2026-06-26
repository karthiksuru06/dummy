const axios = require('axios');
const mongoose = require('mongoose');

const BASE_URL = 'https://medviz-backend.onrender.com/api';

// Helper to delay execution
const delay = ms => new Promise(res => setTimeout(res, ms));

async function getOtpFromEmail(login, domain) {
  let attempts = 0;
  while (attempts < 10) {
    await delay(3000); // Wait 3 seconds between polls
    try {
      const messagesRes = await axios.get(`https://www.1secmail.com/api/v1/?action=getMessages&login=${login}&domain=${domain}`);
      const messages = messagesRes.data;
      if (messages.length > 0) {
        const messageId = messages[0].id;
        const bodyRes = await axios.get(`https://www.1secmail.com/api/v1/?action=readMessage&login=${login}&domain=${domain}&id=${messageId}`);
        const body = bodyRes.data.htmlBody || bodyRes.data.textBody;
        // The OTP is in a <h1> tag or 6 digits
        const match = body.match(/>(\d{6})</) || body.match(/\b\d{6}\b/);
        if (match) return match[1] || match[0];
      }
    } catch (e) {
      console.log('Error polling email:', e.message);
    }
    attempts++;
  }
  return null;
}

async function runValidation() {
  const timestamp = Date.now();
  const patientLogin = `ptest_${timestamp}`;
  const doctorLogin = `dtest_${timestamp}`;
  const domain = `1secmail.com`;
  const patientEmail = `${patientLogin}@${domain}`;
  const doctorEmail = `${doctorLogin}@${domain}`;
  const password = 'Password123!';

  console.log(`=======================================`);
  console.log(`    MEDVIZ LIVE VALIDATION SCRIPT      `);
  console.log(`=======================================\n`);

  let patientToken = '';
  let doctorToken = '';
  let doctorId = '';
  let patientId = '';
  let appointmentId = '';

  // PHASE 2 - PATIENT FLOW
  console.log(`[PHASE 2 - PATIENT FLOW]`);
  const patientPayload = {
    full_name: 'Test', last_name: 'Patient',
    email: patientEmail, phone: '1234567890', password, 
    dob: '1990-01-01', gender: 'Male', address: '123 Test St',
    emergency_contact: '0987654321', blood_group: 'O+',
    medical_history: 'None', current_medications: 'None',
    height: 180, weight: 75, bpm: 72, agreed_terms: true
  };
  
  try {
    const regRes = await axios.post(`${BASE_URL}/auth/patients/register`, patientPayload);
    console.log(`✓ VERIFIED: Patient Registration | Status: ${regRes.status}`);
    
    console.log(`Waiting for OTP email...`);
    const otp = await getOtpFromEmail(patientLogin, domain);
    if (!otp) throw new Error('OTP not received in email');
    console.log(`✓ VERIFIED: OTP Delivered | OTP: ${otp}`);

    const verifyRes = await axios.post(`${BASE_URL}/auth/verify-otp`, { email: patientEmail, otp: otp });
    console.log(`✓ VERIFIED: OTP Verification | Status: ${verifyRes.status}`);

    const loginRes = await axios.post(`${BASE_URL}/auth/patients/login`, { email: patientEmail, password });
    patientToken = loginRes.data.token;
    patientId = loginRes.data.user._id;
    console.log(`✓ VERIFIED: Patient Login | Status: ${loginRes.status} | Token Length: ${patientToken.length}`);
  } catch(e) {
    console.log(`✗ FAILED: Patient Flow | Error: ${e.response?.data?.message || e.message}`);
  }

  // PHASE 3 - DOCTOR FLOW
  console.log(`\n[PHASE 3 - DOCTOR FLOW]`);
  const doctorPayload = {
    full_name: 'Test', last_name: 'Doctor',
    email: doctorEmail, phone: '0987654321', password,
    dob: '1980-01-01', gender: 'Female', address: '456 Med Ave',
    specialization: 'Cardiology', experience: '10',
    available_day: 'Monday', start_time: '09:00', end_time: '17:00',
    clinic_name: 'Heart Clinic', clinic_address: '456 Med Ave',
    agreed_terms: true, availability_schedule: JSON.stringify([{ day: 'Monday', slots: ['09:00', '10:00'] }])
  };
  try {
    const docRegRes = await axios.post(`${BASE_URL}/auth/doctors/register`, doctorPayload);
    console.log(`✓ VERIFIED: Doctor Registration | Status: ${docRegRes.status}`);

    console.log(`Waiting for Doctor OTP email...`);
    const docOtp = await getOtpFromEmail(doctorLogin, domain);
    if (!docOtp) throw new Error('Doctor OTP not received in email');
    console.log(`✓ VERIFIED: Doctor OTP Delivered | OTP: ${docOtp}`);

    const docVerifyRes = await axios.post(`${BASE_URL}/auth/verify-otp`, { email: doctorEmail, otp: docOtp });
    console.log(`✓ VERIFIED: Doctor OTP Verification | Status: ${docVerifyRes.status}`);

    const docLoginRes = await axios.post(`${BASE_URL}/auth/doctors/login`, { email: doctorEmail, password });
    doctorToken = docLoginRes.data.token;
    doctorId = docLoginRes.data.user._id;
    console.log(`✓ VERIFIED: Doctor Login | Status: ${docLoginRes.status} | Token Length: ${doctorToken.length}`);
  } catch(e) {
    console.log(`✗ FAILED: Doctor Flow | Error: ${e.response?.data?.message || e.message}`);
  }

  // PHASE 4 - APPOINTMENT FLOW
  console.log(`\n[PHASE 4 - APPOINTMENT FLOW]`);
  try {
    const bookRes = await axios.post(`${BASE_URL}/appointments`, {
      doctorId: doctorId, date: '2026-12-01', time: '09:00',
      reason: 'Heart checkup', type: 'online'
    }, { headers: { Authorization: `Bearer ${patientToken}` } });
    appointmentId = bookRes.data.appointment?._id || bookRes.data._id;
    console.log(`✓ VERIFIED: Appointment Booked | Status: ${bookRes.status} | ID: ${appointmentId}`);

    const approveRes = await axios.post(`${BASE_URL}/appointments/${appointmentId}/approve`, {}, { headers: { Authorization: `Bearer ${doctorToken}` } });
    console.log(`✓ VERIFIED: Appointment Approved | Status: ${approveRes.status}`);
  } catch(e) {
    console.log(`✗ FAILED: Appointment Flow | Error: ${e.response?.data?.message || e.message}`);
  }

  // PHASE 5 - REPORTS FLOW
  console.log(`\n[PHASE 5 - REPORTS FLOW]`);
  try {
    const FormData = require('form-data');
    const fs = require('fs');
    fs.writeFileSync('test.txt', 'fake content');
    const form = new FormData();
    form.append('medical_reports', fs.createReadStream('test.txt'));

    const uploadRes = await axios.post(`${BASE_URL}/patient/reports/upload`, form, {
      headers: { ...form.getHeaders(), Authorization: `Bearer ${patientToken}` }
    });
    console.log(`✓ VERIFIED: Report Upload | Status: ${uploadRes.status}`);
  } catch(e) {
    console.log(`✗ FAILED: Reports Flow | Error: ${e.response?.data?.message || e.response?.status || e.message}`);
  }

  // PHASE 6 - CHATBOT FLOW
  console.log(`\n[PHASE 6 - CHATBOT FLOW]`);
  try {
    const chatRes = await axios.post(`${BASE_URL}/chat`, {
      message: "I need a cardiologist tomorrow"
    }, { headers: { Authorization: `Bearer ${patientToken}` } });
    console.log(`✓ VERIFIED: Chatbot Response | Status: ${chatRes.status} | Output: ${JSON.stringify(chatRes.data).substring(0,60)}`);
  } catch(e) {
    console.log(`✗ FAILED: Chatbot Flow | Error: ${e.response?.data?.message || e.response?.status || e.message}`);
  }

  console.log(`\n=======================================`);
  console.log(`    VALIDATION SCRIPT FINISHED         `);
  console.log(`=======================================`);
}

runValidation();
