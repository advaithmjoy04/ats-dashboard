import { useEffect, useState } from 'react';
import api from '../api/client';
import UserInvitePanel from '../components/UserInvitePanel';
import UserListPanel from '../components/UserListPanel';

const initialForm = {
  fullName: '',
  email: '',
};

const fields = [
  { name: 'fullName', label: 'Full name', placeholder: 'Student full name' },
  { name: 'email', label: 'Email', type: 'email', placeholder: 'student@college.edu' },
];

function StudentsPage() {
  const [form, setForm] = useState(initialForm);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);

  async function loadStudents() {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/students');
      setStudents(data.items || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load students.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStudents();
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
      await api.post('/admin/students', form);
      setMessage(`Invitation email sent to ${form.email}`);
      setForm(initialForm);
      setInviteOpen(false);
      await loadStudents();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to invite student.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(student) {
    const userId = student.userId?._id;
    if (!userId) {
      return;
    }
    const userName = student.userId?.fullName || student.userId?.email || 'this student';
    const confirmed = window.confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`);
    if (!confirmed) {
      return;
    }
    const passwordConfirmation = window.prompt(`Enter your admin password to delete ${userName}.`);
    if (!passwordConfirmation) {
      return;
    }

    setRemovingId(userId);
    setMessage('');
    setError('');
    try {
      await api.delete(`/admin/users/${userId}`, { data: { passwordConfirmation } });
      setMessage(`Deleted ${student.userId?.email || 'student'}`);
      await loadStudents();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to remove student invite.');
    } finally {
      setRemovingId('');
    }
  }

  return (
    <div className="page-stack">
      <section className="toolbar">
        <div>
          <h2 className="page-title">Students</h2>
          <p className="page-description">Invite students from the dashboard and send activation emails directly through Gmail.</p>
        </div>
        <div className="toolbar-actions">
          <div className="summary-pill">Invited Students: {students.length}</div>
          <button type="button" className="primary-button" onClick={() => setInviteOpen(true)}>
            Invite Student
          </button>
        </div>
      </section>

      {message ? <div className="success-banner">{message}</div> : null}
      {error ? <div className="error-banner">{error}</div> : null}

      {loading ? (
        <div className="screen-center">Loading invited students...</div>
      ) : (
        <UserListPanel
          title="Student Invites"
          description="Recently created student accounts"
          users={students}
          emptyMessage="No students have been invited yet."
          variant="student"
          actionLabel="Remove"
          onAction={handleRemove}
          actionLoadingId={removingId}
        />
      )}

      <UserInvitePanel
        open={inviteOpen}
        onClose={() => {
          setInviteOpen(false);
          setForm(initialForm);
        }}
        title="Invite Student"
        description="Create a student account and send the activation email immediately."
        fields={fields}
        values={form}
        onChange={handleChange}
        onSubmit={handleSubmit}
        submitting={submitting}
        submitLabel="Send Student Invite"
      />
    </div>
  );
}

export default StudentsPage;
