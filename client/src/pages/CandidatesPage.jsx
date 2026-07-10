import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../api/client';
import CandidateDetailPanel from '../components/CandidateDetailPanel';
import StatCard from '../components/StatCard';
import { emitActivityRefresh } from '../utils/activitySignals';
import { formatPercent, getInitials } from '../utils/formatters';

function CandidatesPage() {
  const { search, setSearch, debouncedSearch } = useOutletContext();
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
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
          api.get('/search', { params: { ...filters, search: debouncedSearch, limit: 100 } }),
          api.get('/admin/jobs'),
        ]);
        if (!ignore) {
          const nextCandidates = candidatesRes.data.items || [];
          setCandidates(nextCandidates);
          const nextSelectedId = nextCandidates.some((candidate) => candidate.id === selectedCandidateId)
            ? selectedCandidateId
            : '';
          setSelectedCandidateId(nextSelectedId);
          setDetailOpen((current) => current && Boolean(nextSelectedId));
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
  }, [filters, debouncedSearch, selectedCandidateId]);

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

  const totalCandidates = candidates.length;

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
      emitActivityRefresh({ scope: 'admin', action: 'candidate.feedback.saved', applicationId: selectedCandidate.id });
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
        <div className="summary-pill">Total Candidates: {totalCandidates}</div>
      </section>

      {error ? <div className="error-banner">{error}</div> : null}
      {loading ? (
        <div className="screen-center">Loading candidate explorer...</div>
      ) : (
        <>
          <section className="stats-grid">
            <StatCard
              title="Visible Candidates"
              value={totalCandidates}
              percent={formatPercent(totalCandidates, totalCandidates || 1)}
              tone="applied"
            />
            <StatCard
              title="Shortlisted"
              value={statusCounts.shortlisted}
              percent={formatPercent(statusCounts.shortlisted, totalCandidates)}
              tone="shortlisted"
            />
            <StatCard
              title="Selected"
              value={statusCounts.selected}
              percent={formatPercent(statusCounts.selected, totalCandidates)}
              tone="applied"
            />
          </section>

          <section className="filters-bar">
            <select value={filters.jobId} onChange={(event) => setFilters((current) => ({ ...current, jobId: event.target.value }))}>
              <option value="">All jobs</option>
              {jobs.map((job) => (
                <option value={job.jobId} key={job._id}>
                  {job.companyName} - {job.title || job.role}
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
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by candidate, USN, job title, or company"
            />
          </section>

          {candidates.length ? (
            <section className="jobs-grid">
              {candidates.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  className={`candidate-directory-card ${candidate.id === selectedCandidateId ? 'is-selected' : ''}`}
                  onClick={() => {
                    setSelectedCandidateId(candidate.id);
                    setDetailOpen(true);
                  }}
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
                    <span>Open candidate review</span>
                  </div>
                </button>
              ))}
            </section>
          ) : (
            <div className="empty-state">No data found for the current filters.</div>
          )}

          {selectedCandidate ? (
            <CandidateDetailPanel
              candidate={selectedCandidate}
              open={detailOpen}
              onClose={() => setDetailOpen(false)}
              editable
              onSaveFeedback={handleSaveFeedback}
              savingFeedback={savingFeedback}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

export default CandidatesPage;
