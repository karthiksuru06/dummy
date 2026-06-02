const mongoose = require('mongoose');

/**
 * Append-only audit trail. In healthcare, *who accessed/changed which patient
 * record, when, and from where* must be reconstructable. This is the minimum
 * viable HIPAA-style access log. Never updated or deleted in normal operation.
 */
const auditLogSchema = new mongoose.Schema(
  {
    actor_id: { type: mongoose.Schema.Types.ObjectId, index: true },
    actor_role: { type: String, enum: ['patient', 'doctor', 'admin', 'anonymous'], index: true },
    action: { type: String, required: true, index: true }, // e.g. 'appointment.approve'
    resource_type: { type: String }, // e.g. 'Prescription'
    resource_id: { type: mongoose.Schema.Types.ObjectId },
    method: String,
    path: String,
    status: Number,
    ip: String,
    request_id: String,
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: { createdAt: 'at', updatedAt: false } }
);

// Retain efficiently; index by time for forensic queries.
auditLogSchema.index({ at: -1 });
auditLogSchema.index({ resource_type: 1, resource_id: 1, at: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
