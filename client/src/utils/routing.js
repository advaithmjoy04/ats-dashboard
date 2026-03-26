export function getHomeRoute(role) {
  if (role === 'RECRUITER') {
    return '/recruiter/dashboard';
  }
  if (role === 'STUDENT') {
    return '/student/dashboard';
  }
  return '/admin/dashboard';
}
