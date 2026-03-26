import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client';
import PipelineBoard from '../components/PipelineBoard';
import { formatDate } from '../utils/formatters';

const tabs = ['Candidates', 'Job Details', 'Timeline', 'Recruiters', 'Settings'];

function JobDetailPage() {
  const { jobId } = useParams();
  const [jobs, setJobs] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('Candidates');

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        const [jobsRes, candidatesRes] = await Promise.all([
          api.get('/admin/jobs'),
          api.get('/admin/candidates', { params: { jobId } }),
        ]);
        if (!ignore) {
          setJobs(jobsRes.data.items || []);
          setCandidates(candidatesRes.data.items || []);
          setError('');
        }
      } catch (err) {
        if (!ignore) {
          setError(err.response?.data?.message || 'Unable to load job details.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => {
      ignore = true;
    };
  }, [jobId]);

  const job = useMemo(() => jobs.find((item) => item.jobId === jobId), [jobs, jobId]);

  if (loading) {
    return <div className="screen-center">Loading job workspace...</div>;
  }

  if (error) {
    return <div className="error-banner">{error}</div>;
  }

  if (!job) {
    return (
      <div className="empty-state">
        This job could not be found. <Link to="/admin/jobs">Return to jobs</Link>.
      </div>
    );
  }

  return (
    <div className="page-stack">
      <div className="detail-hero">
        <div className="job-logo large">{job.companyName.slice(0, 2).toUpperCase()}</div>
        <div className="detail-hero-copy">
          <div className="detail-eyebrow">{job.companyName}</div>
          <h2>{job.role}</h2>
          <p>{job.description || 'No job description provided yet.'}</p>
        </div>
        <div className="detail-meta">
          <span>{job.jobId}</span>
          <span>{job.active ? 'Active' : 'Inactive'}</span>
          <span>{formatDate(job.createdAt)}</span>
        </div>
      </div>

      <div className="tabs-row">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`tab-button ${activeTab === tab ? 'is-active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Candidates' ? <PipelineBoard candidates={candidates} /> : null}

      {activeTab === 'Job Details' ? (
        <section className="panel detail-panel-grid">
          <div>
            <h3>Role overview</h3>
            <p>{job.description || 'No description yet.'}</p>
          </div>
          <div>
            <h3>Requirements</h3>
            <p>Minimum CGPA: {job.minCgpa ?? '--'}</p>
          </div>
        </section>
      ) : null}

      {activeTab === 'Timeline' ? (
        <section className="panel">
          <h3>Timeline</h3>
          <p>Created on {formatDate(job.createdAt)}. Additional ATS milestone tracking can extend this section next.</p>
        </section>
      ) : null}

      {activeTab === 'Recruiters' ? (
        <section className="panel">
          <h3>Assigned Recruiters</h3>
          {job.assignedRecruiters?.length ? (
            <div className="simple-list">
              {job.assignedRecruiters.map((recruiter) => (
                <div className="simple-list-item" key={recruiter._id}>
                  <strong>{recruiter.fullName || recruiter.email}</strong>
                  <span>{recruiter.email}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state compact">No recruiters are assigned to this job yet.</div>
          )}
        </section>
      ) : null}

      {activeTab === 'Settings' ? (
        <section className="panel">
          <h3>Settings</h3>
          <p>Status: {job.active ? 'Active' : 'Inactive'}. Advanced editing controls can be added here in the next iteration.</p>
        </section>
      ) : null}
    </div>
  );
}

export default JobDetailPage;
