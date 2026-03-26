const mongoose = require('mongoose');

const { Schema } = mongoose;

const USER_ROLES = ['ADMIN', 'RECRUITER', 'STUDENT'];
const USER_STATUSES = ['PENDING', 'ACTIVE', 'INACTIVE'];

const userSchema = new Schema(
  {
    fullName: { type: String, trim: true },
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
  },
  { timestamps: true }
);

userSchema.index({ role: 1 });
userSchema.index({ status: 1 });

module.exports = mongoose.model('User', userSchema);
