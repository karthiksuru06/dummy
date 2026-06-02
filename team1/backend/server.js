// Boot: validate config, connect Mongo, start jobs, listen, handle shutdown.
// The Express app itself lives in app.js (I/O-free, testable).

const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const logger = require('./utils/logger');
const app = require('./app');
const { startAutoCompleteJob } = require('./jobs/appointmentAutoComplete');
const { startAppointmentAlertJob } = require('./jobs/appointmentAlerts');

const PORT = process.env.PORT || 5000;

// ---- Fail fast on missing/weak critical config (before listening) ----
if (!process.env.JWT_SECRET) {
  logger.error('JWT_SECRET is not set. Refusing to start.');
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) {
  logger.error('JWT_SECRET is too short (<32 chars). Use a strong random secret.');
  process.exit(1);
}
if (!process.env.MONGODB_URI) {
  logger.error('MONGODB_URI is not set. Refusing to start.');
  process.exit(1);
}

// ---- DB connection (listen only after a successful connect) ----
mongoose
  .connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000, maxPoolSize: 20 })
  .then(() => {
    logger.info('MongoDB connected');
    startAutoCompleteJob();
    startAppointmentAlertJob();
    const server = app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));

    // ---- Graceful shutdown: drain HTTP, close Mongo ----
    const shutdown = (signal) => {
      logger.info(`${signal} received, shutting down`);
      server.close(() => mongoose.connection.close(false).then(() => process.exit(0)));
      setTimeout(() => process.exit(1), 10000).unref();
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  })
  .catch((err) => {
    logger.error({ err: err.message }, 'MongoDB connection error, refusing to start');
    process.exit(1);
  });

// ---- Last-resort process guards ----
process.on('unhandledRejection', (reason) => {
  logger.error({ reason: String(reason) }, 'unhandledRejection');
});
process.on('uncaughtException', (err) => {
  logger.error({ err: err.message, stack: err.stack }, 'uncaughtException');
  process.exit(1);
});

module.exports = app;
