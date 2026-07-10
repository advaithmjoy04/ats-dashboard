const AppError = require('./AppError');

const PASSWORD_VALIDATION_MESSAGE =
  'Password must be at least 8 characters long and include at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character.';

const PASSWORD_RULES = [
  (password) => String(password || '').length >= 8,
  (password) => /[A-Z]/.test(String(password || '')),
  (password) => /[a-z]/.test(String(password || '')),
  (password) => /\d/.test(String(password || '')),
  (password) => /[^A-Za-z0-9]/.test(String(password || '')),
];

function isStrongPassword(password) {
  return PASSWORD_RULES.every((rule) => rule(password));
}

function assertValidPassword(password, fieldLabel = 'Password') {
  if (!isStrongPassword(password)) {
    throw new AppError(`${fieldLabel} must be at least 8 characters long and include at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character.`, 400);
  }
}

module.exports = {
  PASSWORD_VALIDATION_MESSAGE,
  isStrongPassword,
  assertValidPassword,
};
