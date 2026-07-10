import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import PasswordInput from '../components/PasswordInput';
import PasswordRequirements from '../components/PasswordRequirements';
import { useTenant } from '../state/TenantContext';
import { getTenantAwarePath } from '../utils/tenantRouting';
import { getConfirmPasswordError, isPasswordValid } from '../utils/passwordValidation';

function ActivationPage() {
  const { tenant } = useTenant();
  const { tenantSlug } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const tenantHint = tenantSlug || params.get('tenant') || tenant.slug || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordRules, setShowPasswordRules] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const confirmError = getConfirmPasswordError(password, confirmPassword);

  const canSubmit = useMemo(
    () => token && isPasswordValid(password) && password === confirmPassword,
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
          <div className="full-width password-group">
            <PasswordInput
              label="New password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onFocus={() => setShowPasswordRules(true)}
              onBlur={() => setShowPasswordRules(Boolean(password))}
              placeholder="Create a strong password"
              autoComplete="new-password"
              required
            />
            <PasswordRequirements password={password} visible={showPasswordRules || Boolean(password)} />
          </div>
          <PasswordInput
            label="Confirm password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Re-enter your password"
            autoComplete="new-password"
            required
            error={confirmError}
          />
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
