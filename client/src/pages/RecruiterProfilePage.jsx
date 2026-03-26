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
      <section className="panel placeholder-page">
        <h2>Profile</h2>
        <p>Recruiter account details for the hiring portal.</p>
      </section>
      {error ? <div className="error-banner">{error}</div> : null}
      {loading ? (
        <div className="screen-center">Loading profile...</div>
      ) : (
        <section className="panel detail-panel-grid">
          <div>
            <h3>Full name</h3>
            <p>{user?.fullName || '--'}</p>
          </div>
          <div>
            <h3>Email</h3>
            <p>{user?.email || '--'}</p>
          </div>
          <div>
            <h3>Role</h3>
            <p>{user?.role || '--'}</p>
          </div>
          <div>
            <h3>Status</h3>
            <p>{user?.status || '--'}</p>
          </div>
        </section>
      )}
    </div>
  );
}

export default RecruiterProfilePage;
