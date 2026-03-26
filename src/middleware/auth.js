const { User } = require('../models');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { verifyAccessToken } = require('../utils/jwt');

const authenticateToken = catchAsync(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return next(new AppError('Authentication required', 401));
  }

  const payload = verifyAccessToken(token);
  const user = await User.findById(payload.id).select('+password +refreshToken +resetToken +inviteToken');

  if (!user || user.status !== 'ACTIVE') {
    return next(new AppError('User not authorized', 401));
  }

  req.user = {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    fullName: user.fullName,
    status: user.status,
  };

  return next();
});

module.exports = authenticateToken;
