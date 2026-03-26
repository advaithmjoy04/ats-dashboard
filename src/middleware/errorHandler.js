const AppError = require('../utils/AppError');

module.exports = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal Server Error';
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
