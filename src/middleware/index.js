module.exports = {
  authenticateToken: require('./auth'),
  requireRole: require('./requireRole'),
  admin: require('./admin'),
  recruiter: require('./recruiter'),
  student: require('./student'),
  validate: require('./validate'),
  errorHandler: require('./errorHandler'),
};
