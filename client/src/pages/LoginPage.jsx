import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import PasswordInput from '../components/PasswordInput';
import { useTenant } from '../state/TenantContext';
import { getForcedPasswordRoute, getHomeRoute } from '../utils/routing';
import { getTenantAwarePath } from '../utils/tenantRouting';

function LoginPage() {
  const { login } = useAuth();
  const { tenant } = useTenant();
  const { tenantSlug } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const activationToken = params.get('activateToken');
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const tenantHint = useMemo(() => tenantSlug || params.get('tenant') || tenant.slug || '', [tenantSlug, params, tenant.slug]);

  useEffect(() => {
    if (!activationToken) return;
    navigate(`/activate?token=${encodeURIComponent(activationToken)}`, { replace: true });
  }, [activationToken, navigate]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const user = await login({ ...form, tenant: tenantHint || undefined });
      if (user.forcePasswordChange) {
        navigate(getForcedPasswordRoute(user.role), { replace: true });
        return;
      }
      navigate(location.state?.from?.pathname || getHomeRoute(user.role), { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="hero-glows" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(249, 147, 12, 0.08) 0%, rgba(0,0,0,0) 70%)', filter: 'blur(80px)' }}></div>
        <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(30, 164, 92, 0.08) 0%, rgba(0,0,0,0) 70%)', filter: 'blur(80px)' }}></div>
      </div>
      <div className="login-card">
        <div className="brand-mark" style={{ textAlign: 'center' }}>
          {tenant.logoUrl ? (
            <img src={tenant.logoUrl} alt={tenant.name} className="brand-logo" />
          ) : tenant.slug === 'default-institute' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
              <svg viewBox="0 0 220 230" width="34" height="35" style={{ flexShrink: 0 }}>
                <path d="M86 56 C 132 50 168 84 168 128 C 168 166 140 192 102 190 C 64 188 40 158 44 118 C 47 84 60 60 86 56 Z" fill="#F9930C" />
                <path d="M92 56 C 90 44 92 34 100 28" stroke="#C2620E" strokeWidth="8" strokeLinecap="round" fill="none" />
                <path d="M92 56 C 96 34 84 16 60 14 C 64 36 76 50 92 56 Z" fill="#1EA45C" />
                <ellipse cx="120" cy="98" rx="9" ry="16" fill="#FFC24B" transform="rotate(-28 120 98)" />
              </svg>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', textTransform: 'none' }}>MNGO</span>
            </div>
          ) : (
            tenant.name
          )}
        </div>
        <h1 style={{ textAlign: 'center' }}>{tenant.loginHeadline || 'Sign In'}</h1>
        <p style={{ textAlign: 'center' }}>{tenant.loginSubtext || 'Access your ATS account to manage jobs, applications, and placement activity.'}</p>
        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Email or username
            <input
              type="text"
              value={form.identifier}
              onChange={(event) => setForm((current) => ({ ...current, identifier: event.target.value }))}
              placeholder="you@example.com or username"
              required
            />
          </label>
          <PasswordInput
            label="Password"
            value={form.password}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />
          {error ? <div className="error-banner">{error}</div> : null}
          <div className="auth-helper-row">
            <Link to={tenantHint ? getTenantAwarePath(tenantHint, '/forgot-password') : '/forgot-password'} className="text-button auth-link">
              Forgot password?
            </Link>
          </div>
          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
