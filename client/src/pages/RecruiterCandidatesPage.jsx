import { useEffect, useMemo, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import CandidateDetailPanel from '../components/CandidateDetailPanel';
import PipelineBoard from '../components/PipelineBoard';
import StatCard from '../components/StatCard';
import { emitActivityRefresh } from '../utils/activitySignals';
import { formatPercent } from '../utils/formatters';

function RecruiterCandidatesPage() {
  const { search, setSearch, debouncedSearch } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [activeJob, setActiveJob] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [skillFilter, setSkillFilter] = useState('ALL');
  const [prioritySkillFilter, setPrioritySkillFilter] = useState('ALL');
  const [matchFilter, setMatchFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('BEST_MATCH');
  const [savingFeedback, setSavingFeedback] = useState(false);
  const selectedJobId = params.get('jobId') || '';
  const availablePrioritySkills = useMemo(() => activeJob?.prioritySkills || [], [activeJob]);
  const availableCandidateSkills = useMemo(
    () => [...new Set(candidates.flatMap((candidate) => candidate.student?.skills || []))].sort((left, right) => left.localeCompare(right)),
    [candidates]
  );

  useEffect(() => {
    let ignore = false;

    async function loadJobsAndCandidates() {
      try {
        const jobsResponse = await api.get('/recruiters/jobs', { params: { limit: 50 } });
        const recruiterJobs = jobsResponse.data.items || [];
        const activeJobId = selectedJobId || recruiterJobs[0]?.jobId || '';
        let applicants = [];
        const activeJob = recruiterJobs.find((job) => job.jobId === activeJobId) || null;
        if (activeJobId) {
          const candidatesResponse = await api.get('/search', {
            params: { limit: 100, search: debouncedSearch, jobId: activeJobId },
          });
          applicants = candidatesResponse.data.items || [];
        }

        if (!ignore) {
          setJobs(recruiterJobs);
          setActiveJob(activeJob);
          setCandidates(applicants);
          setSelectedCandidate((current) => applicants.find((candidate) => candidate.id === current?.id) || applicants[0] || null);
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
  }, [selectedJobId, setParams, debouncedSearch]);

  useEffect(() => {
    if (prioritySkillFilter !== 'ALL' && !availablePrioritySkills.includes(prioritySkillFilter)) {
      setPrioritySkillFilter('ALL');
    }
  }, [availablePrioritySkills, prioritySkillFilter]);

  useEffect(() => {
    if (skillFilter !== 'ALL' && !availableCandidateSkills.includes(skillFilter)) {
      setSkillFilter('ALL');
    }
  }, [availableCandidateSkills, skillFilter]);

  const filteredCandidates = useMemo(() => {
    const next = candidates.filter((candidate) => {
      const matchesPrioritySkill = prioritySkillFilter === 'ALL'
        || candidate.skillMatch?.matchedPrioritySkills?.includes(prioritySkillFilter);

      const matchesEnteredSkill = skillFilter === 'ALL'
        || candidate.student?.skills?.includes(skillFilter);

      const matchesLevel = matchFilter === 'ALL'
        || (candidate.skillMatch?.matchLevel || 'NONE') === matchFilter;

      return matchesPrioritySkill && matchesEnteredSkill && matchesLevel;
    });

    next.sort((left, right) => {
      if (sortBy === 'BEST_MATCH') {
        return (right.skillMatch?.score || 0) - (left.skillMatch?.score || 0);
      }
      if (sortBy === 'NAME') {
        return String(left.student?.fullName || left.student?.email || '').localeCompare(
          String(right.student?.fullName || right.student?.email || '')
        );
      }
      return new Date(right.appliedAt) - new Date(left.appliedAt);
    });

    return next;
  }, [candidates, prioritySkillFilter, skillFilter, matchFilter, sortBy]);

  const stageCounts = useMemo(
    () =>
      filteredCandidates.reduce((summary, candidate) => {
        const key = candidate.currentStageKey || 'applied';
        summary[key] = (summary[key] || 0) + 1;
        return summary;
      }, {}),
    [filteredCandidates]
  );

  useEffect(() => {
    setSelectedCandidate((current) =>
      filteredCandidates.find((candidate) => candidate.id === current?.id) || filteredCandidates[0] || null
    );
  }, [filteredCandidates]);

  async function handleMoveCandidate(candidateId, nextStageKey) {
    const currentCandidate = candidates.find((candidate) => candidate.id === candidateId);
    if (!currentCandidate || currentCandidate.currentStageKey === nextStageKey) {
      return;
    }
    const nextStage = (activeJob?.hiringStages || []).find((stage) => stage.stageKey === nextStageKey);
    if (!nextStage) {
      return;
    }

    const previousCandidates = candidates;
    setUpdatingId(candidateId);
    setMessage('');
    setError('');
    setCandidates((current) =>
      current.map((candidate) =>
        candidate.id === candidateId
          ? { ...candidate, currentStageKey: nextStage.stageKey, currentStageLabel: nextStage.label }
          : candidate
      )
    );

    try {
      await api.patch(`/recruiters/applications/${candidateId}`, {
        stageKey: nextStage.stageKey,
      });
      setMessage(`Moved ${currentCandidate.student?.fullName || currentCandidate.student?.email} to ${nextStage.label.toLowerCase()}.`);
      emitActivityRefresh({ scope: 'recruiter', action: 'candidate.stage.updated', applicationId: candidateId });
    } catch (err) {
      setCandidates(previousCandidates);
      setError(err.response?.data?.message || 'Unable to update candidate status.');
    } finally {
      setUpdatingId('');
    }
  }

  async function handleSaveFeedback(feedback) {
    if (!selectedCandidate) {
      return;
    }

    setSavingFeedback(true);
    setMessage('');
    setError('');
    try {
      const response = await api.patch(`/recruiters/applications/${selectedCandidate.id}`, {
        feedback,
      });
      const updatedCandidate = {
        ...selectedCandidate,
        feedback: response.data.feedback || feedback,
      };
      setCandidates((current) =>
        current.map((candidate) => (candidate.id === selectedCandidate.id ? updatedCandidate : candidate))
      );
      setSelectedCandidate(updatedCandidate);
      setMessage(`Saved feedback for ${selectedCandidate.student?.fullName || selectedCandidate.student?.email}.`);
      emitActivityRefresh({ scope: 'recruiter', action: 'candidate.feedback.saved', applicationId: selectedCandidate.id });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save candidate feedback.');
    } finally {
      setSavingFeedback(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="toolbar">
        <div>
          <h2 className="page-title">Candidates</h2>
          <p className="page-description">Review applicants for your assigned roles with recruiter-safe pipeline controls and match filters.</p>
        </div>
        <div className="summary-pill">Visible Candidates: {filteredCandidates.length}</div>
      </section>

      {message ? <div className="success-banner">{message}</div> : null}
      {error ? <div className="error-banner">{error}</div> : null}
      {loading ? (
        <div className="screen-center">Loading candidates...</div>
      ) : selectedJobId ? (
        <>
          <section className="stats-grid">
            <StatCard
              title="Visible Candidates"
              value={filteredCandidates.length}
              percent={formatPercent(filteredCandidates.length, filteredCandidates.length || 1)}
              tone="applied"
            />
            <StatCard
              title="Applied"
              value={stageCounts.applied || 0}
              percent={formatPercent(stageCounts.applied || 0, filteredCandidates.length)}
              tone="applied"
            />
            <StatCard
              title="Interview"
              value={stageCounts.interview || 0}
              percent={formatPercent(stageCounts.interview || 0, filteredCandidates.length)}
              tone="shortlisted"
            />
          </section>

          <section className="panel">
            <div className="candidate-directory-shell">
              <div className="candidate-directory-copy">
                <span className="eyebrow">Recruiter View</span>
                <h3>{activeJob?.title || activeJob?.role || 'Assigned Role'}</h3>
                <p className="page-description">
                  Only candidates for your assigned job are visible here. Open any card to review the submitted form, resume, and student-facing feedback.
                </p>
              </div>
              <div className="candidate-directory-stats">
                <article className="candidate-stat-card">
                  <span>Priority Skills</span>
                  <strong>{availablePrioritySkills.length}</strong>
                </article>
                <article className="candidate-stat-card">
                  <span>Visible</span>
                  <strong>{filteredCandidates.length}</strong>
                </article>
              </div>
            </div>
          </section>
          <section className="filters-bar">
            <select value={selectedJobId} onChange={(event) => setParams(event.target.value ? { jobId: event.target.value } : {})}>
              {jobs.length ? null : <option value="">No assigned jobs</option>}
              {jobs.map((job) => (
                <option key={job._id} value={job.jobId}>
                  {job.companyName} - {job.title || job.role}
                </option>
              ))}
            </select>
            <select value={matchFilter} onChange={(event) => setMatchFilter(event.target.value)}>
              <option value="ALL">All Match Levels</option>
              <option value="HIGH">High Match</option>
              <option value="MEDIUM">Medium Match</option>
              <option value="LOW">Low Match</option>
              <option value="NONE">No Match</option>
            </select>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by candidate, USN, job title, or company"
            />
          </section>
          <section className="toolbar-actions">
            <select value={prioritySkillFilter} onChange={(event) => setPrioritySkillFilter(event.target.value)}>
              <option value="ALL">All Priority Skills</option>
              {availablePrioritySkills.map((skill) => (
                <option key={skill} value={skill}>
                  Priority: {skill}
                </option>
              ))}
            </select>
            <select value={skillFilter} onChange={(event) => setSkillFilter(event.target.value)}>
              <option value="ALL">All Entered Skills</option>
              {availableCandidateSkills.map((skill) => (
                <option key={skill} value={skill}>
                  Skill: {skill}
                </option>
              ))}
            </select>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="BEST_MATCH">Best Match</option>
              <option value="RECENT">Most Recent</option>
              <option value="NAME">Candidate Name</option>
            </select>
          </section>
          <PipelineBoard
            candidates={filteredCandidates}
            stages={activeJob?.hiringStages || []}
            onMoveCandidate={handleMoveCandidate}
            onSelectCandidate={setSelectedCandidate}
            selectedCandidateId={selectedCandidate?.id || ''}
            updatingId={updatingId}
          />
          {selectedCandidate ? (
            <CandidateDetailPanel
              candidate={selectedCandidate}
              open={Boolean(selectedCandidate)}
              onClose={() => setSelectedCandidate(null)}
              editable
              onSaveFeedback={handleSaveFeedback}
              savingFeedback={savingFeedback}
            />
          ) : null}
        </>
      ) : (
        <div className="empty-state">Create or assign a recruiter-owned job first, then candidates will appear here.</div>
      )}
    </div>
  );
}

export default RecruiterCandidatesPage;
