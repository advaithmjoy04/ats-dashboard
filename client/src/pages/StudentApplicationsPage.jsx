import { useEffect, useState } from 'react';
import api from '../api/client';
import { formatDate } from '../utils/formatters';

function StudentApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;

    async function loadApplications() {
      try {
        const response = await api.get('/students/applications/my', { params: { limit: 50 } });
        if (!ignore) {
          setApplications(response.data.items || []);
          setError('');
        }
      } catch (err) {
        if (!ignore) {
          setError(err.response?.data?.message || 'Unable to load your applications.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadApplications();
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="page-stack">
      <section className="toolbar">
        <div>
          <h2 className="page-title">Applications</h2>
          <p className="page-description">Track where each of your applications stands.</p>
        </div>
        <div className="summary-pill">Applications: {applications.length}</div>
      </section>

      {error ? <div className="error-banner">{error}</div> : null}
      {loading ? (
        <div className="screen-center">Loading applications...</div>
      ) : applications.length ? (
        <section className="page-stack">
          {applications.map((application) => (
            <article className="panel" key={application._id}>
              <div className="panel-heading">
                <div>
                  <h2>{application.jobId?.title || application.jobId?.role || '--'}</h2>
                  <span>{application.jobId?.companyName || '--'}</span>
                </div>
                <div className="application-summary-stack">
                  <span className={`status-pill status-${String(application.status || '').toLowerCase()}`}>
                    {application.status}
                  </span>
                  <span className="summary-pill small-pill">{application.currentStageLabel || 'Applied'}</span>
                </div>
              </div>

              <div className="review-grid">
                <div>
                  <strong>Applied On</strong>
                  <span>{formatDate(application.createdAt)}</span>
                </div>
                <div>
                  <strong>Current Stage</strong>
                  <span>{application.currentStageLabel || '--'}</span>
                </div>
              </div>

              <div className="review-block">
                <h4>Submitted Form Details</h4>
                {application.submittedFields?.length ? (
                  <div className="review-grid">
                    {application.submittedFields
                      .filter((field) => field.fieldKey !== 'resume')
                      .map((field) => (
                        <div key={field.fieldKey}>
                          <strong>{field.label}</strong>
                          <span>{String(field.value ?? '--')}</span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="empty-state compact">No saved form answers.</div>
                )}
              </div>

              <div className="review-block">
                <h4>Screening Answers</h4>
                {application.screeningAnswers?.length ? (
                  <ul className="review-list">
                    {application.screeningAnswers.map((answer) => (
                      <li key={answer.questionId}>
                        <strong>{answer.question}:</strong> {String(answer.answer ?? '--')}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="empty-state compact">No screening answers submitted.</div>
                )}
              </div>

              <div className="review-block">
                <h4>Files</h4>
                {application.uploadedArtifacts?.length ? (
                  <div className="review-chip-list">
                    {application.uploadedArtifacts.map((artifact, index) => (
                      <a
                        key={`${artifact.fileKey}-${index}`}
                        className="review-chip"
                        href={artifact.url || application.resumeUrl || '#'}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <strong>{artifact.label || 'Attachment'}</strong>
                        <span>{artifact.originalName || 'View file'}</span>
                      </a>
                    ))}
                  </div>
                ) : application.resumeUrl ? (
                  <a className="text-button" href={application.resumeUrl} target="_blank" rel="noreferrer">
                    View Resume
                  </a>
                ) : (
                  <div className="empty-state compact">No uploaded files recorded.</div>
                )}
              </div>

              <div className="review-block">
                <h4>Feedback</h4>
                {application.feedback?.summary || application.feedback?.notes || application.feedback?.rating ? (
                  <div className="review-summary-card">
                    <div className="review-copy-block">
                      <strong>Summary</strong>
                      <p>{application.feedback?.summary || 'No summary provided.'}</p>
                    </div>
                    <div className="review-copy-block">
                      <strong>Detailed feedback</strong>
                      <p>{application.feedback?.notes || 'No detailed feedback provided yet.'}</p>
                    </div>
                    <div className="review-grid">
                      <div>
                        <strong>Rating</strong>
                        <span>{application.feedback?.rating ? `${application.feedback.rating} / 5` : '--'}</span>
                      </div>
                      <div>
                        <strong>Updated On</strong>
                        <span>{application.feedback?.updatedAt ? formatDate(application.feedback.updatedAt) : '--'}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="empty-state compact">No feedback has been shared for this application yet.</div>
                )}
              </div>
            </article>
          ))}
        </section>
      ) : (
        <div className="empty-state">You have not applied to any jobs yet.</div>
      )}
    </div>
  );
}

export default StudentApplicationsPage;
