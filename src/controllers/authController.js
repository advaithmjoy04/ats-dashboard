const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { User } = require('../models');
const { sendAccountInvitation, sendPasswordReset } = require('../services');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { sendData, sendMessage } = require('../utils/response');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { hashToken } = require('../services/atsService');
const config = require('../config');

const MAX_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000;
const RESET_WINDOW = 15 * 60 * 1000;

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.nodeEnv === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password +refreshToken');

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
  const accessToken = signAccessToken({ id: user._id, role: user.role, email: user.email });
  const refreshToken = signRefreshToken({ id: user._id });
  user.refreshToken = hashToken(refreshToken);
  await user.save();

  res.cookie('refreshToken', refreshToken, cookieOptions());
  return sendData(res, 200, {
    accessToken,
    user: {
      id: user._id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      status: user.status,
    },
  });
});

const logout = catchAsync(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (refreshToken) {
    try {
      const payload = verifyRefreshToken(refreshToken);
      const user = await User.findById(payload.id).select('+refreshToken');
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
  const user = await User.findById(payload.id).select('+refreshToken');
  if (!user || user.refreshToken !== hashToken(refreshToken)) {
    return next(new AppError('Invalid refresh token', 401));
  }

  const nextRefreshToken = signRefreshToken({ id: user._id });
  user.refreshToken = hashToken(nextRefreshToken);
  await user.save();
  res.cookie('refreshToken', nextRefreshToken, cookieOptions());

  return sendData(res, 200, {
    accessToken: signAccessToken({ id: user._id, role: user.role, email: user.email }),
  });
});

const forgotPassword = catchAsync(async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select('+resetToken');
  if (user) {
    const plainToken = crypto.randomBytes(32).toString('hex');
    user.resetToken = hashToken(plainToken);
    user.resetTokenExpiry = new Date(Date.now() + RESET_WINDOW);
    await user.save();
    await sendPasswordReset({
      email: user.email,
      fullName: user.fullName || user.email,
      resetLink: `${config.frontendOrigin}/reset-password?token=${plainToken}`,
    });
  }
  return sendMessage(res, 200, 'If the email exists, a reset link has been sent');
});

const resetPassword = catchAsync(async (req, res, next) => {
  const hashedToken = hashToken(req.body.token);
  const user = await User.findOne({
    resetToken: hashedToken,
    resetTokenExpiry: { $gt: new Date() },
  }).select('+resetToken +password');
  if (!user) {
    return next(new AppError('Invalid or expired reset token', 400));
  }
  user.password = await bcrypt.hash(req.body.newPassword, 10);
  user.resetToken = undefined;
  user.resetTokenExpiry = undefined;
  user.refreshToken = undefined;
  await user.save();
  return sendMessage(res, 200, 'Password updated successfully');
});

const activateInvite = catchAsync(async (req, res, next) => {
  const hashedToken = hashToken(req.body.token);
  const user = await User.findOne({
    inviteToken: hashedToken,
    inviteTokenExpiry: { $gt: new Date() },
  }).select('+inviteToken +password');
  if (!user) {
    return next(new AppError('Invalid or expired invitation token', 400));
  }
  user.password = await bcrypt.hash(req.body.password, 10);
  user.status = 'ACTIVE';
  user.inviteToken = undefined;
  user.inviteTokenExpiry = undefined;
  await user.save();
  return sendMessage(res, 200, 'Account activated successfully');
});

const me = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  return sendData(res, 200, user);
});

module.exports = {
  login,
  logout,
  refresh,
  forgotPassword,
  resetPassword,
  activateInvite,
  me,
};
