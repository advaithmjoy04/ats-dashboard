import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
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
  const [showPassword, setShowPassword] = useState(false);
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
      <div className="login-card">
        <div className="brand-mark">{tenant.logoUrl ? <img src={tenant.logoUrl} alt={tenant.name} className="brand-logo" /> : tenant.name}</div>
        <h1>{tenant.loginHeadline || 'Sign In'}</h1>
        <p>{tenant.loginSubtext || 'Access your ATS account to manage jobs, applications, and placement activity.'}</p>
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
          <label>
            Password
            <div className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>
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
