import { useEffect, useState } from 'react';
import PopupShell from './PopupShell';
import { formatDate } from '../utils/formatters';

function formatAnswerValue(value) {
  if (Array.isArray(value)) {
    return value.join(', ') || '--';
  }
  if (value === null || value === undefined || value === '') {
    return '--';
  }
  return String(value);
}

function CandidateDetailPanel({
  candidate,
  showJobSummary = true,
  open = true,
  onClose,
  editable = false,
  onSaveFeedback,
  savingFeedback = false,
}) {
  const [activeTab, setActiveTab] = useState('resume');
  const [summary, setSummary] = useState(candidate?.feedback?.summary || '');
  const [notes, setNotes] = useState(candidate?.feedback?.notes || '');
  const [rating, setRating] = useState(candidate?.feedback?.rating || '');

  useEffect(() => {
    setSummary(candidate?.feedback?.summary || '');
    setNotes(candidate?.feedback?.notes || '');
    setRating(candidate?.feedback?.rating || '');
    setActiveTab('resume');
  }, [candidate?.id]);

  if (!candidate) {
    return null;
  }

  const applicationFields = (candidate.submittedFields || []).filter((field) => field.fieldKey !== 'resume');
  const primaryResumeLink = candidate.uploadedArtifacts?.find((artifact) => artifact.fieldKey === 'resume')?.url || candidate.student?.resumeUrl;
  const artifactMap = new Map((candidate.uploadedArtifacts || []).map((artifact) => [artifact.fieldKey, artifact]));

  async function handleSubmitFeedback(event) {
    event.preventDefault();
    if (!editable || !onSaveFeedback) {
      return;
    }
    await onSaveFeedback({
      summary: summary.trim(),
      notes: notes.trim(),
      rating: rating ? Number(rating) : undefined,
    });
  }

  return (
    <PopupShell
      open={open}
      onClose={onClose}
      title={candidate.student?.fullName || candidate.student?.email}
      subtitle={candidate.student?.email || '--'}
      className="candidate-popup-shell"
    >
      <div className="job-about-form popup-form-body">
      <div className="panel-heading">
        <div className="application-summary-stack">
          <span className="summary-pill small-pill">{candidate.currentStageLabel || '--'}</span>
          <span className={`status-pill status-${String(candidate.status || '').toLowerCase()}`}>
            {candidate.status}
          </span>
        </div>
      </div>

      <div className="review-grid candidate-detail-grid">
        <div>
          <strong>USN</strong>
          <span>{candidate.student?.usn || '--'}</span>
        </div>
        <div>
          <strong>Branch</strong>
          <span>{candidate.student?.branch || '--'}</span>
        </div>
        <div>
          <strong>Semester</strong>
          <span>{candidate.student?.semester ?? '--'}</span>
        </div>
        <div>
          <strong>CGPA</strong>
          <span>{candidate.student?.cgpa ?? '--'}</span>
        </div>
        <div>
          <strong>Applied On</strong>
          <span>{formatDate(candidate.appliedAt)}</span>
        </div>
        {showJobSummary ? (
          <div>
            <strong>Job</strong>
            <span>
              {candidate.job?.companyName || '--'} - {candidate.job?.role || '--'}
            </span>
          </div>
        ) : null}
      </div>

      <div className="tabs-row">
        <button type="button" className={`tab-button ${activeTab === 'resume' ? 'is-active' : ''}`} onClick={() => setActiveTab('resume')}>
          Resume
        </button>
        <button type="button" className={`tab-button ${activeTab === 'application' ? 'is-active' : ''}`} onClick={() => setActiveTab('application')}>
          Application Form
        </button>
        <button type="button" className={`tab-button ${activeTab === 'feedback' ? 'is-active' : ''}`} onClick={() => setActiveTab('feedback')}>
          Feedback
        </button>
      </div>

      {activeTab === 'resume' ? (
        <section className="job-form-section">
          <h3>Resume</h3>
          {primaryResumeLink ? (
            <a className="primary-button" href={primaryResumeLink} target="_blank" rel="noreferrer">
              Open Resume
            </a>
          ) : (
            <div className="empty-state compact">No resume available.</div>
          )}
          {candidate.uploadedArtifacts?.filter((artifact) => artifact.fieldKey !== 'resume').length ? (
            <div className="review-chip-list">
              {candidate.uploadedArtifacts.filter((artifact) => artifact.fieldKey !== 'resume').map((artifact, index) => (
                <a
                  key={`${artifact.fileKey}-${index}`}
                  className="review-chip"
                  href={artifact.url || '#'}
                  target="_blank"
                  rel="noreferrer"
                >
                  <strong>{artifact.label || 'Attachment'}</strong>
                  <span>{artifact.originalName || 'View file'}</span>
                </a>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {activeTab === 'application' ? (
        <section className="job-form-section">
          <h3>Application Form</h3>
          {applicationFields.length ? (
            <div className="review-grid">
              {applicationFields.map((field) => (
                <div key={field.fieldKey}>
                  <strong>{field.label}</strong>
                  {field.type === 'FILE_UPLOAD' && artifactMap.get(field.fieldKey)?.url ? (
                    <a href={artifactMap.get(field.fieldKey).url} target="_blank" rel="noreferrer">
                      {artifactMap.get(field.fieldKey).originalName || 'View file'}
                    </a>
                  ) : (
                    <span>{formatAnswerValue(field.value)}</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state compact">No form answers recorded.</div>
          )}
          {candidate.screeningAnswers?.length ? (
            <div className="review-block">
              <h4>Screening Answers</h4>
              <ul className="review-list">
                {candidate.screeningAnswers.map((answer) => (
                  <li key={answer.questionId}>
                    <strong>{answer.question}:</strong>{' '}
                    {answer.type === 'FILE_UPLOAD' && artifactMap.get(answer.questionId)?.url ? (
                      <a href={artifactMap.get(answer.questionId).url} target="_blank" rel="noreferrer">
                        {artifactMap.get(answer.questionId).originalName || 'View file'}
                      </a>
                    ) : (
                      formatAnswerValue(answer.answer)
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="compact">No screening responses submitted.</div>
          )}
        </section>
      ) : null}

      {activeTab === 'feedback' ? (
        <section className="job-form-section">
          <h3>Feedback</h3>
          {editable ? (
            <form className="job-form" onSubmit={handleSubmitFeedback}>
              <label className="full-width">
                Summary
                <input value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Short student-facing feedback summary" />
              </label>
              <label className="full-width">
                Detailed feedback
                <textarea rows="6" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Write feedback that the student can see." />
              </label>
              <label>
                Rating
                <select value={rating} onChange={(event) => setRating(event.target.value)}>
                  <option value="">No rating</option>
                  <option value="1">1 / 5</option>
                  <option value="2">2 / 5</option>
                  <option value="3">3 / 5</option>
                  <option value="4">4 / 5</option>
                  <option value="5">5 / 5</option>
                </select>
              </label>
              <button type="submit" className="primary-button" disabled={savingFeedback}>
                {savingFeedback ? 'Saving Feedback...' : 'Save Feedback'}
              </button>
            </form>
          ) : (
            <div className="review-summary-card">
              <div className="review-copy-block">
                <strong>Summary</strong>
                <p>{candidate.feedback?.summary || 'No feedback summary yet.'}</p>
              </div>
              <div className="review-copy-block">
                <strong>Detailed feedback</strong>
                <p>{candidate.feedback?.notes || 'No detailed feedback has been shared yet.'}</p>
              </div>
              <div className="review-grid">
                <div>
                  <strong>Rating</strong>
                  <span>{candidate.feedback?.rating ? `${candidate.feedback.rating} / 5` : '--'}</span>
                </div>
                <div>
                  <strong>Updated</strong>
                  <span>{candidate.feedback?.updatedAt ? formatDate(candidate.feedback.updatedAt) : '--'}</span>
                </div>
              </div>
            </div>
          )}
        </section>
      ) : null}
      </div>
    </PopupShell>
  );
}

export default CandidateDetailPanel;
