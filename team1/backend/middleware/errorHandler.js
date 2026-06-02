/**
 * Centralized error handling. Routes (or asyncHandler) call next(err); this is
 * the single place that shapes the HTTP response and logs. Replaces the
 * scattered try/catch -> res.status(500) duplication and prevents stack-trace
 * leakage to clients.
 */

class AppError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
    this.expose = status < 500; // 4xx messages are safe to show the client
  }
}

/** Wrap async route handlers so thrown/rejected errors reach the error handler. */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** 404 for unmatched routes. Mount after all routes, before errorHandler. */
function notFound(req, res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Mongoose-specific normalization
  if (err.name === 'CastError') {
    err = new AppError('Invalid identifier', 400);
  } else if (err.name === 'ValidationError') {
    err = new AppError(Object.values(err.errors).map((e) => e.message).join('; '), 400);
  } else if (err.code === 11000) {
    err = new AppError('Duplicate value', 409);
  }

  const status = err.status || 500;
  const requestId = req.id || '-';

  // Structured server log (never leak 5xx details to the client)
  const logLine = JSON.stringify({
    level: status >= 500 ? 'error' : 'warn',
    msg: err.message,
    status,
    method: req.method,
    path: req.originalUrl,
    requestId,
    userId: req.user ? req.user.id : undefined,
    stack: status >= 500 ? err.stack : undefined,
  });
  if (status >= 500) console.error(logLine);
  else console.warn(logLine);

  res.status(status).json({
    message: status >= 500 ? 'Internal server error' : err.message,
    requestId,
  });
}

module.exports = { AppError, asyncHandler, notFound, errorHandler };
