import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import PasswordInput from '../components/PasswordInput';
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
      <div className="hero-glows" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(249, 147, 12, 0.08) 0%, rgba(0,0,0,0) 70%)', filter: 'blur(80px)' }}></div>
        <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(30, 164, 92, 0.08) 0%, rgba(0,0,0,0) 70%)', filter: 'blur(80px)' }}></div>
      </div>
      <div className="login-card platform-login-card">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <svg viewBox="0 0 220 230" width="34" height="35" style={{ flexShrink: 0 }}>
              <path d="M86 56 C 132 50 168 84 168 128 C 168 166 140 192 102 190 C 64 188 40 158 44 118 C 47 84 60 60 86 56 Z" fill="#F9930C" />
              <path d="M92 56 C 90 44 92 34 100 28" stroke="#C2620E" strokeWidth="8" strokeLinecap="round" fill="none" />
              <path d="M92 56 C 96 34 84 16 60 14 C 64 36 76 50 92 56 Z" fill="#1EA45C" />
              <ellipse cx="120" cy="98" rx="9" ry="16" fill="#FFC24B" transform="rotate(-28 120 98)" />
            </svg>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', textTransform: 'none' }}>MNGO</span>
          </div>
          <div className="platform-badge" style={{ margin: 0 }}>Platform Console</div>
        </div>
        <h1 style={{ textAlign: 'center' }}>Super Admin Login</h1>
        <p style={{ textAlign: 'center' }}>Manage institutes, provisioning, domains, and tenant-level security from a separate control plane.</p>
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
          <PasswordInput
            label="Password"
            value={form.password}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />
          {error ? <div className="error-banner">{error}</div> : null}
          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign in to Platform'}
          </button>
        </form>
        <p className="activation-footer" style={{ textAlign: 'center' }}>
          Institute admin? <Link to={getTenantAwarePath('default-institute', '/login')} className="text-button auth-link">Use institute login</Link>
        </p>
      </div>
    </div>
  );
}

export default PlatformLoginPage;
