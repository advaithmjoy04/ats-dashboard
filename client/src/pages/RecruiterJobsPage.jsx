import { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import api from '../api/client';
import { formatDate } from '../utils/formatters';

function RecruiterJobsPage() {
  const { search } = useOutletContext();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;

    async function loadJobs() {
      try {
        const response = await api.get('/recruiters/jobs', { params: { limit: 50 } });
        if (!ignore) {
          setJobs(response.data.items || []);
          setError('');
        }
      } catch (err) {
        if (!ignore) {
          setError(err.response?.data?.message || 'Unable to load assigned jobs.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadJobs();
    return () => {
      ignore = true;
    };
  }, []);

  const filteredJobs = useMemo(() => {
    const query = String(search || '').toLowerCase();
    if (!query) {
      return jobs;
    }
    return jobs.filter((job) =>
      [job.companyName, job.title, job.role, job.jobId].filter(Boolean).join(' ').toLowerCase().includes(query)
    );
  }, [jobs, search]);

  return (
    <div className="page-stack">
      <section className="toolbar">
        <div>
          <h2 className="page-title">Assigned Jobs</h2>
          <p className="page-description">See the roles assigned to you and jump into candidate review.</p>
        </div>
        <div className="summary-pill">Assigned Jobs: {filteredJobs.length}</div>
      </section>

      {error ? <div className="error-banner">{error}</div> : null}
      {loading ? (
        <div className="screen-center">Loading assigned jobs...</div>
      ) : filteredJobs.length ? (
        <section className="jobs-grid">
          {filteredJobs.map((job) => (
            <article className="job-card" key={job._id}>
              <div className="job-card-top">
                <div className="job-logo">{(job.companyName || 'ATS').slice(0, 3).toUpperCase()}</div>
                <span>{formatDate(job.createdAt)}</span>
              </div>
              <div>
                <div className="job-company">{job.companyName || 'Campus Partner'}</div>
                <h3>{job.title || job.role}</h3>
              </div>
              <div className="job-meta-row">
                <span>{job.jobId}</span>
                <span>{job.status}</span>
              </div>
              <p>{job.description}</p>
              <div className="job-foot">
                <span>Deadline: {formatDate(job.deadline)}</span>
                <Link className="primary-button" to={`/recruiter/candidates?jobId=${encodeURIComponent(job.jobId)}`}>
                  Review Candidates
                </Link>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <div className="empty-state">No jobs are assigned to this recruiter yet.</div>
      )}
    </div>
  );
}

export default RecruiterJobsPage;
