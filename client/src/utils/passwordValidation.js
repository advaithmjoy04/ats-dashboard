export const PASSWORD_REQUIREMENTS = [
  {
    key: 'length',
    label: 'Minimum 8 characters',
    test: (password) => String(password || '').length >= 8,
  },
  {
    key: 'uppercase',
    label: 'At least 1 uppercase letter',
    test: (password) => /[A-Z]/.test(String(password || '')),
  },
  {
    key: 'lowercase',
    label: 'At least 1 lowercase letter',
    test: (password) => /[a-z]/.test(String(password || '')),
  },
  {
    key: 'number',
    label: 'At least 1 number',
    test: (password) => /\d/.test(String(password || '')),
  },
  {
    key: 'special',
    label: 'At least 1 special character',
    test: (password) => /[^A-Za-z0-9]/.test(String(password || '')),
  },
];

export const PASSWORD_VALIDATION_MESSAGE =
  'Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.';

export function getPasswordRuleState(password) {
  return PASSWORD_REQUIREMENTS.map((rule) => ({
    ...rule,
    valid: rule.test(password),
  }));
}

export function isPasswordValid(password) {
  return PASSWORD_REQUIREMENTS.every((rule) => rule.test(password));
}

export function getPasswordValidationMessage(password) {
  return isPasswordValid(password) ? '' : PASSWORD_VALIDATION_MESSAGE;
}

export function getConfirmPasswordError(password, confirmPassword) {
  if (!confirmPassword) {
    return '';
  }

  return password === confirmPassword ? '' : 'Passwords do not match.';
}
