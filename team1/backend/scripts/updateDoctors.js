const mongoose = require('mongoose');
const Doctor = require('../models/Doctor');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://MEDviz:MEDviz@123@medviz.a3ppw43.mongodb.net/', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  tlsAllowInvalidCertificates: true,
  tlsAllowInvalidHostnames: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

async function updateDoctors() {
  try {
    console.log('Starting doctor status update...');

    // Update all doctors without a status field
    const result = await Doctor.updateMany(
      { status: { $exists: false } },
      {
        $set: {
          status: 'approved',  // Set existing doctors as approved by default
          registration_date: new Date()
        }
      }
    );

    console.log(`Updated ${result.modifiedCount} doctors with status field`);

    // Also update doctors with registration_date
    const dateResult = await Doctor.updateMany(
      { registration_date: { $exists: false } },
      {
        $set: {
          registration_date: new Date()
        }
      }
    );

    console.log(`Updated ${dateResult.modifiedCount} doctors with registration_date field`);

    // Display all doctors
    const doctors = await Doctor.find().select('full_name last_name email status registration_date');
    console.log('\nAll doctors in database:');
    doctors.forEach((doc, index) => {
      console.log(`${index + 1}. ${doc.full_name} ${doc.last_name} (${doc.email}) - Status: ${doc.status}`);
    });

    console.log('\nUpdate completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error updating doctors:', error);
    process.exit(1);
  }
}

// Run the update
updateDoctors();
