export function getTenantSlugFromPath(pathname = '') {
  const match = String(pathname || '').match(/^\/t\/([^/]+)(?:\/|$)/i);
  return match ? decodeURIComponent(match[1]).trim().toLowerCase() : '';
}

export function getTenantAwarePath(slug, pathname = '/login') {
  const normalizedSlug = String(slug || '').trim().toLowerCase();
  const normalizedPath = String(pathname || '/login').startsWith('/')
    ? String(pathname || '/login')
    : `/${String(pathname || 'login')}`;

  if (!normalizedSlug) {
    return normalizedPath;
  }

  return `/t/${encodeURIComponent(normalizedSlug)}${normalizedPath}`;
}

