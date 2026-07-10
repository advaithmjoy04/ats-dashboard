import { createContext, useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api, { TENANT_HINT_STORAGE_KEY } from '../api/client';
import { getTenantSlugFromPath } from '../utils/tenantRouting';

const defaultBrand = {
  name: 'ATS Dashboard',
  slug: 'default-institute',
  logoUrl: '',
  faviconUrl: '',
  primaryColor: '#F9930C',
  secondaryColor: '#F5EEE1',
  loginHeadline: 'Sign In',
  loginSubtext: 'Access your ATS account to manage jobs, applications, and placement activity.',
  supportEmail: '',
};

function isDarkColor(hex) {
  if (!hex || hex[0] !== '#') return true;
  const color = hex.substring(1);
  let r, g, b;
  if (color.length === 3) {
    r = parseInt(color[0] + color[0], 16);
    g = parseInt(color[1] + color[1], 16);
    b = parseInt(color[2] + color[2], 16);
  } else if (color.length === 6) {
    r = parseInt(color.substring(0, 2), 16);
    g = parseInt(color.substring(2, 4), 16);
    b = parseInt(color.substring(4, 6), 16);
  } else {
    return true;
  }
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luma < 120;
}

const TenantContext = createContext({
  tenant: defaultBrand,
  loading: true,
  error: '',
  reloadTenant: async () => {},
});

export function TenantProvider({ children }) {
  const location = useLocation();
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
    const isPlatformPath = location.pathname.startsWith('/platform');

    if (isPlatformPath) {
      document.title = 'Platform Console';
      document.documentElement.style.setProperty('--primary', '#F9930C');
      document.documentElement.style.setProperty('--text', '#F5EEE1');

      let link = document.querySelector("link[rel='icon']");
      if (link) {
        link.href = '/favicon.ico';
      }
      return;
    }

    document.title = tenant.name || defaultBrand.name;
    document.documentElement.style.setProperty('--primary', tenant.primaryColor || defaultBrand.primaryColor);
    
    let textCol = tenant.secondaryColor || defaultBrand.secondaryColor;
    if (isDarkColor(textCol)) {
      textCol = '#F5EEE1';
    }
    document.documentElement.style.setProperty('--text', textCol);

    if (tenant.faviconUrl) {
      let link = document.querySelector("link[rel='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = tenant.faviconUrl;
    } else {
      let link = document.querySelector("link[rel='icon']");
      if (link) {
        link.href = '/favicon.ico';
      }
    }
  }, [state.tenant, location.pathname]);

  return <TenantContext.Provider value={{ ...state, reloadTenant }}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  return useContext(TenantContext);
}
