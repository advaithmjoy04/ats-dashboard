import { useEffect, useMemo, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import PipelineBoard from '../components/PipelineBoard';

function RecruiterCandidatesPage() {
  const { search } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const selectedJobId = params.get('jobId') || '';

  useEffect(() => {
    let ignore = false;

    async function loadJobsAndCandidates() {
      try {
        const jobsResponse = await api.get('/recruiter/jobs', { params: { limit: 50 } });
        const recruiterJobs = jobsResponse.data.items || [];
        const activeJobId = selectedJobId || recruiterJobs[0]?.jobId || '';
        let applicants = [];
        if (activeJobId) {
          const candidatesResponse = await api.get(`/recruiter/jobs/${activeJobId}/applicants`, {
            params: { limit: 100 },
          });
          applicants = candidatesResponse.data.items || [];
        }

        if (!ignore) {
          setJobs(recruiterJobs);
          setCandidates(applicants);
          if (!selectedJobId && activeJobId) {
            setParams({ jobId: activeJobId }, { replace: true });
          }
          setError('');
        }
      } catch (err) {
        if (!ignore) {
          setError(err.response?.data?.message || 'Unable to load recruiter candidates.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadJobsAndCandidates();
    return () => {
      ignore = true;
    };
  }, [selectedJobId, setParams]);

  const filteredCandidates = useMemo(() => {
    const query = String(search || '').toLowerCase();
    if (!query) {
      return candidates;
    }
    return candidates.filter((candidate) =>
      [
        candidate.student?.fullName,
        candidate.student?.email,
        candidate.student?.branch,
        candidate.job?.role,
        candidate.job?.companyName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [candidates, search]);

  return (
    <div className="page-stack">
      <section className="toolbar">
        <div>
          <h2 className="page-title">Candidates</h2>
          <p className="page-description">Review applicants for your assigned roles by pipeline stage.</p>
        </div>
        <div className="toolbar-actions">
          <select value={selectedJobId} onChange={(event) => setParams(event.target.value ? { jobId: event.target.value } : {})}>
            {jobs.length ? null : <option value="">No assigned jobs</option>}
            {jobs.map((job) => (
              <option key={job._id} value={job.jobId}>
                {job.companyName} - {job.title || job.role}
              </option>
            ))}
          </select>
        </div>
      </section>

      {error ? <div className="error-banner">{error}</div> : null}
      {loading ? (
        <div className="screen-center">Loading candidates...</div>
      ) : selectedJobId ? (
        <PipelineBoard candidates={filteredCandidates} />
      ) : (
        <div className="empty-state">Assign a recruiter to a job first, then candidates will appear here.</div>
      )}
    </div>
  );
}

export default RecruiterCandidatesPage;
