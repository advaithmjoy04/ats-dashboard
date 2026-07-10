import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import api from '../api/client';
import CreateJobModal from '../components/CreateJobModal';
import JobCard from '../components/JobCard';
import { emitActivityRefresh } from '../utils/activitySignals';

function RecruiterJobsPage() {
  const { search } = useOutletContext();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  async function loadJobs() {
    const response = await api.get('/recruiters/jobs', { params: { limit: 50 } });
    setJobs(response.data.items || []);
  }

  useEffect(() => {
    let ignore = false;

    async function loadJobsEffect() {
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

    loadJobsEffect();
    return () => {
      ignore = true;
    };
  }, []);

  const filteredJobs = useMemo(() => {
    const query = String(search || '').toLowerCase();
    return jobs.filter((job) => {
      if (!query) {
        return true;
      }

      return [job.companyName, job.title, job.role, job.jobId].filter(Boolean).join(' ').toLowerCase().includes(query);
    });
  }, [jobs, search]);

  async function handleCreateJob(payload) {
    setCreating(true);
    setError('');
    setMessage('');
    try {
      await api.post('/recruiters/jobs', payload);
      setModalOpen(false);
      setMessage('Job created successfully');
      await loadJobs();
      emitActivityRefresh({ scope: 'recruiter', action: 'job.created' });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create recruiter job.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="toolbar">
        <div>
          <h2 className="page-title">Jobs</h2>
          <p className="page-description">Create your own roles and review only the jobs you created inside this institute workspace.</p>
        </div>
        <div className="toolbar-actions">
          <button type="button" className="primary-button" onClick={() => setModalOpen(true)}>
            Create Job
          </button>
        </div>
      </section>

      {message ? <div className="success-banner">{message}</div> : null}
      {error ? <div className="error-banner">{error}</div> : null}
      {loading ? (
        <div className="screen-center">Loading assigned jobs...</div>
      ) : filteredJobs.length ? (
        <section className="jobs-grid">
          {filteredJobs.map((job) => (
            <JobCard
              key={job._id}
              job={job}
              onOpen={(selectedJob) => navigate(`/recruiter/candidates?jobId=${encodeURIComponent(selectedJob.jobId)}`)}
              footerNote="Open candidates pipeline"
              metaItems={[
                { label: 'Job ID', value: job.jobId },
                { label: 'Deadline', value: job.deadline ? new Date(job.deadline).toLocaleDateString('en-IN') : '--' },
                { label: 'Min CGPA', value: job.minCgpa ?? '--' },
              ]}
            />
          ))}
        </section>
      ) : (
        <div className="empty-state">No jobs are assigned to this recruiter yet.</div>
      )}

      <CreateJobModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreateJob}
        submitting={creating}
      />
    </div>
  );
}

export default RecruiterJobsPage;
