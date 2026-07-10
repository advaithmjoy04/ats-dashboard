import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PasswordInput from '../components/PasswordInput';
import PasswordRequirements from '../components/PasswordRequirements';
import { useAuth } from '../state/AuthContext';
import { useTenant } from '../state/TenantContext';
import { getHomeRoute } from '../utils/routing';
import { getConfirmPasswordError, isPasswordValid } from '../utils/passwordValidation';

function ForcePasswordChangePage() {
  const { tenant } = useTenant();
  const { user, forcePasswordChange } = useAuth();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordRules, setShowPasswordRules] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const confirmError = getConfirmPasswordError(newPassword, confirmPassword);

  const canSubmit = useMemo(
    () => isPasswordValid(newPassword) && newPassword === confirmPassword,
    [newPassword, confirmPassword]
  );

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      const nextUser = await forcePasswordChange(newPassword);
      setMessage('Password changed successfully.');
      setTimeout(() => {
        navigate(getHomeRoute(nextUser.role), { replace: true });
      }, 800);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="brand-mark">{tenant.logoUrl ? <img src={tenant.logoUrl} alt={tenant.name} className="brand-logo" /> : tenant.name}</div>
        <h1>Change Temporary Password</h1>
        <p>{user?.username ? `Signed in as ${user.username}.` : 'You must change your temporary password before continuing.'}</p>
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
            {submitting ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ForcePasswordChangePage;
