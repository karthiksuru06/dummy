const axios = require('axios');
const BASE_URL = 'https://medviz-backend.onrender.com/api';

async function testAuthFlow() {
  const email = `auth_test_${Date.now()}@test.com`;
  const password = 'Password123!';

  console.log('1. Testing Patient Registration...');
  try {
    const regRes = await axios.post(`${BASE_URL}/auth/patients/register`, {
      full_name: 'Auth', last_name: 'Test',
      email: email, phone: '1234567890', password: password, 
      dob: '1990-01-01', gender: 'Male', address: '123 Test St',
      emergency_contact: '0987654321', blood_group: 'O+',
      agreed_terms: true
    });
    console.log(`✓ Registration: ${regRes.status} | ${regRes.data.message}`);

    console.log('\n2. Testing Patient Login...');
    const loginRes = await axios.post(`${BASE_URL}/auth/patients/login`, {
      email: email, password: password
    });
    console.log(`✓ Login: ${loginRes.status} | Token Length: ${loginRes.data.token.length}`);
    
    console.log('\n3. Testing Forgot Password (OTP)...');
    const forgotRes = await axios.post(`${BASE_URL}/auth/forgot-password`, { email });
    console.log(`✓ Forgot Password: ${forgotRes.status} | ${forgotRes.data.message}`);
    
  } catch (error) {
    console.log('Error:', error.response?.status, error.response?.data || error.message);
  }
}
testAuthFlow();
