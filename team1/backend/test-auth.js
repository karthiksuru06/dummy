const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Patient = require('./models/Patient');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function testAuth() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://MEDviz:medviz123@medviz.a3ppw43.mongodb.net/', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Check if any patients exist
    const patients = await Patient.find({});
    console.log(`Found ${patients.length} patients in database`);

    if (patients.length > 0) {
      const firstPatient = patients[0];
      console.log('\nFirst patient details:');
      console.log('- Name:', firstPatient.full_name, firstPatient.last_name);
      console.log('- Email:', firstPatient.email);
      console.log('- ID:', firstPatient._id.toString());

      // Generate a test token for this patient
      const token = jwt.sign(
        { id: firstPatient._id.toString(), role: 'patient' },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '1h' }
      );

      console.log('\n=== TEST TOKEN FOR FRONTEND ===');
      console.log('Copy this token and use it in the browser console:');
      console.log(`localStorage.setItem('token', '${token}');`);
      console.log('\nThen refresh the page!');
      console.log('================================\n');
    } else {
      console.log('\nNo patients found. Creating a test patient...');

      const hashedPassword = await bcrypt.hash('test123', 10);
      const testPatient = new Patient({
        full_name: 'Test',
        last_name: 'Patient',
        email: 'test@patient.com',
        phone: '1234567890',
        password: hashedPassword,
        dob: new Date('1990-01-01'),
        gender: 'Male',
        address: '123 Test Street',
        emergency_contact: '9876543210',
        blood_group: 'O+',
        medical_history: 'None',
        current_medications: 'Aspirin; Vitamin D',
        height: '5.8 ft',
        weight: '70 Kg',
        bpm: '72',
        agreed_terms: true
      });

      await testPatient.save();
      console.log('Test patient created!');
      console.log('Email: test@patient.com');
      console.log('Password: test123');

      // Generate token for the test patient
      const token = jwt.sign(
        { id: testPatient._id.toString(), role: 'patient' },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '1h' }
      );

      console.log('\n=== TEST TOKEN FOR FRONTEND ===');
      console.log('Copy this token and use it in the browser console:');
      console.log(`localStorage.setItem('token', '${token}');`);
      console.log('\nThen refresh the page!');
      console.log('================================\n');
    }

    await mongoose.connection.close();
    console.log('Test complete!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testAuth();