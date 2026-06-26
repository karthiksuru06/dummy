// Pure Express app — NO env validation, DB connection, or listen(). That lives
// in server.js (boot). Keeping the app I/O-free makes it importable by the test
// suite (Supertest + mongodb-memory-server) and is standard production layering.

const Sentry = require('@sentry/node');

// Error tracking is OPTIONAL: it only turns on when SENTRY_DSN is set. When the
// env var is unset (the case in tests and local dev by default), Sentry stays
// completely inert — no init, no error handler — so behavior is unchanged.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
  });
}

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const pinoHttp = require('pino-http');

const logger = require('./utils/logger');

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

const { authenticate, requireRole } = require('./middleware/auth');
const { requestId, globalLimiter, authLimiter, securityHeaders } = require('./middleware/security');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// ---- Core middleware ----
app.set('trust proxy', 1); // correct req.ip behind a proxy/load balancer
app.use(securityHeaders);
app.use(requestId);
// Structured request logging (skip noisy health checks). Disabled under tests.
if (process.env.NODE_ENV !== 'test') {
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => req.id,
      autoLogging: { ignore: (req) => req.url === '/healthz' || req.url === '/readyz' },
    })
  );
}
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
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
app.use('/api/admin', authenticate, requireRole('admin'), adminRoutes);
app.use('/api/doctor-settings', authenticate, requireRole('doctor'), doctorSettingsRoutes);
app.use('/api/appointments', authenticate, appointmentRoutes);
app.use('/api/prescriptions', authenticate, prescriptionRoutes);
app.use('/api/notifications', authenticate, notificationRoutes);
app.use('/api/tasks', authenticate, taskRoutes);
app.use('/api/patient', authenticate, patientsRoutes); // doctor-dashboard patient views
app.use('/api/files', fileRoutes); // secure replacement for static /uploads

// /doctors has a public browse (GET /available); mutating doctor routes are
// guarded per-route inside routes/doctor.js. /patients keeps inline JWT checks.
app.use('/api/patients', patientRoutes);
app.use('/api/doctors', doctorRoutes);

// chat: must be logged in + rate-limited (LLM endpoint).
app.use('/api/chat', authenticate, authLimiter, chatRoutes);

app.get('/', (req, res) => res.send('MEDviz Backend API'));

// ---- 404 + centralized error handling (must be last) ----
app.use(notFound);

// Sentry's Express error handler reports errors to Sentry, then falls through to
// our own handler. Only wired when SENTRY_DSN is set; otherwise inert. It must
// sit AFTER the routes but BEFORE the centralized errorHandler so our handler
// still has the final word on the response.
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

app.use(errorHandler);

module.exports = app;
