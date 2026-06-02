const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patient');
const doctorRoutes = require('./routes/doctor');
const appointmentRoutes = require('./routes/appointments');
const prescriptionRoutes = require('./routes/prescriptions');
const notificationRoutes = require('./routes/notifications');
const taskRoutes = require('./routes/tasks');
const doctorSettingsRoutes = require('./routes/doctorSettings');
const patientsRoutes = require('./routes/patients'); // New patients routes for doctor dashboard
const adminRoutes = require('./routes/admin'); // Admin routes
const chatRoutes = require('./routes/chat');
const { startAutoCompleteJob } = require('./jobs/appointmentAutoComplete'); // Auto-complete job
const { startAppointmentAlertJob } = require('./jobs/appointmentAlerts'); // Alert job

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Validate required environment variables
if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET environment variable is not set. Please configure it in your .env file.');
  process.exit(1);
}

// Connect to MongoDB
if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI environment variable is not set. Please configure it in your .env file.');
  process.exit(1);
}
mongoose.connect(process.env.MONGODB_URI)
.then(() => {
  console.log('MongoDB connected');
  // Start the appointment auto-complete scheduler
  startAutoCompleteJob();
  // Start the appointment alert scheduler
  startAppointmentAlertJob();
})
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes); // Original patient routes (auth/signup)
app.use('/api/patient', patientsRoutes); // New patient routes for doctor dashboard
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/doctor-settings', doctorSettingsRoutes);
app.use('/api/admin', adminRoutes); // Admin routes
// Chat route
app.use('/api/chat', chatRoutes);

// Default route
app.get('/', (req, res) => {
  res.send('MEDviz Backend API');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
