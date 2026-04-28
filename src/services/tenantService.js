const { Tenant } = require('../models');

let cachedDefaultTenantId = null;

function slugifyTenantName(name) {
  return String(name || 'default-tenant')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'default-tenant';
}

async function getOrCreateDefaultTenant() {
  if (cachedDefaultTenantId) {
    const cachedTenant = await Tenant.findById(cachedDefaultTenantId);
    if (cachedTenant) {
      return cachedTenant;
    }
  }

  const configuredName = process.env.DEFAULT_TENANT_NAME || 'Default Institute';
  const slug = process.env.DEFAULT_TENANT_SLUG || slugifyTenantName(configuredName);

  let tenant = await Tenant.findOne({ slug });
  if (!tenant) {
    tenant = await Tenant.create({
      name: configuredName,
      slug,
      supportEmail: process.env.SMTP_USER || undefined,
      emailFromName: 'ATS Platform',
      loginHeadline: 'Sign in to your placement workspace',
      loginSubtext: 'Manage jobs, applications, and institute placement workflows.',
      subdomain: process.env.DEFAULT_TENANT_SUBDOMAIN || undefined,
      customDomain: process.env.DEFAULT_TENANT_DOMAIN || undefined,
      isActive: true,
    });
  }

  cachedDefaultTenantId = tenant._id.toString();
  return tenant;
}

async function getDefaultTenantId() {
  const tenant = await getOrCreateDefaultTenant();
  return tenant._id;
}

async function resolveActiveTenantBySlug(slug) {
  const normalizedSlug = slugifyTenantName(slug);
  if (!normalizedSlug) {
    return null;
  }

  return Tenant.findOne({ slug: normalizedSlug, isActive: true });
}

function normalizeHost(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, '');
}

function isPrivateIpv4Host(host) {
  return /^(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})$/.test(
    String(host || '').trim().toLowerCase()
  );
}

function normalizeOrigin(value) {
  try {
    return new URL(String(value || '').trim()).origin.toLowerCase();
  } catch (error) {
    return '';
  }
}

function isLocalHost(host) {
  return !host || host === 'localhost' || host === '127.0.0.1' || isPrivateIpv4Host(host);
}

function isSharedHost(host, { frontendOrigin = process.env.FRONTEND_ORIGIN || '' } = {}) {
  const normalizedHost = normalizeHost(host);
  if (isLocalHost(normalizedHost) || normalizedHost.endsWith('.vercel.app')) {
    return true;
  }

  if (frontendOrigin) {
    try {
      return normalizedHost === new URL(frontendOrigin).hostname.toLowerCase();
    } catch (error) {
      return false;
    }
  }

  return false;
}

function getConfiguredSharedHosts() {
  const hosts = new Set();

  if (process.env.FRONTEND_ORIGIN) {
    try {
      hosts.add(new URL(process.env.FRONTEND_ORIGIN).hostname.toLowerCase());
    } catch (error) {
      // ignore invalid config here; startup validation lives elsewhere
    }
  }

  for (const value of String(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)) {
    try {
      hosts.add(new URL(value).hostname.toLowerCase());
    } catch (error) {
      // ignore malformed origin entries for host matching fallback
    }
  }

  return hosts;
}

function getSubdomainLabel(host, appBaseDomain) {
  const normalizedBase = normalizeHost(appBaseDomain);
  if (!normalizedBase) {
    return '';
  }

  if (host === normalizedBase) {
    return '';
  }

  if (!host.endsWith(`.${normalizedBase}`)) {
    return '';
  }

  return host.slice(0, -(`.${normalizedBase}`.length));
}

async function resolveTenantFromHost(host, { nodeEnv = process.env.NODE_ENV || 'development', appBaseDomain = process.env.APP_BASE_DOMAIN || '' } = {}) {
  const normalizedHost = normalizeHost(host);

  if (isLocalHost(normalizedHost)) {
    return getOrCreateDefaultTenant();
  }

  const sharedHosts = getConfiguredSharedHosts();
  if (sharedHosts.has(normalizedHost) || normalizedHost.endsWith('.vercel.app')) {
    return getOrCreateDefaultTenant();
  }

  let tenant = await Tenant.findOne({ isActive: true, customDomain: normalizedHost });
  if (tenant) {
    return tenant;
  }

  const subdomain = getSubdomainLabel(normalizedHost, appBaseDomain);
  if (subdomain) {
    tenant = await Tenant.findOne({ isActive: true, subdomain });
    if (tenant) {
      return tenant;
    }
  }

  if (nodeEnv === 'production') {
    return null;
  }

  return getOrCreateDefaultTenant();
}

function originMatchesTenant(
  origin,
  tenant,
  {
    frontendOrigin = process.env.FRONTEND_ORIGIN || '',
    appBaseDomain = process.env.APP_BASE_DOMAIN || '',
    nodeEnv = process.env.NODE_ENV || 'development',
  } = {}
) {
  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) {
    return false;
  }

  const allowedOrigins = new Set(
    String(process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .map((item) => normalizeOrigin(item))
      .filter(Boolean)
  );

  if (allowedOrigins.has(normalizedOrigin)) {
    return true;
  }

  const originHost = normalizeHost(new URL(normalizedOrigin).hostname);
  const sharedHost = frontendOrigin ? normalizeHost(new URL(frontendOrigin).hostname) : '';
  if (sharedHost && originHost === sharedHost) {
    return true;
  }

  const normalizedNodeEnv = String(nodeEnv || 'development').trim().toLowerCase();

  if (normalizedNodeEnv !== 'production' && isPrivateIpv4Host(originHost)) {
    return true;
  }

  if (tenant?.customDomain && originHost === normalizeHost(tenant.customDomain)) {
    return true;
  }

  const tenantAllowedOrigins = Array.isArray(tenant?.allowedOrigins)
    ? tenant.allowedOrigins.map((item) => normalizeOrigin(item)).filter(Boolean)
    : [];
  if (tenantAllowedOrigins.includes(normalizedOrigin)) {
    return true;
  }

  const subdomain = getSubdomainLabel(originHost, appBaseDomain);
  if (tenant?.subdomain && subdomain === tenant.subdomain) {
    return true;
  }

  return false;
}

function ensureUrlPath(pathname = '/') {
  const nextPath = String(pathname || '/').trim();
  if (!nextPath) {
    return '/';
  }
  return nextPath.startsWith('/') ? nextPath : `/${nextPath}`;
}

function ensureTenantSharedPath(tenant, pathname = '/') {
  const nextPath = ensureUrlPath(pathname);
  if (!tenant?.slug) {
    return nextPath;
  }

  if (nextPath.startsWith(`/t/${tenant.slug}/`)) {
    return nextPath;
  }

  return `/t/${tenant.slug}${nextPath}`;
}

function buildTenantAppOrigin(tenant, { frontendOrigin = process.env.FRONTEND_ORIGIN || '', appBaseDomain = process.env.APP_BASE_DOMAIN || '' } = {}) {
  if (tenant?.customDomain) {
    return `https://${normalizeHost(tenant.customDomain)}`;
  }

  if (tenant?.subdomain && appBaseDomain) {
    return `https://${tenant.subdomain}.${normalizeHost(appBaseDomain)}`;
  }

  const sharedOrigin = normalizeOrigin(frontendOrigin);
  return sharedOrigin || '';
}

function buildTenantAppUrl(tenant, pathname = '/', { frontendOrigin = process.env.FRONTEND_ORIGIN || '', appBaseDomain = process.env.APP_BASE_DOMAIN || '', query = {} } = {}) {
  const baseOrigin = buildTenantAppOrigin(tenant, { frontendOrigin, appBaseDomain });
  if (!baseOrigin) {
    return '';
  }

  const usingSharedOrigin = !tenant?.customDomain && !(tenant?.subdomain && appBaseDomain);
  const resolvedPath = usingSharedOrigin
    ? ensureTenantSharedPath(tenant, pathname)
    : ensureUrlPath(pathname);

  const url = new URL(resolvedPath, `${baseOrigin}/`);

  for (const [key, value] of Object.entries(query || {})) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

module.exports = {
  getOrCreateDefaultTenant,
  getDefaultTenantId,
  resolveActiveTenantBySlug,
  slugifyTenantName,
  normalizeHost,
  isPrivateIpv4Host,
  resolveTenantFromHost,
  originMatchesTenant,
  buildTenantAppOrigin,
  buildTenantAppUrl,
  isSharedHost,
};
