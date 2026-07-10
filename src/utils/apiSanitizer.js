const REDACTED_KEYS = new Set([
  'password',
  'refreshToken',
  'resetToken',
  'inviteToken',
]);

function sanitizeApiData(value) {
  if (Array.isArray(value)) {
    return value.map(sanitizeApiData);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  if (value instanceof Date) {
    return value;
  }

  if (value.constructor && (value.constructor.name === 'ObjectId' || value.constructor.name === 'ObjectID' || typeof value.toHexString === 'function')) {
    return value;
  }

  const plainObject =
    typeof value.toObject === 'function'
      ? value.toObject()
      : value;

  return Object.entries(plainObject).reduce((accumulator, [key, entryValue]) => {
    if (REDACTED_KEYS.has(key)) {
      return accumulator;
    }

    accumulator[key] = sanitizeApiData(entryValue);
    return accumulator;
  }, {});
}

module.exports = {
  sanitizeApiData,
};
