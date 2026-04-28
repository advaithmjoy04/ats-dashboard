const AppError = require('../utils/AppError');
const config = require('../config');
const { isPrivateIpv4Host, normalizeHost, resolveActiveTenantBySlug, resolveTenantFromHost } = require('../services/tenantService');

module.exports = async function resolveTenant(req, res, next) {
  try {
    const host = normalizeHost(req.headers['x-forwarded-host'] || req.headers.host);
    const hintedSlug = normalizeHost(req.headers['x-tenant-slug'] || req.query?.tenant || '');
    const platformScopeHint = String(req.headers['x-platform-scope'] || '').trim().toLowerCase() === 'true';
    const platformPathRequest = req.path.startsWith('/api/v1/platform');
    const allowPlatformBypass = platformScopeHint || platformPathRequest;
    let tenant = await resolveTenantFromHost(host, {
      nodeEnv: config.nodeEnv,
      appBaseDomain: config.appBaseDomain,
    });

    const isSharedHost =
      !host || host === 'localhost' || host === '127.0.0.1' || isPrivateIpv4Host(host) || host.endsWith('.vercel.app');
    if (hintedSlug && isSharedHost) {
      const hintedTenant = await resolveActiveTenantBySlug(hintedSlug);
      if (hintedTenant) {
        tenant = hintedTenant;
      }
    }

    if (!tenant && isSharedHost && allowPlatformBypass) {
      req.tenant = null;
      req.platformScopeHint = true;
      return next();
    }

    if (!tenant) {
      return next(new AppError('Unknown institute host', 404));
    }

    req.tenant = {
      id: tenant._id.toString(),
      slug: tenant.slug,
      name: tenant.name,
      isActive: tenant.isActive,
    };
    req.platformScopeHint = platformScopeHint;

    return next();
  } catch (error) {
    return next(error);
  }
};
