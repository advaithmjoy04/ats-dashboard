import { useEffect, useState } from 'react';
import api from '../api/client';

function RecruiterProfilePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;

    async function loadProfile() {
      try {
        const response = await api.get('/auth/me');
        if (!ignore) {
          setUser(response.data);
          setError('');
        }
      } catch (err) {
        if (!ignore) {
          setError(err.response?.data?.message || 'Unable to load recruiter profile.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadProfile();
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="page-stack">
      {error ? <div className="error-banner">{error}</div> : null}
      {loading ? (
        <div className="screen-center">Loading profile...</div>
      ) : (
        <>
          <section className="toolbar">
            <div>
              <h2 className="page-title">Recruiter Profile</h2>
              <p className="page-description">Review the account that owns your assigned jobs and candidate access.</p>
            </div>
            <div className="summary-pill">{user?.status || 'ACTIVE'}</div>
          </section>

          <section className="panel">
            <div className="candidate-directory-shell recruiter-profile-shell">
              <div className="candidate-directory-copy">
                <span className="eyebrow">Account Overview</span>
                <h3>{user?.fullName || 'Recruiter'}</h3>
                <p className="page-description">This account is used for recruiter-owned jobs, pipeline reviews, and student-facing feedback updates.</p>
              </div>
              <div className="candidate-directory-stats">
                <article className="candidate-stat-card">
                  <span>Role</span>
                  <strong>{user?.role || '--'}</strong>
                </article>
                <article className="candidate-stat-card">
                  <span>Status</span>
                  <strong>{user?.status || '--'}</strong>
                </article>
              </div>
            </div>

            <div className="review-grid">
              <div>
                <strong>Full name</strong>
                <span>{user?.fullName || '--'}</span>
              </div>
              <div>
                <strong>Email</strong>
                <span>{user?.email || '--'}</span>
              </div>
              <div>
                <strong>Recruiter scope</strong>
                <span>Only recruiter-owned or assigned jobs</span>
              </div>
              <div>
                <strong>Candidate access</strong>
                <span>Submitted application data, resume, and feedback only</span>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default RecruiterProfilePage;
