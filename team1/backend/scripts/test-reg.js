const axios = require('axios');
const BASE_URL = 'https://medviz-backend.onrender.com/api';

async function testRegistration() {
  console.log('Testing Patient Registration...');
  try {
    const res = await axios.post(`${BASE_URL}/auth/patients/register`, {
      full_name: 'Test', last_name: 'Real',
      email: `real_test_${Date.now()}@resend.dev`, phone: '1234567890', password: 'Password123!', 
      dob: '1990-01-01', gender: 'Male', address: '123 Test St',
      emergency_contact: '0987654321', blood_group: 'O+',
      agreed_terms: true
    });
    console.log('Status:', res.status);
    console.log('Data:', res.data);
  } catch (error) {
    console.log('Error:', error.response?.status, error.response?.data || error.message);
  }
}
testRegistration();
