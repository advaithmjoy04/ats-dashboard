import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import PasswordInput from '../components/PasswordInput';
import PasswordRequirements from '../components/PasswordRequirements';
import { useTenant } from '../state/TenantContext';
import { getTenantAwarePath } from '../utils/tenantRouting';
import { getConfirmPasswordError, isPasswordValid } from '../utils/passwordValidation';

function ResetPasswordPage() {
  const { tenant } = useTenant();
  const { tenantSlug } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const tenantHint = tenantSlug || params.get('tenant') || tenant.slug || '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordRules, setShowPasswordRules] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const confirmError = getConfirmPasswordError(newPassword, confirmPassword);

  const canSubmit = useMemo(
    () => token && isPasswordValid(newPassword) && newPassword === confirmPassword,
    [token, newPassword, confirmPassword]
  );

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    setError('');
    try {
      const response = await api.post('/auth/reset-password', { token, newPassword, tenant: tenantHint || undefined });
      setMessage(response.data || 'Password updated successfully.');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        navigate(tenantHint ? getTenantAwarePath(tenantHint, '/login') : '/login', { replace: true });
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to reset password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="brand-mark">{tenant.logoUrl ? <img src={tenant.logoUrl} alt={tenant.name} className="brand-logo" /> : tenant.name}</div>
        <h1>Reset Password</h1>
        <p>Create a new password for your account.</p>
        {!token ? <div className="error-banner">This password reset link is invalid or missing a token.</div> : null}
        {message ? <div className="success-banner">{message}</div> : null}
        {error ? <div className="error-banner">{error}</div> : null}
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="full-width password-group">
            <PasswordInput
              label="New password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              onFocus={() => setShowPasswordRules(true)}
              onBlur={() => setShowPasswordRules(Boolean(newPassword))}
              placeholder="Create a strong password"
              autoComplete="new-password"
              required
            />
            <PasswordRequirements password={newPassword} visible={showPasswordRules || Boolean(newPassword)} />
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
            {submitting ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
        <p className="activation-footer">
          Back to <Link to={tenantHint ? getTenantAwarePath(tenantHint, '/login') : '/login'}>sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
