import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import { getForcedPasswordRoute } from '../utils/routing';
import { getTenantAwarePath } from '../utils/tenantRouting';

function PlatformLoginPage() {
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const user = await login({ ...form, scope: 'platform' });
      if (user.role !== 'PLATFORM_SUPER_ADMIN') {
        logout();
        setError('This login is only for platform super admins.');
        return;
      }
      if (user.forcePasswordChange) {
        navigate(getForcedPasswordRoute(user.role), { replace: true });
        return;
      }
      navigate(location.state?.from?.pathname || '/platform/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page platform-login-page">
      <div className="login-card platform-login-card">
        <div className="platform-badge">Platform Console</div>
        <h1>Super Admin Login</h1>
        <p>Manage institutes, provisioning, domains, and tenant-level security from a separate control plane.</p>
        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Email or username
            <input
              type="text"
              value={form.identifier}
              onChange={(event) => setForm((current) => ({ ...current, identifier: event.target.value }))}
              placeholder="platform-admin@example.com or username"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              placeholder="Enter your password"
              required
            />
          </label>
          {error ? <div className="error-banner">{error}</div> : null}
          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign in to Platform'}
          </button>
        </form>
        <p className="activation-footer">
          Institute admin? <Link to={getTenantAwarePath('default-institute', '/login')} className="text-button auth-link">Use institute login</Link>
        </p>
      </div>
    </div>
  );
}

export default PlatformLoginPage;
