import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';

function StudentProfilePage() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    fullName: '',
    branch: '',
    semester: '',
    cgpa: '',
    phone: '',
    educationDetails: '',
    skills: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadProfile() {
    try {
      const response = await api.get('/student/profile');
      const nextProfile = response.data;
      setProfile(nextProfile);
      setForm({
        fullName: nextProfile.fullName || '',
        branch: nextProfile.branch || '',
        semester: nextProfile.semester ?? '',
        cgpa: nextProfile.cgpa ?? '',
        phone: nextProfile.phone || '',
        educationDetails: nextProfile.educationDetails || '',
        skills: (nextProfile.skills || []).join(', '),
      });
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load student profile.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  const missingFields = useMemo(() => profile?.resumeExtractionMissingFields || [], [profile]);

  async function handleUploadResume(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploading(true);
    setMessage('');
    setError('');
    try {
      const formData = new FormData();
      formData.append('resume', file);
      await api.post('/student/resume', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessage('Resume uploaded. We extracted whatever details we could find from it.');
      await loadProfile();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to upload resume.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  async function handleSaveProfile(event) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const payload = {
        fullName: form.fullName,
        branch: form.branch,
        semester: form.semester ? Number(form.semester) : undefined,
        cgpa: form.cgpa ? Number(form.cgpa) : undefined,
        phone: form.phone,
        educationDetails: form.educationDetails,
        skills: form.skills
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
      };
      const response = await api.put('/student/profile', payload);
      setProfile(response.data);
      setMessage('Profile updated successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update profile.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="toolbar">
        <div>
          <h2 className="page-title">Profile</h2>
          <p className="page-description">Upload your resume first. We will extract profile details and only ask you for anything missing.</p>
        </div>
      </section>

      {message ? <div className="success-banner">{message}</div> : null}
      {error ? <div className="error-banner">{error}</div> : null}

      {loading ? (
        <div className="screen-center">Loading profile...</div>
      ) : (
        <div className="management-grid">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Resume</h2>
                <span>PDF or DOCX only, up to 5 MB.</span>
              </div>
            </div>
            <div className="resume-upload-card">
              <input type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleUploadResume} />
              <p>{profile?.resumeOriginalName || 'No resume uploaded yet.'}</p>
              {profile?.resumeUrl ? (
                <a href={profile.resumeUrl} target="_blank" rel="noreferrer" className="text-button">
                  View current resume
                </a>
              ) : null}
            </div>
            {uploading ? <div className="compact">Uploading and extracting your resume...</div> : null}
            {missingFields.length ? (
              <div className="empty-state">
                We could not confidently extract: {missingFields.join(', ')}. Please fill those below.
              </div>
            ) : profile?.resumeKey ? (
              <div className="success-banner">Your resume details were extracted successfully.</div>
            ) : null}
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Profile Details</h2>
                <span>Anything found in the resume is already filled in here.</span>
              </div>
            </div>
            <form className="job-form" onSubmit={handleSaveProfile}>
              <label>
                Full name
                <input value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} />
              </label>
              <label>
                Branch
                <input value={form.branch} onChange={(event) => setForm((current) => ({ ...current, branch: event.target.value }))} />
              </label>
              <label>
                Semester
                <input type="number" min="1" value={form.semester} onChange={(event) => setForm((current) => ({ ...current, semester: event.target.value }))} />
              </label>
              <label>
                CGPA
                <input type="number" min="0" max="10" step="0.01" value={form.cgpa} onChange={(event) => setForm((current) => ({ ...current, cgpa: event.target.value }))} />
              </label>
              <label>
                Phone
                <input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
              </label>
              <label className="full-width">
                Skills
                <input
                  value={form.skills}
                  onChange={(event) => setForm((current) => ({ ...current, skills: event.target.value }))}
                  placeholder="React, Node.js, MongoDB"
                />
              </label>
              <label className="full-width">
                Education details
                <textarea
                  rows="5"
                  value={form.educationDetails}
                  onChange={(event) => setForm((current) => ({ ...current, educationDetails: event.target.value }))}
                  placeholder="College, degree, year, CGPA, relevant education details"
                />
              </label>
              <button type="submit" className="primary-button full-width" disabled={saving}>
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default StudentProfilePage;
