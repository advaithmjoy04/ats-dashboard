const mongoose = require('mongoose');

const { Schema } = mongoose;

const USER_ROLES = ['PLATFORM_SUPER_ADMIN', 'ADMIN', 'RECRUITER', 'STUDENT'];
const USER_STATUSES = ['PENDING', 'ACTIVE', 'INACTIVE'];

const userSchema = new Schema(
  {
    fullName: { type: String, trim: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', index: true },
    username: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: USER_ROLES,
      default: 'STUDENT',
      required: true,
    },
    status: {
      type: String,
      enum: USER_STATUSES,
      default: 'PENDING',
      required: true,
    },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
    resetToken: { type: String, select: false },
    resetTokenExpiry: { type: Date },
    inviteToken: { type: String, select: false },
    inviteTokenExpiry: { type: Date },
    refreshToken: { type: String, select: false },
    forcePasswordChange: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.pre('save', function normalizeOptionalUsername(next) {
  if (!this.username) {
    this.username = undefined;
  }
  next();
});

userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ tenantId: 1, email: 1 });
userSchema.index(
  { tenantId: 1, username: 1 },
  {
    unique: true,
    partialFilterExpression: {
      username: { $exists: true, $type: 'string' },
    },
  }
);

module.exports = mongoose.model('User', userSchema);
