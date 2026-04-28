const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { createAuditLog } = require('../services');
const AppError = require('./AppError');

async function verifyPasswordConfirmation({ userId, tenantId, role, passwordConfirmation, req, action = 'security.password_confirmation.denied' }) {
  const normalizedPassword = String(passwordConfirmation || '');
  if (!normalizedPassword) {
    throw new AppError('Password confirmation is required for this action', 400);
  }

  const user = await User.findOne({
    _id: userId,
    ...(tenantId ? { tenantId } : {}),
    ...(role ? { role } : {}),
    status: 'ACTIVE',
  }).select('+password');

  if (!user) {
    throw new AppError('User account not found', 404);
  }

  const valid = await bcrypt.compare(normalizedPassword, user.password);
  if (!valid) {
    if (req) {
      await createAuditLog({
        req,
        tenantId,
        actorUserId: userId,
        actorRole: role,
        action,
        targetType: 'Auth',
        targetId: userId,
        status: 'FAILURE',
        metadata: { reason: 'invalid_password_confirmation' },
      }).catch(() => null);
    }
    throw new AppError('Password confirmation is incorrect', 403);
  }

  return user;
}

module.exports = {
  verifyPasswordConfirmation,
};
