import { useEffect, useState } from 'react';
import api from '../api/client';
import { formatDate } from '../utils/formatters';

function StudentApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;

    async function loadApplications() {
      try {
        const response = await api.get('/students/applications/my', { params: { limit: 50 } });
        if (!ignore) {
          setApplications(response.data.items || []);
          setError('');
        }
      } catch (err) {
        if (!ignore) {
          setError(err.response?.data?.message || 'Unable to load your applications.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadApplications();
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="page-stack">
      <section className="toolbar">
        <div>
          <h2 className="page-title">Applications</h2>
          <p className="page-description">Track where each of your applications stands.</p>
        </div>
        <div className="summary-pill">Applications: {applications.length}</div>
      </section>

      {error ? <div className="error-banner">{error}</div> : null}
      {loading ? (
        <div className="screen-center">Loading applications...</div>
      ) : applications.length ? (
        <section className="table-card">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Role</th>
                  <th>Applied On</th>
                  <th>Status</th>
                  <th>Resume</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((application) => (
                  <tr key={application._id}>
                    <td>{application.jobId?.companyName || '--'}</td>
                    <td>{application.jobId?.title || application.jobId?.role || '--'}</td>
                    <td>{formatDate(application.createdAt)}</td>
                    <td>
                      <span className={`status-pill status-${String(application.status || '').toLowerCase()}`}>
                        {application.status}
                      </span>
                    </td>
                    <td>
                      {application.resumeUrl ? (
                        <a className="text-button" href={application.resumeUrl} target="_blank" rel="noreferrer">
                          View Resume
                        </a>
                      ) : (
                        '--'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <div className="empty-state">You have not applied to any jobs yet.</div>
      )}
    </div>
  );
}

export default StudentApplicationsPage;
