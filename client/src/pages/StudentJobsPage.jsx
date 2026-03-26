import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import { formatDate } from '../utils/formatters';
import { useOutletContext } from 'react-router-dom';

function StudentJobsPage() {
  const { search } = useOutletContext();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [applyingJobId, setApplyingJobId] = useState('');

  async function loadJobs() {
    try {
      const response = await api.get('/student/jobs', { params: { limit: 50 } });
      setJobs(response.data.items || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load open jobs.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadJobs();
  }, []);

  const filteredJobs = useMemo(() => {
    const query = String(search || '').toLowerCase();
    if (!query) {
      return jobs;
    }
    return jobs.filter((job) =>
      [job.companyName, job.title, job.role, job.description, job.jobId].filter(Boolean).join(' ').toLowerCase().includes(query)
    );
  }, [jobs, search]);

  async function handleApply(job) {
    setApplyingJobId(job.jobId);
    setMessage('');
    setError('');
    try {
      await api.post('/student/applications', { jobId: job.jobId });
      setMessage(`Applied to ${job.companyName} - ${job.title || job.role}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to apply for this job.');
    } finally {
      setApplyingJobId('');
    }
  }

  return (
    <div className="page-stack">
      <section className="toolbar">
        <div>
          <h2 className="page-title">Open Jobs</h2>
          <p className="page-description">Browse live postings and apply once your resume is uploaded.</p>
        </div>
        <div className="summary-pill">Open Jobs: {filteredJobs.length}</div>
      </section>

      {message ? <div className="success-banner">{message}</div> : null}
      {error ? <div className="error-banner">{error}</div> : null}

      {loading ? (
        <div className="screen-center">Loading job postings...</div>
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
                <span>Min CGPA {job.minCgpa ?? 0}</span>
              </div>
              <p>{job.description}</p>
              <div className="job-foot">
                <span className={`status-pill ${job.eligible ? 'status-selected' : 'status-rejected'}`}>
                  {job.eligible ? 'Eligible' : 'Not Eligible'}
                </span>
                <button
                  type="button"
                  className="primary-button"
                  disabled={!job.eligible || applyingJobId === job.jobId}
                  onClick={() => handleApply(job)}
                >
                  {applyingJobId === job.jobId ? 'Applying...' : 'Apply'}
                </button>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <div className="empty-state">There are no active jobs matching your search yet.</div>
      )}
    </div>
  );
}

export default StudentJobsPage;
