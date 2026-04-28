const AppError = require('../utils/AppError');

module.exports = (req, res, next) => {
  if (!req.user || req.user.role !== 'PLATFORM_SUPER_ADMIN') {
    return next(new AppError('Platform admin access required', 403));
  }
  return next();
};
