import { useEffect, useState } from 'react';
import api from '../api/client';
import UserInvitePanel from '../components/UserInvitePanel';
import UserListPanel from '../components/UserListPanel';

const initialForm = {
  fullName: '',
  email: '',
};

const fields = [
  { name: 'fullName', label: 'Full name', placeholder: 'Recruiter full name' },
  { name: 'email', label: 'Email', type: 'email', placeholder: 'recruiter@company.com' },
];

function RecruitersPage() {
  const [form, setForm] = useState(initialForm);
  const [recruiters, setRecruiters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadRecruiters() {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/recruiters');
      setRecruiters(data.items || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load recruiters.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecruiters();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    setError('');
    try {
      await api.post('/admin/recruiters', form);
      setMessage(`Invitation email sent to ${form.email}`);
      setForm(initialForm);
      await loadRecruiters();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to invite recruiter.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(recruiter) {
    const userId = recruiter._id;
    if (!userId) {
      return;
    }
    const userName = recruiter.fullName || recruiter.email || 'this recruiter';
    const confirmed = window.confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`);
    if (!confirmed) {
      return;
    }

    setRemovingId(userId);
    setMessage('');
    setError('');
    try {
      await api.delete(`/admin/users/${userId}`);
      setMessage(`Deleted ${recruiter.email}`);
      await loadRecruiters();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to remove recruiter invite.');
    } finally {
      setRemovingId('');
    }
  }

  return (
    <div className="page-stack">
      <section className="toolbar">
        <div>
          <h2 className="page-title">Recruiters</h2>
          <p className="page-description">Invite recruiters and send them activation emails from the admin dashboard.</p>
        </div>
        <div className="summary-pill">Invited Recruiters: {recruiters.length}</div>
      </section>

      {message ? <div className="success-banner">{message}</div> : null}
      {error ? <div className="error-banner">{error}</div> : null}

      <div className="management-grid">
        <UserInvitePanel
          title="Invite Recruiter"
          description="Create a recruiter account and send the activation email immediately."
          fields={fields}
          values={form}
          onChange={handleChange}
          onSubmit={handleSubmit}
          submitting={submitting}
          submitLabel="Send Recruiter Invite"
        />
        {loading ? (
          <div className="screen-center">Loading invited recruiters...</div>
        ) : (
          <UserListPanel
            title="Recruiter Invites"
            description="Recently created recruiter accounts"
            users={recruiters}
            emptyMessage="No recruiters have been invited yet."
            actionLabel="Remove"
            onAction={handleRemove}
            actionLoadingId={removingId}
          />
        )}
      </div>
    </div>
  );
}

export default RecruitersPage;
