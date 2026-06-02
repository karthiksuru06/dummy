const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patient');
const doctorRoutes = require('./routes/doctor');
const appointmentRoutes = require('./routes/appointments');
const prescriptionRoutes = require('./routes/prescriptions');
const notificationRoutes = require('./routes/notifications');
const taskRoutes = require('./routes/tasks');
const doctorSettingsRoutes = require('./routes/doctorSettings');
const patientsRoutes = require('./routes/patients'); // patient routes for doctor dashboard
const adminRoutes = require('./routes/admin');
const chatRoutes = require('./routes/chat');
const fileRoutes = require('./routes/files');

const { startAutoCompleteJob } = require('./jobs/appointmentAutoComplete');
const { startAppointmentAlertJob } = require('./jobs/appointmentAlerts');

const { authenticate, requireRole } = require('./middleware/auth');
const { requestId, globalLimiter, authLimiter, securityHeaders } = require('./middleware/security');
const { notFound, errorHandler } = require('./middleware/errorHandler');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ---- Fail fast on missing critical config (before listening) ----
if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set. Refusing to start.');
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET is too short (<32 chars). Use a strong random secret.');
  process.exit(1);
}
if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is not set. Refusing to start.');
  process.exit(1);
}

// ---- Core middleware ----
app.set('trust proxy', 1); // correct req.ip behind a proxy/load balancer
app.use(securityHeaders);
app.use(requestId);
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(globalLimiter);

// ---- Health endpoints (real readiness, not a static string) ----
app.get('/healthz', (req, res) => res.json({ status: 'ok' }));
app.get('/readyz', (req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).json({ status: dbUp ? 'ready' : 'degraded', db: dbUp });
});

// ---- Public / auth routes (rate-limited against brute force) ----
app.use('/api/auth', authLimiter, authRoutes);

// ---- Authenticated routes (RBAC at the router boundary) ----
// admin: admins only — complete fix for the open admin API.
app.use('/api/admin', authenticate, requireRole('admin'), adminRoutes);
// doctor-only configuration.
app.use('/api/doctor-settings', authenticate, requireRole('doctor'), doctorSettingsRoutes);
// Mixed-role but must be logged in. Per-record ownership is enforced in-handler
// (see ADR-002); router-level auth removes all anonymous access immediately.
app.use('/api/appointments', authenticate, appointmentRoutes);
app.use('/api/prescriptions', authenticate, prescriptionRoutes);
app.use('/api/notifications', authenticate, notificationRoutes);
app.use('/api/tasks', authenticate, taskRoutes);
app.use('/api/patient', authenticate, patientsRoutes); // doctor-dashboard patient views
app.use('/api/files', fileRoutes); // secure replacement for static /uploads

// These keep their existing inline JWT checks; /doctors has a public browse
// (GET /available) so it is not blanket-gated here. Mutating doctor routes are
// guarded per-route inside routes/doctor.js. See ADR-002.
app.use('/api/patients', patientRoutes);
app.use('/api/doctors', doctorRoutes);

// chat: must be logged in + rate-limited (LLM endpoint).
app.use('/api/chat', authenticate, authLimiter, chatRoutes);

app.get('/', (req, res) => res.send('MEDviz Backend API'));

// ---- 404 + centralized error handling (must be last) ----
app.use(notFound);
app.use(errorHandler);

// ---- DB connection (listen only after a successful connect) ----
mongoose
  .connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: 20,
  })
  .then(() => {
    console.log('MongoDB connected');
    startAutoCompleteJob();
    startAppointmentAlertJob();
    const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

    // ---- Graceful shutdown: drain HTTP, close Mongo ----
    const shutdown = (signal) => {
      console.log(`${signal} received, shutting down`);
      server.close(() => mongoose.connection.close(false).then(() => process.exit(0)));
      setTimeout(() => process.exit(1), 10000).unref();
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  })
  .catch((err) => {
    console.error('MongoDB connection error, refusing to start:', err.message);
    process.exit(1);
  });

// ---- Last-resort process guards ----
process.on('unhandledRejection', (reason) => {
  console.error(JSON.stringify({ level: 'error', msg: 'unhandledRejection', reason: String(reason) }));
});
process.on('uncaughtException', (err) => {
  console.error(JSON.stringify({ level: 'error', msg: 'uncaughtException', error: err.message, stack: err.stack }));
  process.exit(1);
});

module.exports = app;
