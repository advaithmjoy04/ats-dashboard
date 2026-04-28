import axios from 'axios';

export const TENANT_HINT_STORAGE_KEY = 'ats_tenant_hint';
const TOKEN_STORAGE_KEY = 'ats_token';
const ROLE_STORAGE_KEY = 'ats_user_role';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  const tenantHint = localStorage.getItem(TENANT_HINT_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (tenantHint) {
    config.headers['X-Tenant-Slug'] = tenantHint;
  }
  return config;
});

api.interceptors.response.use((response) => {
  if (response?.data?.data !== undefined) {
    return { ...response, data: response.data.data };
  }
  if (typeof response?.data?.message === 'string') {
    return { ...response, data: response.data.message };
  }
  return response;
}, (error) => {
  const status = error?.response?.status;

  if (status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(ROLE_STORAGE_KEY);

    const currentPath = window.location.pathname || '/';
    const currentSearch = window.location.search || '';
    const currentHash = window.location.hash || '';
    const isPlatformPath = currentPath.startsWith('/platform');
    const loginPath = isPlatformPath ? '/platform/login' : '/login';
    const currentTarget = `${currentPath}${currentSearch}${currentHash}`;

    if (currentPath !== loginPath) {
      const redirectUrl = `${loginPath}?from=${encodeURIComponent(currentTarget)}`;
      window.location.replace(redirectUrl);
    }
  }

  return Promise.reject(error);
});

export default api;
