const mongoose = require('mongoose');
const { AppError } = require('./errorHandler');

/**
 * Zero-dependency boundary validation. Validate at system edges only
 * (user input), trust internal code. Keeps the install footprint small.
 *
 * Schema shape:
 *   { field: { required, type, isEmail, isObjectId, minLength, in, isArray } }
 */
const isEmail = (v) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

function check(value, rule, field, errors) {
  const present = value !== undefined && value !== null && value !== '';
  if (rule.required && !present) {
    errors.push(`${field} is required`);
    return;
  }
  if (!present) return; // optional + absent → skip

  if (rule.type === 'string' && typeof value !== 'string') errors.push(`${field} must be a string`);
  if (rule.type === 'number' && typeof value !== 'number') errors.push(`${field} must be a number`);
  if (rule.isArray && !Array.isArray(value)) errors.push(`${field} must be an array`);
  if (rule.isArray && Array.isArray(value) && rule.nonEmpty && value.length === 0) errors.push(`${field} must not be empty`);
  if (rule.isEmail && !isEmail(value)) errors.push(`${field} must be a valid email`);
  if (rule.isObjectId && !mongoose.isValidObjectId(value)) errors.push(`${field} must be a valid id`);
  if (rule.minLength && String(value).length < rule.minLength) errors.push(`${field} must be at least ${rule.minLength} characters`);
  if (rule.in && !rule.in.includes(value)) errors.push(`${field} must be one of: ${rule.in.join(', ')}`);
}

/** Validate req.body against a schema. */
function validateBody(schema) {
  return (req, res, next) => {
    const errors = [];
    for (const [field, rule] of Object.entries(schema)) {
      check(req.body[field], rule, field, errors);
    }
    if (errors.length) return next(new AppError(errors.join('; '), 400));
    next();
  };
}

/** Guard a route param is a valid ObjectId before any DB lookup. */
function validateObjectIdParam(param = 'id') {
  return (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params[param])) {
      return next(new AppError(`Invalid ${param}`, 400));
    }
    next();
  };
}

module.exports = { validateBody, validateObjectIdParam };
