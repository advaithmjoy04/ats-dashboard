const mongoose = require('mongoose');

const { Schema } = mongoose;

const EMAIL_GROUP_ROLES = ['STUDENT', 'RECRUITER'];
const EMAIL_GROUP_MEMBER_STATUSES = ['PENDING', 'INVITED', 'ACTIVE', 'FAILED'];

const emailGroupMemberSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    fullName: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: EMAIL_GROUP_MEMBER_STATUSES,
      default: 'PENDING',
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    lastInvitedAt: Date,
    lastError: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: true }
);

const emailGroupSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: EMAIL_GROUP_ROLES, required: true },
    description: { type: String, trim: true, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    lastSentAt: Date,
    members: {
      type: [emailGroupMemberSchema],
      default: [],
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length <= 500;
        },
        message: 'Email groups can contain at most 500 members',
      },
    },
  },
  { timestamps: true }
);

emailGroupSchema.index({ tenantId: 1, name: 1 }, { unique: true });
emailGroupSchema.index({ tenantId: 1, role: 1, createdAt: -1 });
emailGroupSchema.index({ tenantId: 1, 'members.email': 1 });

module.exports = mongoose.model('EmailGroup', emailGroupSchema);
