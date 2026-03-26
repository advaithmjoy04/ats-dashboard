import { useState } from 'react';
import api from '../api/client';

function PlaceholderPage({ title, description, showTestEmail = false }) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    setError('');
    try {
      const response = await api.post('/admin/test-email', { email });
      setMessage(response.data || `Test email sent to ${email}`);
      setEmail('');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to send test email.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="panel placeholder-page">
        <h2>{title}</h2>
        <p>{description}</p>
      </section>
      {showTestEmail ? (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Send Test Email</h2>
              <span>Check whether Gmail SMTP is working before sending real invites.</span>
            </div>
          </div>
          {message ? <div className="success-banner">{message}</div> : null}
          {error ? <div className="error-banner">{error}</div> : null}
          <form className="job-form" onSubmit={handleSubmit}>
            <label className="full-width">
              Test email address
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
              />
            </label>
            <button type="submit" className="primary-button full-width" disabled={submitting}>
              {submitting ? 'Sending...' : 'Send Test Email'}
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}

export default PlaceholderPage;
