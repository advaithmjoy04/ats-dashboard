const mongoose = require('mongoose');

const { Schema } = mongoose;

const auditLogSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', index: true },
    actorUserId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    actorRole: { type: String, trim: true },
    action: { type: String, required: true, trim: true, index: true },
    targetType: { type: String, trim: true, index: true },
    targetId: { type: String, trim: true, index: true },
    status: { type: String, enum: ['SUCCESS', 'FAILURE'], default: 'SUCCESS', index: true },
    ipAddress: { type: String, trim: true },
    method: { type: String, trim: true },
    path: { type: String, trim: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

auditLogSchema.index({ tenantId: 1, createdAt: -1 });
auditLogSchema.index({ actorUserId: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
