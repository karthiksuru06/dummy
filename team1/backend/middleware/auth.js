const jwt = require('jsonwebtoken');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Admin = require('../models/Admin');

const MODEL_BY_ROLE = { patient: Patient, doctor: Doctor, admin: Admin };

/**
 * Extracts and verifies the JWT, attaching `req.user = { id, role }` and
 * (lazily) `req.account` (the DB document) for downstream ownership checks.
 *
 * Token shape (from routes/auth.js): jwt.sign({ id, role }, JWT_SECRET).
 * Header: `Authorization: Bearer <token>`.
 */
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  let decoded;
  try {
    // No `|| 'secret'` fallback — server.js fails fast if JWT_SECRET is unset.
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    const message = err.name === 'TokenExpiredError' ? 'Session expired' : 'Invalid token';
    return res.status(401).json({ message });
  }

  if (!decoded || !decoded.id || !decoded.role) {
    return res.status(401).json({ message: 'Malformed token' });
  }

  req.user = { id: String(decoded.id), role: decoded.role };
  next();
}

/**
 * Role gate. Usage: router.use(authenticate, requireRole('admin')).
 * Accepts one or more allowed roles.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient role' });
    }
    next();
  };
}

/**
 * Loads the authenticated account document onto req.account (and verifies it
 * still exists / is active). Use on routes that need the live record.
 */
async function loadAccount(req, res, next) {
  try {
    const Model = MODEL_BY_ROLE[req.user.role];
    if (!Model) return res.status(401).json({ message: 'Unknown role' });
    const account = await Model.findById(req.user.id).select('-password -otp -otp_hash');
    if (!account) return res.status(401).json({ message: 'Account no longer exists' });
    req.account = account;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Ownership guard: ensures the resource the request targets belongs to the
 * caller (or the caller is staff). `getOwnerId(req)` returns the patient/owner
 * id the resource belongs to; compared against req.user.id.
 * Doctors/admins are allowed through (they have their own scoping rules).
 */
function requireOwnership(getOwnerId, { allowRoles = ['doctor', 'admin'] } = {}) {
  return async (req, res, next) => {
    try {
      if (allowRoles.includes(req.user.role)) return next();
      const ownerId = await getOwnerId(req);
      if (!ownerId || String(ownerId) !== req.user.id) {
        return res.status(403).json({ message: 'Forbidden: not your resource' });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { authenticate, requireRole, loadAccount, requireOwnership };
