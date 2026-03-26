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
  const [updatingId, setUpdatingId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const selectedJobId = params.get('jobId') || '';

  useEffect(() => {
    let ignore = false;

    async function loadJobsAndCandidates() {
      try {
        const jobsResponse = await api.get('/recruiters/jobs', { params: { limit: 50 } });
        const recruiterJobs = jobsResponse.data.items || [];
        const activeJobId = selectedJobId || recruiterJobs[0]?.jobId || '';
        let applicants = [];
        if (activeJobId) {
          const candidatesResponse = await api.get(`/recruiters/jobs/${activeJobId}/applicants`, {
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

  async function handleMoveCandidate(candidateId, nextStatus) {
    const currentCandidate = candidates.find((candidate) => candidate.id === candidateId);
    if (!currentCandidate || currentCandidate.status === nextStatus) {
      return;
    }

    const previousCandidates = candidates;
    setUpdatingId(candidateId);
    setMessage('');
    setError('');
    setCandidates((current) =>
      current.map((candidate) =>
        candidate.id === candidateId ? { ...candidate, status: nextStatus } : candidate
      )
    );

    try {
      await api.patch(`/recruiters/applications/${candidateId}`, {
        status: nextStatus,
        jobId: selectedJobId,
      });
      setMessage(`Moved ${currentCandidate.student?.fullName || currentCandidate.student?.email} to ${nextStatus.toLowerCase()}.`);
    } catch (err) {
      setCandidates(previousCandidates);
      setError(err.response?.data?.message || 'Unable to update candidate status.');
    } finally {
      setUpdatingId('');
    }
  }

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

      {message ? <div className="success-banner">{message}</div> : null}
      {error ? <div className="error-banner">{error}</div> : null}
      {loading ? (
        <div className="screen-center">Loading candidates...</div>
      ) : selectedJobId ? (
        <PipelineBoard candidates={filteredCandidates} onMoveCandidate={handleMoveCandidate} updatingId={updatingId} />
      ) : (
        <div className="empty-state">Assign a recruiter to a job first, then candidates will appear here.</div>
      )}
    </div>
  );
}

export default RecruiterCandidatesPage;
