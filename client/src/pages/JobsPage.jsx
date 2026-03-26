import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import CreateJobModal from '../components/CreateJobModal';
import JobCard from '../components/JobCard';

function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('NEWEST');
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingJobId, setDeletingJobId] = useState('');
  const [message, setMessage] = useState('');

  async function loadData() {
    setLoading(true);
    try {
      const [jobsRes, recruitersRes] = await Promise.all([
        api.get('/admin/jobs'),
        api.get('/admin/recruiters'),
      ]);
      setJobs(jobsRes.data.items || []);
      setRecruiters(recruitersRes.data.items || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load jobs.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredJobs = useMemo(() => {
    const next = [...jobs].filter((job) => {
      if (statusFilter === 'ACTIVE') {
        return job.active;
      }
      if (statusFilter === 'INACTIVE') {
        return !job.active;
      }
      return true;
    });

    next.sort((a, b) => {
      if (sortBy === 'NEWEST') {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      if (sortBy === 'OLDEST') {
        return new Date(a.createdAt) - new Date(b.createdAt);
      }
      if (sortBy === 'COMPANY') {
        return a.companyName.localeCompare(b.companyName);
      }
      return a.role.localeCompare(b.role);
    });

    return next;
  }, [jobs, sortBy, statusFilter]);

  async function handleCreateJob(payload) {
    setCreating(true);
    setMessage('');
    try {
      await api.post('/admin/jobs', payload);
      setModalOpen(false);
      setMessage('Job created successfully');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create job.');
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteJob(job) {
    setDeletingJobId(job.jobId);
    setMessage('');
    setError('');
    try {
      await api.delete(`/admin/jobs/${job.jobId}`);
      setMessage(`Removed ${job.companyName} - ${job.role}`);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to remove job.');
    } finally {
      setDeletingJobId('');
    }
  }

  return (
    <div className="page-stack">
      <section className="toolbar">
        <div>
          <h2 className="page-title">Jobs</h2>
          <p className="page-description">Track open roles, assigned recruiters, and pipeline flow.</p>
        </div>
        <div className="toolbar-actions">
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="NEWEST">Newest</option>
            <option value="OLDEST">Oldest</option>
            <option value="COMPANY">Company</option>
            <option value="ROLE">Role</option>
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <button type="button" className="primary-button" onClick={() => setModalOpen(true)}>
            Create Job
          </button>
        </div>
      </section>

      {message ? <div className="success-banner">{message}</div> : null}
      {error ? <div className="error-banner">{error}</div> : null}

      {loading ? (
        <div className="screen-center">Loading jobs...</div>
      ) : filteredJobs.length ? (
        <section className="jobs-grid">
          {filteredJobs.map((job) => (
            <JobCard
              job={job}
              key={job._id}
              onDelete={handleDeleteJob}
              deleting={deletingJobId === job.jobId}
            />
          ))}
        </section>
      ) : (
        <div className="empty-state">No jobs match the current filters. Create a role to start the pipeline.</div>
      )}

      <CreateJobModal
        open={modalOpen}
        recruiters={recruiters}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreateJob}
        submitting={creating}
      />
    </div>
  );
}

export default JobsPage;
