// Boot: validate config, connect Mongo, start jobs, listen, handle shutdown.
// The Express app itself lives in app.js (I/O-free, testable).

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const http = require('http');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');

dotenv.config();

const { createAdapter } = require('@socket.io/redis-adapter');
const { isRedisEnabled, createPubSubClient } = require('./utils/redis');
const logger = require('./utils/logger');
const app = require('./app');
const { startAutoCompleteJob, stopAutoCompleteJob } = require('./jobs/appointmentAutoComplete');
const { startAppointmentAlertJob, stopAppointmentAlertJob } = require('./jobs/appointmentAlerts');

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
if (!process.env.CORS_ORIGIN) {
  logger.error('CORS_ORIGIN is not set. Refusing to start.');
  process.exit(1);
}
if (!process.env.FRONTEND_URL) {
  logger.error('FRONTEND_URL is not set. Refusing to start.');
  process.exit(1);
}

// ---- DB connection (listen only after a successful connect) ----
mongoose
  .connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000, maxPoolSize: 20 })
  .then(() => {
    logger.info('MongoDB connected');
    startAutoCompleteJob();
    startAppointmentAlertJob();
    
    const server = http.createServer(app);
    const io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL,
        methods: ['GET', 'POST']
      }
    });

    // ---- Horizontal scaling: when Redis is enabled, attach the Redis adapter
    // so `io.to(room)` emits fan out to clients connected to OTHER instances.
    if (isRedisEnabled) {
      const pubClient = createPubSubClient();
      const subClient = createPubSubClient();
      if (pubClient && subClient) {
        io.adapter(createAdapter(pubClient, subClient));
        logger.info('Socket.io Redis adapter enabled');
      }
    }

    // Make io available to routes
    app.set('io', io);

    // ---- Socket.io auth: verify the JWT in the handshake, derive the room
    // from the token (NEVER trust a client-supplied userId). Prevents any
    // client from joining another user's notification room (PHI leak).
    io.use((socket, next) => {
      try {
        const token =
          socket.handshake.auth?.token ||
          (socket.handshake.headers?.authorization || '').replace(/^Bearer /, '');
        if (!token) return next(new Error('Authentication required'));
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded?.id || !decoded?.role) return next(new Error('Malformed token'));
        socket.user = { id: String(decoded.id), role: decoded.role };
        next();
      } catch (err) {
        next(new Error('Invalid or expired token'));
      }
    });

    io.on('connection', (socket) => {
      // Auto-join the authenticated user's own room only.
      socket.join(socket.user.id);
      logger.info(`Socket connected: ${socket.id} (user ${socket.user.id})`);

      socket.on('disconnect', () => {
        logger.info(`Socket disconnected: ${socket.id}`);
      });
    });

    server.listen(PORT, () => logger.info(`Server running on port ${PORT}`));

    // ---- Graceful shutdown: stop jobs, close sockets, drain HTTP, close Mongo ----
    const shutdown = (signal) => {
      logger.info(`${signal} received, shutting down`);
      try { stopAutoCompleteJob(); } catch (_) {}
      try { stopAppointmentAlertJob(); } catch (_) {}
      io.close();
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