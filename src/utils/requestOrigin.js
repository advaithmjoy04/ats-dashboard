function normalizeOriginCandidate(value) {
  try {
    return new URL(String(value || '').trim()).origin;
  } catch (error) {
    return '';
  }
}

function getRequestOrigin(req, options = {}) {
  const configuredFrontendOrigin = String(options.frontendOrigin || '').trim();
  const nodeEnv = String(options.nodeEnv || process.env.NODE_ENV || 'development').trim().toLowerCase();
  const originHeader = Array.isArray(req.headers.origin) ? req.headers.origin[0] : req.headers.origin;
  const refererHeader = Array.isArray(req.headers.referer) ? req.headers.referer[0] : req.headers.referer;
  const browserOrigin = normalizeOriginCandidate(originHeader) || normalizeOriginCandidate(refererHeader);

  if (browserOrigin) {
    return browserOrigin;
  }

  if (configuredFrontendOrigin && nodeEnv === 'production') {
    return configuredFrontendOrigin;
  }

  const forwardedProto = req.headers['x-forwarded-proto'];
  const forwardedHost = req.headers['x-forwarded-host'];
  const protocol = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto || req.protocol || 'https';
  const host = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost || req.get('host');

  if (host) {
    return `${protocol}://${host}`;
  }

  return configuredFrontendOrigin || '';
}

module.exports = {
  getRequestOrigin,
};
