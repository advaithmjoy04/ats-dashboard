import { createContext, useContext, useEffect, useState } from 'react';
import api, { TENANT_HINT_STORAGE_KEY } from '../api/client';
import { getTenantSlugFromPath } from '../utils/tenantRouting';

const defaultBrand = {
  name: 'ATS Dashboard',
  slug: 'default-institute',
  logoUrl: '',
  faviconUrl: '',
  primaryColor: '#3d79f2',
  secondaryColor: '#18212f',
  loginHeadline: 'Sign In',
  loginSubtext: 'Access your ATS account to manage jobs, applications, and placement activity.',
  supportEmail: '',
};

const TenantContext = createContext({
  tenant: defaultBrand,
  loading: true,
  error: '',
  reloadTenant: async () => {},
});

export function TenantProvider({ children }) {
  const [state, setState] = useState({
    tenant: defaultBrand,
    loading: true,
    error: '',
  });

  function getTenantHint() {
    const pathTenant = getTenantSlugFromPath(window.location.pathname);
    if (pathTenant) {
      localStorage.setItem(TENANT_HINT_STORAGE_KEY, pathTenant);
      return pathTenant;
    }

    const queryTenant = new URLSearchParams(window.location.search).get('tenant') || '';
    if (queryTenant) {
      localStorage.setItem(TENANT_HINT_STORAGE_KEY, queryTenant);
      return queryTenant;
    }

    return localStorage.getItem(TENANT_HINT_STORAGE_KEY) || '';
  }

  async function reloadTenant() {
    const tenantHint = getTenantHint();
    try {
      const response = await api.get('/tenant/public', {
        params: tenantHint ? { tenant: tenantHint } : {},
      });
      setState({
        tenant: { ...defaultBrand, ...response.data },
        loading: false,
        error: '',
      });
    } catch (error) {
      setState({
        tenant: defaultBrand,
        loading: false,
        error: 'Unable to load institute branding.',
      });
    }
  }

  useEffect(() => {
    let ignore = false;

    async function loadTenant() {
      const tenantHint = getTenantHint();
      try {
        const response = await api.get('/tenant/public', {
          params: tenantHint ? { tenant: tenantHint } : {},
        });
        if (!ignore) {
          setState({
            tenant: { ...defaultBrand, ...response.data },
            loading: false,
            error: '',
          });
        }
      } catch (error) {
        if (!ignore) {
          setState({
            tenant: defaultBrand,
            loading: false,
            error: 'Unable to load institute branding.',
          });
        }
      }
    }

    loadTenant();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    const tenant = state.tenant || defaultBrand;
    document.title = tenant.name || defaultBrand.name;
    document.documentElement.style.setProperty('--primary', tenant.primaryColor || defaultBrand.primaryColor);
    document.documentElement.style.setProperty('--text', tenant.secondaryColor || defaultBrand.secondaryColor);

    if (tenant.faviconUrl) {
      let link = document.querySelector("link[rel='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = tenant.faviconUrl;
    }
  }, [state.tenant]);

  return <TenantContext.Provider value={{ ...state, reloadTenant }}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  return useContext(TenantContext);
}
