const crypto = require('crypto');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

/** Attach a request id for log correlation and client-side support tickets. */
function requestId(req, res, next) {
  req.id = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
}

// Global limiter: blunt DoS protection on every route.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please slow down' },
});

// Strict limiter: brute-force protection for auth, OTP, and the LLM endpoint.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts, try again later' },
});

/** helmet with sane defaults for an API (CSP is enforced on the static frontend host, not here). */
const securityHeaders = helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'same-site' },
});

module.exports = { requestId, globalLimiter, authLimiter, securityHeaders };
