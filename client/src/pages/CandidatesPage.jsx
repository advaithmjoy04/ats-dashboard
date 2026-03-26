import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../api/client';
import CandidateTable from '../components/CandidateTable';

function CandidatesPage() {
  const { search } = useOutletContext();
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ jobId: '', status: '' });

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        const [candidatesRes, jobsRes] = await Promise.all([
          api.get('/admin/candidates', { params: { ...filters, search } }),
          api.get('/admin/jobs'),
        ]);
        if (!ignore) {
          setCandidates(candidatesRes.data.items || []);
          setJobs(jobsRes.data.items || []);
          setError('');
        }
      } catch (err) {
        if (!ignore) {
          setError(err.response?.data?.message || 'Unable to load candidates.');
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
  }, [filters, search]);

  return (
    <div className="page-stack">
      <section className="toolbar">
        <div>
          <h2 className="page-title">Candidates</h2>
          <p className="page-description">Review applicants across jobs with ATS-specific filters.</p>
        </div>
        <div className="summary-pill">Total Candidates: {candidates.length}</div>
      </section>

      <section className="filters-bar">
        <select value={filters.jobId} onChange={(event) => setFilters((current) => ({ ...current, jobId: event.target.value }))}>
          <option value="">All jobs</option>
          {jobs.map((job) => (
            <option value={job.jobId} key={job._id}>
              {job.companyName} - {job.role}
            </option>
          ))}
        </select>
        <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
          <option value="">All statuses</option>
          <option value="APPLIED">Applied</option>
          <option value="SHORTLISTED">Shortlisted</option>
          <option value="REJECTED">Rejected</option>
          <option value="SELECTED">Selected</option>
        </select>
      </section>

      {error ? <div className="error-banner">{error}</div> : null}
      {loading ? <div className="screen-center">Loading candidate explorer...</div> : <CandidateTable candidates={candidates} />}
    </div>
  );
}

export default CandidatesPage;
