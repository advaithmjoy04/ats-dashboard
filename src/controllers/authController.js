const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { Tenant, User } = require('../models');
const { sendAccountInvitation, sendPasswordReset } = require('../services');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { sendData, sendMessage } = require('../utils/response');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { hashToken } = require('../services/atsService');
const { getRequestOrigin } = require('../utils/requestOrigin');
const { buildTenantAppOrigin, buildTenantAppUrl } = require('../services/tenantService');
const config = require('../config');
const { assertValidPassword } = require('../utils/passwordValidation');

const MAX_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000;
const RESET_WINDOW = 15 * 60 * 1000;

function serializeAuthenticatedUser(user) {
  return {
    id: user._id,
    tenantId: user.tenantId || null,
    username: user.username || '',
    email: user.email,
    role: user.role,
    fullName: user.fullName || '',
    status: user.status,
    forcePasswordChange: Boolean(user.forcePasswordChange),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function normalizeLoginIdentifier(value) {
  return String(value || '').trim().toLowerCase();
}

function isPlatformScope(req) {
  return String(req.body?.scope || '').trim().toLowerCase() === 'platform';
}

async function resolveAuthTenantId(req) {
  const tenantHint = String(req.body?.tenant || req.query?.tenant || '').trim().toLowerCase();
  if (tenantHint) {
    const hintedTenant = await Tenant.findOne({ isActive: true, slug: tenantHint }).lean();
    if (hintedTenant) {
      return hintedTenant._id.toString();
    }
  }
  return req.tenant?.id;
}

async function findUserByScopedToken({ tenantId, tokenField, hashedToken, expiryField }) {
  const expiryQuery = { [expiryField]: { $gt: new Date() } };

  if (tenantId) {
    return User.findOne({
      tenantId,
      [tokenField]: hashedToken,
      ...expiryQuery,
    }).select(`+${tokenField} +password`);
  }

  return User.findOne({
    [tokenField]: hashedToken,
    ...expiryQuery,
  }).select(`+${tokenField} +password`);
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.nodeEnv === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

const login = catchAsync(async (req, res, next) => {
  const identifier = normalizeLoginIdentifier(req.body.email || req.body.username || req.body.identifier);
  const { password } = req.body;
  const tenantId = await resolveAuthTenantId(req);
  const loginFilter = { $or: [{ email: identifier }, { username: identifier }] };
  let user = null;

  if (isPlatformScope(req)) {
    user = await User.findOne({
      role: 'PLATFORM_SUPER_ADMIN',
      ...loginFilter,
    }).select('+password +refreshToken');
  } else {
    user = await User.findOne({
      ...(tenantId ? { tenantId } : {}),
      ...loginFilter,
    }).select('+password +refreshToken');
  }

  if (!user) {
    return next(new AppError('Invalid credentials', 401));
  }

  if (user.lockUntil && user.lockUntil > Date.now()) {
    return next(new AppError('Account locked. Try again later.', 423));
  }

  if (typeof user.password !== 'string' || !user.password.startsWith('$2')) {
    return next(new AppError('Stored password hash is invalid for this account. Reset or reseed the account password.', 500));
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= MAX_ATTEMPTS) {
      user.lockUntil = new Date(Date.now() + LOCK_TIME);
    }
    await user.save();
    return next(new AppError('Invalid credentials', 401));
  }

  if (user.status !== 'ACTIVE') {
    return next(new AppError('Account is not active', 403));
  }

  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  const accessToken = signAccessToken({
    id: user._id,
    tenantId: user.tenantId,
    role: user.role,
    email: user.email,
    platformScope: user.role === 'PLATFORM_SUPER_ADMIN',
  });
  const refreshToken = signRefreshToken({
    id: user._id,
    tenantId: user.tenantId,
    role: user.role,
    platformScope: user.role === 'PLATFORM_SUPER_ADMIN',
  });
  user.refreshToken = hashToken(refreshToken);
  await user.save();

  res.cookie('refreshToken', refreshToken, cookieOptions());
  return sendData(res, 200, {
    accessToken,
    user: serializeAuthenticatedUser(user),
  });
});

const logout = catchAsync(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (refreshToken) {
    try {
      const payload = verifyRefreshToken(refreshToken);
      const user = await User.findOne({ _id: payload.id, ...(payload.tenantId ? { tenantId: payload.tenantId } : {}) }).select('+refreshToken');
      if (user) {
        user.refreshToken = undefined;
        await user.save();
      }
    } catch (error) {
      // Always clear the cookie even if the refresh token is already invalid.
    }
  }
  res.clearCookie('refreshToken', cookieOptions());
  return sendMessage(res, 200, 'Logged out successfully');
});

const refresh = catchAsync(async (req, res, next) => {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) {
    return next(new AppError('Refresh token missing', 401));
  }
  const payload = verifyRefreshToken(refreshToken);
  const user = await User.findOne({
    _id: payload.id,
    ...((payload.role === 'PLATFORM_SUPER_ADMIN' || payload.platformScope) ? {} : (payload.tenantId ? { tenantId: payload.tenantId } : {})),
  }).select('+refreshToken');
  if (!user || user.refreshToken !== hashToken(refreshToken)) {
    return next(new AppError('Invalid refresh token', 401));
  }
  if (user.role !== 'PLATFORM_SUPER_ADMIN' && req.tenant?.id && String(user.tenantId) !== String(req.tenant.id)) {
    return next(new AppError('Invalid tenant refresh attempt', 403));
  }

  const nextRefreshToken = signRefreshToken({
    id: user._id,
    tenantId: user.tenantId,
    role: user.role,
    platformScope: user.role === 'PLATFORM_SUPER_ADMIN',
  });
  user.refreshToken = hashToken(nextRefreshToken);
  await user.save();
  res.cookie('refreshToken', nextRefreshToken, cookieOptions());

  return sendData(res, 200, {
    accessToken: signAccessToken({
      id: user._id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
      platformScope: user.role === 'PLATFORM_SUPER_ADMIN',
    }),
  });
});

const forgotPassword = catchAsync(async (req, res) => {
  const tenantId = await resolveAuthTenantId(req);
  const user = await User.findOne({
    email: String(req.body.email || '').trim().toLowerCase(),
    ...(isPlatformScope(req) ? { role: 'PLATFORM_SUPER_ADMIN' } : {}),
    ...(tenantId ? { tenantId } : {}),
  }).select('+resetToken');
  const appOrigin = getRequestOrigin(req, {
    frontendOrigin: config.frontendOrigin,
    nodeEnv: config.nodeEnv,
  });
  if (user) {
    const plainToken = crypto.randomBytes(32).toString('hex');
    user.resetToken = hashToken(plainToken);
    user.resetTokenExpiry = new Date(Date.now() + RESET_WINDOW);
    await user.save();
    const tenant = await Tenant.findById(user.tenantId).lean();
    const tenantAppOrigin = buildTenantAppOrigin(tenant, { frontendOrigin: appOrigin });
    await sendPasswordReset({
      email: user.email,
      fullName: user.fullName || user.email,
      resetLink: buildTenantAppUrl(tenant, '/reset-password', {
        frontendOrigin: appOrigin,
        query: { token: plainToken },
      }),
      tenantId: user.tenantId,
      appOrigin: tenantAppOrigin || appOrigin,
    });
  }
  return sendMessage(res, 200, 'If the email exists, a reset link has been sent');
});

const resetPassword = catchAsync(async (req, res, next) => {
  const hashedToken = hashToken(req.body.token);
  const user = await findUserByScopedToken({
    tenantId: await resolveAuthTenantId(req),
    tokenField: 'resetToken',
    hashedToken,
    expiryField: 'resetTokenExpiry',
  });
  if (!user) {
    return next(new AppError('Invalid or expired reset token', 400));
  }
  assertValidPassword(req.body.newPassword, 'New password');
  user.password = await bcrypt.hash(req.body.newPassword, 10);
  user.resetToken = undefined;
  user.resetTokenExpiry = undefined;
  user.refreshToken = undefined;
  user.forcePasswordChange = false;
  await user.save();
  return sendMessage(res, 200, 'Password updated successfully');
});

const activateInvite = catchAsync(async (req, res, next) => {
  const hashedToken = hashToken(req.body.token);
  const user = await findUserByScopedToken({
    tenantId: await resolveAuthTenantId(req),
    tokenField: 'inviteToken',
    hashedToken,
    expiryField: 'inviteTokenExpiry',
  });
  if (!user) {
    return next(new AppError('Invalid or expired invitation token', 400));
  }
  assertValidPassword(req.body.password, 'Password');
  user.password = await bcrypt.hash(req.body.password, 10);
  user.status = 'ACTIVE';
  user.inviteToken = undefined;
  user.inviteTokenExpiry = undefined;
  user.forcePasswordChange = false;
  await user.save();
  return sendMessage(res, 200, 'Account activated successfully');
});

const forcePasswordChange = catchAsync(async (req, res, next) => {
  const user = await User.findOne({
    _id: req.user.id,
    ...(req.user.role === 'PLATFORM_SUPER_ADMIN' ? {} : { tenantId: req.user.tenantId }),
  }).select('+password');
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  assertValidPassword(req.body.newPassword, 'New password');
  user.password = await bcrypt.hash(req.body.newPassword, 10);
  user.forcePasswordChange = false;
  user.refreshToken = undefined;
  await user.save();
  return sendMessage(res, 200, 'Password changed successfully');
});

const me = catchAsync(async (req, res, next) => {
  const user = await User.findOne({
    _id: req.user.id,
    ...(req.user.role === 'PLATFORM_SUPER_ADMIN' ? {} : { tenantId: req.user.tenantId }),
  });
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  return sendData(res, 200, serializeAuthenticatedUser(user));
});

module.exports = {
  login,
  logout,
  refresh,
  forgotPassword,
  resetPassword,
  forcePasswordChange,
  activateInvite,
  me,
};
