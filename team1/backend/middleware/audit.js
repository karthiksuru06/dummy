const AuditLog = require('../models/AuditLog');

/**
 * Records an audit entry for sensitive actions. Mount on routes that read or
 * mutate PHI. Writes are fire-and-forget (never block or fail the request on a
 * logging error, but always attempt to record).
 *
 * Usage: router.post('/:id/approve', audit('appointment.approve', 'Appointment'), handler)
 */
function audit(action, resourceType) {
  return (req, res, next) => {
    res.on('finish', () => {
      AuditLog.create({
        actor_id: req.user ? req.user.id : undefined,
        actor_role: req.user ? req.user.role : 'anonymous',
        action,
        resource_type: resourceType,
        resource_id: req.params.id || req.params.patientId || req.params.doctorId || req.params.reportId || req.params.prescriptionId,
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        ip: req.ip,
        request_id: req.id,
      }).catch((err) => console.error(JSON.stringify({ level: 'error', msg: 'audit_write_failed', error: err.message })));
    });
    next();
  };
}

module.exports = { audit };
