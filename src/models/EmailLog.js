const mongoose = require('mongoose');
const { Schema } = mongoose;

const emailLogSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', index: true },
    email: { type: String, required: true },
    type: { type: String, required: true },
    status: { type: String, required: true },
    sentAt: { type: Date, default: Date.now },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

emailLogSchema.index({ email: 1 });
emailLogSchema.index({ status: 1 });
emailLogSchema.index({ tenantId: 1, sentAt: -1 });

module.exports = mongoose.model('EmailLog', emailLogSchema);
