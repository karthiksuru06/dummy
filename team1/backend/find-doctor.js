const mongoose = require('mongoose');
const Doctor = require('./models/Doctor');
require('dotenv').config();

async function findDoctor() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://MEDviz:medviz123@medviz.a3ppw43.mongodb.net/', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    const doctors = await Doctor.find({});
    console.log(`Found ${doctors.length} doctors`);

    if (doctors.length > 0) {
      console.log('\nDoctor details:');
      doctors.forEach(doc => {
        console.log(`- Email: ${doc.email}, Name: ${doc.full_name}, Specialty: ${doc.specialization}`);
      });
    } else {
      console.log('No doctors found');
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

findDoctor();
