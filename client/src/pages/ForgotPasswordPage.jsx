import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { useTenant } from '../state/TenantContext';
import { getTenantAwarePath } from '../utils/tenantRouting';

function ForgotPasswordPage() {
  const { tenant } = useTenant();
  const { tenantSlug } = useParams();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const tenantHint = useMemo(() => tenantSlug || params.get('tenant') || tenant.slug || '', [tenantSlug, params, tenant.slug]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    setError('');
    try {
      const response = await api.post('/auth/forgot-password', { email, tenant: tenantHint || undefined });
      setMessage(response.data || 'If the email exists, a reset link has been sent.');
      setEmail('');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to send password reset email.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="brand-mark">{tenant.logoUrl ? <img src={tenant.logoUrl} alt={tenant.name} className="brand-logo" /> : tenant.name}</div>
        <h1>Forgot Password</h1>
        <p>Enter your email address and we will send you a password reset link.</p>
        {message ? <div className="success-banner">{message}</div> : null}
        {error ? <div className="error-banner">{error}</div> : null}
        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>
          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
        <p className="activation-footer">
          Remembered it? <Link to={tenantHint ? getTenantAwarePath(tenantHint, '/login') : '/login'}>Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
