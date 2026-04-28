import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../api/client';
import CandidateDetailPanel from '../components/CandidateDetailPanel';
import { getInitials } from '../utils/formatters';

function CandidatesPage() {
  const { search } = useOutletContext();
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingFeedback, setSavingFeedback] = useState(false);
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
          const nextCandidates = candidatesRes.data.items || [];
          setCandidates(nextCandidates);
          setSelectedCandidateId((current) => (nextCandidates.some((candidate) => candidate.id === current) ? current : nextCandidates[0]?.id || ''));
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

  const selectedCandidate = useMemo(
    () => candidates.find((candidate) => candidate.id === selectedCandidateId) || null,
    [candidates, selectedCandidateId]
  );

  const statusCounts = useMemo(() => {
    return candidates.reduce(
      (summary, candidate) => {
        const status = String(candidate.status || '').toUpperCase();
        if (status === 'APPLIED') summary.applied += 1;
        if (status === 'SHORTLISTED') summary.shortlisted += 1;
        if (status === 'SELECTED') summary.selected += 1;
        if (status === 'REJECTED') summary.rejected += 1;
        return summary;
      },
      { applied: 0, shortlisted: 0, selected: 0, rejected: 0 }
    );
  }, [candidates]);

  async function handleSaveFeedback(feedback) {
    if (!selectedCandidate) {
      return;
    }

    setSavingFeedback(true);
    setError('');
    try {
      const response = await api.patch(`/admin/applications/${selectedCandidate.id}/feedback`, feedback);
      const updatedCandidate = {
        ...selectedCandidate,
        feedback: response.data || feedback,
      };
      setCandidates((current) =>
        current.map((candidate) => (candidate.id === selectedCandidate.id ? updatedCandidate : candidate))
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save feedback.');
    } finally {
      setSavingFeedback(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="toolbar">
        <div>
          <h2 className="page-title">Candidates</h2>
          <p className="page-description">Review applicants across jobs with ATS-specific filters.</p>
        </div>
        <div className="summary-pill">Total Candidates: {candidates.length}</div>
      </section>

      {error ? <div className="error-banner">{error}</div> : null}
      {loading ? (
        <div className="screen-center">Loading candidate explorer...</div>
      ) : (
        <div className="candidate-dashboard-stack">
          <section className="panel">
            <div className="candidate-directory-shell">
              <div className="candidate-directory-copy">
                <span className="eyebrow">Admin Explorer</span>
                <h3>Candidate Directory</h3>
                <p className="page-description">Open any candidate card to review the submitted application, resume, and student-facing feedback.</p>
              </div>
              <div className="candidate-directory-stats">
                <article className="candidate-stat-card">
                  <span>Visible</span>
                  <strong>{candidates.length}</strong>
                </article>
                <article className="candidate-stat-card">
                  <span>Applied</span>
                  <strong>{statusCounts.applied}</strong>
                </article>
                <article className="candidate-stat-card">
                  <span>Shortlisted</span>
                  <strong>{statusCounts.shortlisted}</strong>
                </article>
                <article className="candidate-stat-card">
                  <span>Selected</span>
                  <strong>{statusCounts.selected}</strong>
                </article>
              </div>
            </div>

            <div className="candidate-filters">
              <label>
                Job
                <select value={filters.jobId} onChange={(event) => setFilters((current) => ({ ...current, jobId: event.target.value }))}>
                  <option value="">All jobs</option>
                  {jobs.map((job) => (
                    <option value={job.jobId} key={job._id}>
                      {job.companyName} - {job.role}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Status
                <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
                  <option value="">All statuses</option>
                  <option value="APPLIED">Applied</option>
                  <option value="SHORTLISTED">Shortlisted</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="SELECTED">Selected</option>
                </select>
              </label>
            </div>

            {candidates.length ? (
              <div className="candidate-card-grid">
                {candidates.map((candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    className={`candidate-directory-card ${candidate.id === selectedCandidateId ? 'is-selected' : ''}`}
                    onClick={() => setSelectedCandidateId(candidate.id)}
                  >
                    <div className="candidate-card-top">
                      <div className="student-cell">
                        <div className="avatar-badge">{getInitials(candidate.student.fullName || candidate.student.email)}</div>
                        <div className="candidate-card-identity">
                          <strong>{candidate.student.fullName || candidate.student.email}</strong>
                          <span>{candidate.student.email}</span>
                        </div>
                      </div>
                      <span className={`status-pill status-${String(candidate.status || '').toLowerCase()}`}>
                        {candidate.currentStageLabel || candidate.status}
                      </span>
                    </div>

                    <div className="candidate-card-grid-meta">
                      <div>
                        <span>Job</span>
                        <strong>{candidate.job?.role || '--'}</strong>
                      </div>
                      <div>
                        <span>Company</span>
                        <strong>{candidate.job?.companyName || '--'}</strong>
                      </div>
                      <div>
                        <span>USN</span>
                        <strong>{candidate.student?.usn || '--'}</strong>
                      </div>
                      <div>
                        <span>CGPA</span>
                        <strong>{candidate.student?.cgpa ?? '--'}</strong>
                      </div>
                    </div>

                    <div className="candidate-card-foot">
                      <span>Click to review resume, form, and feedback</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty-state compact">No candidates match the current filters.</div>
            )}
          </section>

          {selectedCandidate ? (
            <CandidateDetailPanel
              candidate={selectedCandidate}
              open={Boolean(selectedCandidate)}
              onClose={() => setSelectedCandidateId('')}
              editable
              onSaveFeedback={handleSaveFeedback}
              savingFeedback={savingFeedback}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

export default CandidatesPage;
