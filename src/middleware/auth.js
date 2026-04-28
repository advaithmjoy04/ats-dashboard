const { User } = require('../models');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { verifyAccessToken } = require('../utils/jwt');
const { createAuditLog } = require('../services');

async function logDeniedAuthAttempt(req, payload, reason) {
  try {
    await createAuditLog({
      req,
      tenantId: payload?.tenantId || req?.tenant?.id,
      actorUserId: payload?.id,
      actorRole: payload?.role,
      action: 'security.auth.denied',
      targetType: 'Auth',
      targetId: payload?.id || '',
      status: 'FAILURE',
      metadata: { reason },
    });
  } catch (error) {
    // Best effort only; auth denial should not fail because audit logging is unavailable.
  }
}

const authenticateToken = catchAsync(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return next(new AppError('Authentication required', 401));
  }

  const payload = verifyAccessToken(token);
  const isPlatformSuperAdmin = payload.role === 'PLATFORM_SUPER_ADMIN' || payload.platformScope;
  const user = await User.findOne({
    _id: payload.id,
    ...(isPlatformSuperAdmin ? {} : (payload.tenantId ? { tenantId: payload.tenantId } : {})),
  }).select('+password +refreshToken +resetToken +inviteToken');

  if (!user || user.status !== 'ACTIVE') {
    await logDeniedAuthAttempt(req, payload, 'user_not_authorized');
    return next(new AppError('User not authorized', 401));
  }

  if (!user.tenantId && !isPlatformSuperAdmin) {
    await logDeniedAuthAttempt(req, payload, 'tenant_not_configured');
    return next(new AppError('User tenant is not configured', 403));
  }

  if (!isPlatformSuperAdmin && payload.tenantId && String(payload.tenantId) !== String(user.tenantId)) {
    await logDeniedAuthAttempt(req, payload, 'access_token_tenant_mismatch');
    return next(new AppError('Tenant mismatch detected', 403));
  }

  if (!isPlatformSuperAdmin && req.tenant?.id && String(req.tenant.id) !== String(user.tenantId)) {
    await logDeniedAuthAttempt(req, payload, 'request_tenant_mismatch');
    return next(new AppError('You are trying to access the wrong institute workspace', 403));
  }

  req.user = {
    id: user._id.toString(),
    tenantId: user.tenantId ? user.tenantId.toString() : '',
    email: user.email,
    role: user.role,
    fullName: user.fullName,
    status: user.status,
  };

  return next();
});

module.exports = authenticateToken;
