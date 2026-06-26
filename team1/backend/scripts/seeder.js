require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Admin = require('../models/Admin');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB Connected for Seeder'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

const seedUsers = async () => {
  try {
    // Clear existing dummy users if any
    await Patient.deleteMany({ email: { $in: ['testpatient1@example.com', 'testpatient2@example.com'] } });
    await Doctor.deleteMany({ email: { $in: ['testdoctor1@example.com', 'testdoctor2@example.com'] } });
    await Admin.deleteMany({ email: 'testadmin1@example.com' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    const patients = [
      {
        full_name: 'John',
        last_name: 'Doe',
        email: 'testpatient1@example.com',
        phone: '1234567890',
        password: hashedPassword,
        dob: new Date('1990-01-01'),
        gender: 'Male',
        address: '123 Main St, City, Country',
        emergency_contact: '0987654321',
        blood_group: 'O+',
        agreed_terms: true
      },
      {
        full_name: 'Jane',
        last_name: 'Smith',
        email: 'testpatient2@example.com',
        phone: '1234567891',
        password: hashedPassword,
        dob: new Date('1995-05-15'),
        gender: 'Female',
        address: '456 Oak St, City, Country',
        emergency_contact: '0987654322',
        blood_group: 'A+',
        agreed_terms: true
      }
    ];

    const doctors = [
      {
        full_name: 'Alice',
        last_name: 'Williams',
        email: 'testdoctor1@example.com',
        phone: '1234567892',
        password: hashedPassword,
        dob: new Date('1985-03-10'),
        gender: 'Female',
        address: '789 Pine St, City, Country',
        specialization: 'Cardiology',
        experience: '10 years',
        status: 'approved',
        agreed_terms: true
      },
      {
        full_name: 'Bob',
        last_name: 'Johnson',
        email: 'testdoctor2@example.com',
        phone: '1234567893',
        password: hashedPassword,
        dob: new Date('1980-07-20'),
        gender: 'Male',
        address: '321 Elm St, City, Country',
        specialization: 'Dermatology',
        experience: '15 years',
        status: 'approved',
        agreed_terms: true
      }
    ];

    const admins = [
      {
        full_name: 'Super Admin',
        email: 'testadmin1@example.com',
        password: hashedPassword,
        role: 'admin'
      }
    ];


    await Patient.insertMany(patients);
    console.log('Patients seeded successfully!');

    await Doctor.insertMany(doctors);
    console.log('Doctors seeded successfully!');

    await Admin.insertMany(admins);
    console.log('Admins seeded successfully!');

    console.log('Test users created with password: password123');
    process.exit();
  } catch (err) {
    console.error('Error seeding users:', err);
    process.exit(1);
  }
};

seedUsers();
