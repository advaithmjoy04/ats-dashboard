import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { useTenant } from '../state/TenantContext';
import { getTenantAwarePath } from '../utils/tenantRouting';

function ActivationPage() {
  const { tenant } = useTenant();
  const { tenantSlug } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const tenantHint = tenantSlug || params.get('tenant') || tenant.slug || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const passwordError = password && password.length < 8 ? 'Password must be at least 8 characters.' : '';
  const confirmError = confirmPassword && password !== confirmPassword ? 'Passwords do not match.' : '';

  const canSubmit = useMemo(
    () => token && password.length >= 8 && password === confirmPassword,
    [token, password, confirmPassword]
  );

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    setError('');
    try {
      const response = await api.post('/auth/activate', { token, password, tenant: tenantHint || undefined });
      setMessage(response.data || 'Account activated successfully. You can sign in now.');
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        navigate(tenantHint ? getTenantAwarePath(tenantHint, '/login') : '/login', { replace: true });
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to activate account.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="brand-mark">{tenant.logoUrl ? <img src={tenant.logoUrl} alt={tenant.name} className="brand-logo" /> : tenant.name}</div>
        <h1>Activate Account</h1>
        <p>Set your password to activate your account and sign in to the workspace.</p>
        {!token ? <div className="error-banner">This activation link is invalid or missing a token.</div> : null}
        {message ? <div className="success-banner">{message}</div> : null}
        {error ? <div className="error-banner">{error}</div> : null}
        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            New password
            <div className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimum 8 characters"
                minLength={8}
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
            {passwordError ? <small className="field-error">{passwordError}</small> : null}
          </label>
          <label>
            Confirm password
            <div className="password-field">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Re-enter your password"
                minLength={8}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword((current) => !current)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {confirmError ? <small className="field-error">{confirmError}</small> : null}
          </label>
          <button type="submit" className="primary-button" disabled={!canSubmit || submitting}>
            {submitting ? 'Activating...' : 'Activate Account'}
          </button>
        </form>
        <p className="activation-footer">
          Already activated? <Link to={tenantHint ? getTenantAwarePath(tenantHint, '/login') : '/login'}>Go to sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default ActivationPage;
