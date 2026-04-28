const rateLimit = require('express-rate-limit');

function createLimiter({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message },
  });
}

const strictAuthLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: 'Too many authentication attempts. Please try again later.',
});

const tokenActionLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many token attempts. Please try again later.',
});

const inviteActionLimiter = createLimiter({
  windowMs: 10 * 60 * 1000,
  max: 12,
  message: 'Too many invitation attempts. Please try again later.',
});

const uploadActionLimiter = createLimiter({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: 'Too many upload attempts. Please try again later.',
});

module.exports = {
  strictAuthLimiter,
  tokenActionLimiter,
  inviteActionLimiter,
  uploadActionLimiter,
};
