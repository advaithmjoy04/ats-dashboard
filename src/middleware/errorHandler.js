const AppError = require('../utils/AppError');

module.exports = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal Server Error';

  if (!(err instanceof AppError) && process.env.NODE_ENV !== 'production') {
    console.error(err.message);
  }

  res.status(statusCode).json({
    status: 'error',
    message,
  });
};
