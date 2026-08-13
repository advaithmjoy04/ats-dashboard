const AppError = require('../utils/AppError');

module.exports = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || (err.isOperational ? err.message : 'Internal Server Error');

  if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
    statusCode = 401;
    err.isOperational = true;
    message = err.name === 'TokenExpiredError' ? 'Access token expired' : 'Invalid access token';
  }
  const logParts = [
    `[${new Date().toISOString()}]`,
    req?.method || 'UNKNOWN',
    req?.originalUrl || req?.url || 'unknown-url',
    `status=${statusCode}`,
    err?.name || 'Error',
    err?.message || 'No message',
  ];
  console.error(logParts.join(' | '));
  if (err?.stack) {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    status: 'error',
    message,
  });
};
