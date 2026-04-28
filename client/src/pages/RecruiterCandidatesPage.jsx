import { useEffect, useMemo, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import CandidateDetailPanel from '../components/CandidateDetailPanel';
import PipelineBoard from '../components/PipelineBoard';

function RecruiterCandidatesPage() {
  const { search } = useOutletContext();
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
        let activeJob = null;
        if (activeJobId) {
          const candidatesResponse = await api.get(`/recruiters/jobs/${activeJobId}/applicants`, {
            params: { limit: 100 },
          });
          applicants = candidatesResponse.data.items || [];
          activeJob = candidatesResponse.data.job || null;
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
  }, [selectedJobId, setParams]);

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
    const query = String(search || '').toLowerCase();
    const next = candidates.filter((candidate) => {
      const matchesSearch = !query || [
        candidate.student?.fullName,
        candidate.student?.email,
        candidate.student?.usn,
        candidate.student?.branch,
        candidate.job?.role,
        candidate.job?.companyName,
        candidate.job?.jobId,
        candidate.currentStageLabel,
        ...(candidate.skillMatch?.matchedSkills || []),
        ...(candidate.skillMatch?.matchedPrioritySkills || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query);

      const matchesPrioritySkill = prioritySkillFilter === 'ALL'
        || candidate.skillMatch?.matchedPrioritySkills?.includes(prioritySkillFilter);

      const matchesEnteredSkill = skillFilter === 'ALL'
        || candidate.student?.skills?.includes(skillFilter);

      const matchesLevel = matchFilter === 'ALL'
        || (candidate.skillMatch?.matchLevel || 'NONE') === matchFilter;

      return matchesSearch && matchesPrioritySkill && matchesEnteredSkill && matchesLevel;
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
  }, [candidates, search, prioritySkillFilter, matchFilter, sortBy]);

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
          <select value={matchFilter} onChange={(event) => setMatchFilter(event.target.value)}>
            <option value="ALL">All Match Levels</option>
            <option value="HIGH">High Match</option>
            <option value="MEDIUM">Medium Match</option>
            <option value="LOW">Low Match</option>
            <option value="NONE">No Match</option>
          </select>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="BEST_MATCH">Best Match</option>
            <option value="RECENT">Most Recent</option>
            <option value="NAME">Candidate Name</option>
          </select>
        </div>
      </section>

      {message ? <div className="success-banner">{message}</div> : null}
      {error ? <div className="error-banner">{error}</div> : null}
      {loading ? (
        <div className="screen-center">Loading candidates...</div>
      ) : selectedJobId ? (
        <>
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
