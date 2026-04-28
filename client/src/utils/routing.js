export function getHomeRoute(role) {
  if (role === 'PLATFORM_SUPER_ADMIN') {
    return '/platform/dashboard';
  }
  if (role === 'RECRUITER') {
    return '/recruiter/dashboard';
  }
  if (role === 'STUDENT') {
    return '/student/dashboard';
  }
  return '/admin/dashboard';
}

export function getForcedPasswordRoute(role) {
  if (role === 'PLATFORM_SUPER_ADMIN') {
    return '/platform/force-password-change';
  }
  return '/force-password-change';
}
