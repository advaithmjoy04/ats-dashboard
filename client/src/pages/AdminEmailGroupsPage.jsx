import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';

const initialForm = {
  name: '',
  role: 'STUDENT',
  description: '',
  membersInput: '',
};

function parseMembersInput(input) {
  const lines = String(input || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const members = [];
  const seen = new Set();

  for (const line of lines) {
    const parts = line.split(',').map((part) => part.trim()).filter(Boolean);
    let fullName = '';
    let email = '';

    if (parts.length === 1) {
      email = parts[0];
    } else {
      fullName = parts.slice(0, -1).join(', ');
      email = parts[parts.length - 1];
    }

    const normalizedEmail = email.toLowerCase();
    if (!normalizedEmail.includes('@') || normalizedEmail === 'email') {
      continue;
    }
    if (!normalizedEmail || seen.has(normalizedEmail)) {
      continue;
    }

    seen.add(normalizedEmail);
    members.push({ fullName, email: normalizedEmail });
  }

  return members;
}

function buildMembersInput(members = []) {
  return members.map((member) => (member.fullName ? `${member.fullName}, ${member.email}` : member.email)).join('\n');
}

function summarizeResults(results = []) {
  if (!results.length) {
    return '';
  }
  const invited = results.filter((item) => item.status === 'INVITED').length;
  const active = results.filter((item) => item.status === 'ACTIVE').length;
  const failed = results.filter((item) => item.status === 'FAILED').length;
  return `Invited ${invited}, already active ${active}, failed ${failed}`;
}

function AdminEmailGroupsPage() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sendingId, setSendingId] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [editingId, setEditingId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState(initialForm);
  const [lastResults, setLastResults] = useState([]);

  async function loadGroups() {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/email-groups');
      setGroups(data || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load email groups.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGroups();
  }, []);

  const parsedMembers = useMemo(() => parseMembersInput(form.membersInput), [form.membersInput]);

  function resetForm() {
    setForm(initialForm);
    setEditingId('');
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleCsvUpload(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const contents = await file.text();
      setForm((current) => ({
        ...current,
        membersInput: [current.membersInput.trim(), contents.trim()].filter(Boolean).join('\n'),
      }));
      setError('');
    } catch (err) {
      setError('Unable to read the uploaded CSV file.');
    } finally {
      event.target.value = '';
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    setError('');

    try {
      const payload = {
        name: form.name.trim(),
        role: form.role,
        description: form.description.trim(),
        members: parsedMembers,
      };

      if (!payload.members.length) {
        throw new Error('Add at least one email before saving the group.');
      }

      if (editingId) {
        await api.patch(`/admin/email-groups/${editingId}`, payload);
        setMessage('Email group updated successfully.');
      } else {
        await api.post('/admin/email-groups', payload);
        setMessage('Email group created successfully.');
      }

      resetForm();
      setLastResults([]);
      await loadGroups();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to save email group.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleEdit(group) {
    setEditingId(group.id);
    setForm({
      name: group.name,
      role: group.role,
      description: group.description || '',
      membersInput: buildMembersInput(group.members),
    });
    setMessage('');
    setError('');
    setLastResults([]);
  }

  async function handleDelete(group) {
    const confirmed = window.confirm(`Delete the email group "${group.name}"?`);
    if (!confirmed) {
      return;
    }

    setDeletingId(group.id);
    setMessage('');
    setError('');
    try {
      await api.delete(`/admin/email-groups/${group.id}`);
      if (editingId === group.id) {
        resetForm();
      }
      setMessage(`Deleted ${group.name}.`);
      setLastResults([]);
      await loadGroups();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to delete email group.');
    } finally {
      setDeletingId('');
    }
  }

  async function handleSend(group) {
    const confirmed = window.confirm(`Send activation emails to ${group.memberCount} members in "${group.name}"?`);
    if (!confirmed) {
      return;
    }

    setSendingId(group.id);
    setMessage('');
    setError('');
    try {
      const { data } = await api.post(`/admin/email-groups/${group.id}/send-activations`);
      setLastResults(data.results || []);
      setMessage(`${group.name}: ${summarizeResults(data.results)}`);
      await loadGroups();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to send activation emails.');
    } finally {
      setSendingId('');
    }
  }

  return (
    <div className="page-stack">
      <section className="toolbar">
        <div>
          <h2 className="page-title">Email Groups</h2>
          <p className="page-description">Create tenant-safe student or recruiter groups and send activation invites in bulk.</p>
        </div>
        <div className="summary-pill">Saved Groups: {groups.length}</div>
      </section>

      {message ? <div className="success-banner">{message}</div> : null}
      {error ? <div className="error-banner">{error}</div> : null}

      <div className="management-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h3>{editingId ? 'Edit Email Group' : 'Create Email Group'}</h3>
              <p className="page-description">Use one line per member: `Full Name, email@example.com` or just the email.</p>
            </div>
          </div>

          <form className="job-form" onSubmit={handleSubmit}>
            <label>
              Group name
              <input name="name" value={form.name} onChange={handleChange} placeholder="CSE 2026" required />
            </label>
            <label>
              Role
              <select name="role" value={form.role} onChange={handleChange}>
                <option value="STUDENT">Student</option>
                <option value="RECRUITER">Recruiter</option>
              </select>
            </label>
            <label className="full-width">
              Description
              <input
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Optional notes for this invite batch"
              />
            </label>
            <label className="full-width">
              Members
              <textarea
                name="membersInput"
                rows="10"
                value={form.membersInput}
                onChange={handleChange}
                placeholder={'Anita Rao, anita@example.com\nstudent2@example.com'}
              />
            </label>
            <label className="full-width">
              Upload CSV
              <input type="file" accept=".csv,text/csv,.txt" onChange={handleCsvUpload} />
            </label>
            <div className="full-width toolbar-actions">
              <button className="primary-button" type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : editingId ? 'Update Group' : 'Save Group'}
              </button>
              {editingId ? (
                <button className="text-button" type="button" onClick={resetForm}>
                  Cancel Edit
                </button>
              ) : null}
            </div>
          </form>

          <div className="compact">
            <strong>{parsedMembers.length}</strong> unique members ready to save.
          </div>
        </section>

        {loading ? (
          <div className="screen-center">Loading email groups...</div>
        ) : (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h3>Saved Email Groups</h3>
                <p className="page-description">Bulk send activations only after you confirm the list is correct.</p>
              </div>
            </div>

            {groups.length ? (
              <div className="user-list">
                {groups.map((group) => (
                  <article className="user-list-item" key={group.id}>
                    <div>
                      <strong>{group.name}</strong>
                      <div className="compact">
                        {group.role} group • {group.memberCount} members
                      </div>
                      {group.description ? <div className="compact">{group.description}</div> : null}
                      {group.lastSentAt ? <div className="compact">Last sent: {new Date(group.lastSentAt).toLocaleString()}</div> : null}
                    </div>
                    <div className="user-list-meta">
                      <button className="text-button" type="button" onClick={() => handleEdit(group)}>
                        Edit
                      </button>
                      <button
                        className="primary-button"
                        type="button"
                        onClick={() => handleSend(group)}
                        disabled={sendingId === group.id}
                      >
                        {sendingId === group.id ? 'Sending...' : 'Send Activations'}
                      </button>
                      <button
                        className="danger-button"
                        type="button"
                        onClick={() => handleDelete(group)}
                        disabled={deletingId === group.id}
                      >
                        {deletingId === group.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">No email groups yet. Create one to send activation links in bulk.</div>
            )}
          </section>
        )}
      </div>

      {lastResults.length ? (
        <section className="table-card">
          <div className="panel-heading">
            <div>
              <h3>Latest Send Results</h3>
              <p className="page-description">Review partial failures before retrying.</p>
            </div>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {lastResults.map((result) => (
                  <tr key={result.email}>
                    <td>{result.email}</td>
                    <td>{result.fullName || '—'}</td>
                    <td>
                      <span className={`status-pill ${result.status === 'INVITED' ? 'status-selected' : result.status === 'ACTIVE' ? 'status-shortlisted' : 'status-rejected'}`}>
                        {result.status}
                      </span>
                    </td>
                    <td>{result.error || 'Activation email sent'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default AdminEmailGroupsPage;
