const AppError = require('./AppError');

function isPlatformSuperAdmin(user) {
  return user?.role === 'PLATFORM_SUPER_ADMIN';
}

function getRequestTenantId(req, { allowPlatformSuperAdmin = true } = {}) {
  if (!req?.user) {
    throw new AppError('Authentication required', 401);
  }

  if (isPlatformSuperAdmin(req.user)) {
    if (allowPlatformSuperAdmin) {
      return null;
    }
    throw new AppError('Tenant context required', 403);
  }

  if (!req.user.tenantId) {
    throw new AppError('Tenant context missing for authenticated user', 403);
  }

  return req.user.tenantId;
}

function withTenantScope(req, query = {}, tenantField = 'tenantId', options = {}) {
  const tenantId = getRequestTenantId(req, options);
  if (!tenantId) {
    return { ...query };
  }
  return {
    ...query,
    [tenantField]: tenantId,
  };
}

module.exports = {
  isPlatformSuperAdmin,
  getRequestTenantId,
  withTenantScope,
};
