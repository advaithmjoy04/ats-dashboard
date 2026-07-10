import { useEffect, useState } from 'react';
import api from '../api/client';
import { formatDate } from '../utils/formatters';
import { useOutletContext } from 'react-router-dom';
import JobCard from '../components/JobCard';
import PopupShell from '../components/PopupShell';
import { emitActivityRefresh } from '../utils/activitySignals';

function formatSalary(job) {
  const salary = job?.salary || {};
  if (salary.hideFromCandidates) {
    return 'Hidden';
  }

  const hasMin = Number.isFinite(Number(salary.min));
  const hasMax = Number.isFinite(Number(salary.max));
  if (!hasMin && !hasMax) {
    return 'Not specified';
  }

  const currency = salary.currency || 'INR';
  const formatter = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  });
  const minLabel = hasMin ? formatter.format(Number(salary.min)) : '--';
  const maxLabel = hasMax ? formatter.format(Number(salary.max)) : '--';
  const period = salary.period ? ` / ${String(salary.period).toLowerCase()}` : '';
  return `${currency} ${minLabel}${hasMax ? ` - ${maxLabel}` : ''}${period}`;
}

function inferApplicationFieldType(field = {}) {
  const explicitType = String(field.type || '').trim().toUpperCase();
  if (explicitType) {
    return explicitType;
  }

  const key = String(field.key || '').trim().toLowerCase();
  if (key === 'resume') return 'FILE_UPLOAD';
  if (key === 'email') return 'EMAIL';
  if (key === 'contactNumber' || key === 'phone' || key === 'mobile') return 'PHONE';
  if (key === 'cgpa' || key === 'currentCgpa' || key === 'openings') return 'NUMBER';
  if (key === 'portfolioUrl' || key === 'linkedinUrl' || key === 'githubUrl') return 'URL';
  if (['address', 'workExperience', 'educationDetails', 'skills'].includes(key)) return 'TEXTAREA';
  return 'TEXT';
}

function inferScreeningQuestionType(question = {}) {
  return String(question.type || 'TEXT').trim().toUpperCase() || 'TEXT';
}

function StudentJobsPage() {
  const { debouncedSearch, refreshNotifications } = useOutletContext();
  const [jobs, setJobs] = useState([]);
  const [appliedJobIds, setAppliedJobIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [applyingJobId, setApplyingJobId] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [applicationSchema, setApplicationSchema] = useState(null);
  const [applicationForm, setApplicationForm] = useState({});
  const [screeningAnswers, setScreeningAnswers] = useState({});
  const [applicationFiles, setApplicationFiles] = useState({});
  const [screeningFiles, setScreeningFiles] = useState({});
  const [openingFormJobId, setOpeningFormJobId] = useState('');

  async function loadJobs() {
    try {
      const [jobsResponse, applicationsResponse] = await Promise.all([
        api.get('/search', { params: { limit: 50, search: debouncedSearch } }),
        api.get('/students/applications/my', { params: { limit: 100 } }),
      ]);
      setJobs(jobsResponse.data.items || []);
      setAppliedJobIds(
        (applicationsResponse.data.items || [])
          .map((application) => application.jobId?.jobId)
          .filter(Boolean)
      );
      setError('');
      refreshNotifications?.();
      emitActivityRefresh({ scope: 'student', action: 'jobs.loaded' });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load open jobs.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadJobs();
  }, [debouncedSearch]);

  async function openApplicationForm(job) {
    setOpeningFormJobId(job.jobId);
    setMessage('');
    setError('');
    try {
      const response = await api.get(`/students/jobs/${encodeURIComponent(job.jobId)}/form`);
      const formConfig = response.data;
      const nextForm = {};
      (formConfig.job?.applicationFormFields || []).forEach((field) => {
        nextForm[field.key] = '';
      });
      setSelectedJob(job);
      setApplicationSchema(formConfig);
      setApplicationForm(nextForm);
      setScreeningAnswers({});
      setApplicationFiles({});
      setScreeningFiles({});
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load this application form.');
    } finally {
      setOpeningFormJobId('');
    }
  }

  async function handleSubmitApplication(event) {
    event.preventDefault();
    if (!selectedJob || !applicationSchema) {
      return;
    }

    setApplyingJobId(selectedJob.jobId);
    setMessage('');
    setError('');
    try {
      const payload = new FormData();
      payload.append('jobId', selectedJob.jobId);
      payload.append('submittedFields', JSON.stringify((applicationSchema.job?.applicationFormFields || []).map((field) => ({
          fieldKey: field.key,
          label: field.label,
          type: inferApplicationFieldType(field),
          value: inferApplicationFieldType(field) === 'FILE_UPLOAD' ? applicationFiles[field.key]?.name || '' : applicationForm[field.key] ?? '',
        }))));
      payload.append('screeningAnswers', JSON.stringify((applicationSchema.job?.screeningQuestions || []).map((question) => ({
          questionId: question.questionId,
          question: question.question,
          type: inferScreeningQuestionType(question),
          answer: inferScreeningQuestionType(question) === 'FILE_UPLOAD' ? screeningFiles[question.questionId]?.name || '' : screeningAnswers[question.questionId] ?? '',
        }))));
      if (applicationFiles.resume) {
        payload.append('resume', applicationFiles.resume);
      }
      Object.entries(applicationFiles).forEach(([fieldKey, file]) => {
        if (fieldKey !== 'resume' && file) {
          payload.append(`field_${fieldKey}`, file);
        }
      });
      Object.entries(screeningFiles).forEach(([questionId, file]) => {
        if (file) {
          payload.append(`screening_${questionId}`, file);
        }
      });

      await api.post('/students/applications', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessage(`Applied to ${selectedJob.companyName} - ${selectedJob.title || selectedJob.role}`);
      setAppliedJobIds((current) => (current.includes(selectedJob.jobId) ? current : [...current, selectedJob.jobId]));
      setSelectedJob(null);
      setApplicationSchema(null);
      setApplicationForm({});
      setScreeningAnswers({});
      setApplicationFiles({});
      setScreeningFiles({});
      refreshNotifications?.();
      emitActivityRefresh({ scope: 'student', action: 'application.created', jobId: selectedJob.jobId });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to apply for this job.');
    } finally {
      setApplyingJobId('');
    }
  }

  function updateApplicationValue(fieldKey, value) {
    setApplicationForm((current) => ({ ...current, [fieldKey]: value }));
  }

  function updateApplicationFile(fieldKey, file) {
    setApplicationFiles((current) => ({ ...current, [fieldKey]: file || null }));
  }

  function updateScreeningValue(questionId, value) {
    setScreeningAnswers((current) => ({ ...current, [questionId]: value }));
  }

  function updateScreeningFile(questionId, file) {
    setScreeningFiles((current) => ({ ...current, [questionId]: file || null }));
  }

  function renderFieldInput(field) {
    const fieldType = inferApplicationFieldType(field);

    if (fieldType === 'FILE_UPLOAD') {
      return (
        <>
          <input
            type="file"
            accept=".pdf,.docx"
            onChange={(event) => updateApplicationFile(field.key, event.target.files?.[0] || null)}
          />
          {applicationFiles[field.key] ? <small>{applicationFiles[field.key].name}</small> : null}
        </>
      );
    }

    if (fieldType === 'NUMBER') {
      return (
        <input
          type="number"
          min="0"
          max={field.key === 'cgpa' ? '10' : undefined}
          step={field.key === 'cgpa' ? '0.1' : '1'}
          value={applicationForm[field.key] || ''}
          onChange={(event) => updateApplicationValue(field.key, event.target.value)}
          placeholder={field.placeholder || field.label}
        />
      );
    }

    if (fieldType === 'TEXTAREA') {
      return (
        <textarea
          rows={field.key === 'educationDetails' ? 4 : 3}
          value={applicationForm[field.key] || ''}
          onChange={(event) => updateApplicationValue(field.key, event.target.value)}
          placeholder={field.placeholder || field.label}
        />
      );
    }

    return (
      <input
        type={fieldType === 'EMAIL' ? 'email' : fieldType === 'URL' ? 'url' : fieldType === 'PHONE' ? 'tel' : 'text'}
        value={applicationForm[field.key] || ''}
        onChange={(event) => updateApplicationValue(field.key, event.target.value)}
        placeholder={field.placeholder || field.label}
      />
    );
  }

  function renderQuestionInput(question) {
    const questionType = inferScreeningQuestionType(question);

    if (questionType === 'YES_NO') {
      return (
        <select
          value={screeningAnswers[question.questionId] || ''}
          onChange={(event) => updateScreeningValue(question.questionId, event.target.value)}
        >
          <option value="">Select an answer</option>
          <option value="YES">Yes</option>
          <option value="NO">No</option>
        </select>
      );
    }

    if (questionType === 'SINGLE_CHOICE') {
      return (
        <select
          value={screeningAnswers[question.questionId] || ''}
          onChange={(event) => updateScreeningValue(question.questionId, event.target.value)}
        >
          <option value="">Select an option</option>
          {(question.options || []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    if (questionType === 'FILE_UPLOAD') {
      return (
        <>
          <input
            type="file"
            accept=".pdf,.docx"
            onChange={(event) => updateScreeningFile(question.questionId, event.target.files?.[0] || null)}
          />
          {screeningFiles[question.questionId] ? <small>{screeningFiles[question.questionId].name}</small> : null}
        </>
      );
    }

    return (
      <input
        type={questionType === 'URL' ? 'url' : 'text'}
        value={screeningAnswers[question.questionId] || ''}
        onChange={(event) => updateScreeningValue(question.questionId, event.target.value)}
        placeholder={`Answer (${questionType})`}
      />
    );
  }

  return (
    <div className="page-stack">
      <section className="toolbar">
        <div>
          <h2 className="page-title">Open Jobs</h2>
          <p className="page-description">Browse live postings and open the job-specific application form for each role.</p>
        </div>
      </section>

      {message ? <div className="success-banner">{message}</div> : null}
      {error ? <div className="error-banner">{error}</div> : null}

      {loading ? (
        <div className="screen-center">Loading job postings...</div>
      ) : jobs.length ? (
        <>
          <section className="jobs-grid">
            {jobs.map((job) => (
              <JobCard
                key={job._id}
                job={job}
                onOpen={
                  appliedJobIds.includes(job.jobId)
                    ? undefined
                    : () => openApplicationForm(job)
                }
                statusLabel={appliedJobIds.includes(job.jobId) ? 'APPLIED' : openingFormJobId === job.jobId ? 'LOADING' : 'OPEN'}
                footerNote={
                  appliedJobIds.includes(job.jobId)
                    ? 'Application already submitted'
                    : openingFormJobId === job.jobId
                      ? 'Opening application form...'
                      : 'Click card to apply'
                }
                metaItems={[
                  { label: 'Job ID', value: job.jobId },
                  { label: 'Salary', value: formatSalary(job) },
                  { label: 'Openings', value: job.openings ?? '--' },
                ]}
              />
            ))}
          </section>

          {selectedJob && applicationSchema ? (
            <PopupShell
              open={Boolean(selectedJob && applicationSchema)}
              onClose={() => {
                setSelectedJob(null);
                setApplicationSchema(null);
                setApplicationForm({});
                setScreeningAnswers({});
                setApplicationFiles({});
                setScreeningFiles({});
              }}
              title={`Apply to ${selectedJob.title || selectedJob.role}`}
              subtitle={selectedJob.companyName || 'Campus Partner'}
            >
              <div className="job-about-form popup-form-body">
                <section className="job-form-section">
                <h4>Job Details</h4>
                <div className="review-grid">
                  <div>
                    <strong>Job ID</strong>
                    <span>{selectedJob.jobId || '--'}</span>
                  </div>
                  <div>
                    <strong>Company</strong>
                    <span>{selectedJob.companyName || '--'}</span>
                  </div>
                  <div>
                    <strong>Openings</strong>
                    <span>{selectedJob.openings ?? '--'}</span>
                  </div>
                  <div>
                    <strong>Salary</strong>
                    <span>{formatSalary(selectedJob)}</span>
                  </div>
                  <div>
                    <strong>Work Mode</strong>
                    <span>{selectedJob.workMode ? String(selectedJob.workMode).replaceAll('_', ' ') : '--'}</span>
                  </div>
                  <div>
                    <strong>Locations</strong>
                    <span>
                      {Array.isArray(selectedJob.locations) && selectedJob.locations.length
                        ? selectedJob.locations.map((location) => location.label || location.city || location.state || location.country).filter(Boolean).join(', ')
                        : '--'}
                    </span>
                  </div>
                  <div>
                    <strong>Deadline</strong>
                    <span>{selectedJob.deadline ? formatDate(selectedJob.deadline) : '--'}</span>
                  </div>
                  <div>
                    <strong>Minimum CGPA</strong>
                    <span>{selectedJob.minCgpa ?? '--'}</span>
                  </div>
                </div>
                <div className="review-copy-block">
                  <strong>Description</strong>
                  <p>{selectedJob.description || 'No description available.'}</p>
                </div>
                <div className="review-copy-block">
                  <strong>Required Skills</strong>
                  {selectedJob.requiredSkills?.length ? (
                    <div className="review-chip-list">
                      {selectedJob.requiredSkills.map((skill) => (
                        <div className="review-chip" key={skill}>
                          <strong>{skill}</strong>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>No required skills listed.</p>
                  )}
                </div>
                </section>

                <section className="job-form-section">
                  <h4>Application Form</h4>
                  <form className="job-form" onSubmit={handleSubmitApplication}>
                    {(applicationSchema.job?.applicationFormFields || []).map((field) => (
                      <label key={field.key} className={field.key === 'resume' ? 'full-width' : ''}>
                        {field.label}{field.mode === 'MANDATORY' ? ' *' : ''}
                        {renderFieldInput(field)}
                      </label>
                    ))}

                    {(applicationSchema.job?.screeningQuestions || []).map((question) => (
                      <label className="full-width" key={question.questionId}>
                        {question.question}{question.required ? ' *' : ''}
                        {renderQuestionInput(question)}
                      </label>
                    ))}

                    <button type="submit" className="primary-button full-width" disabled={applyingJobId === selectedJob.jobId}>
                      {applyingJobId === selectedJob.jobId ? 'Submitting...' : 'Submit Application'}
                    </button>
                  </form>
                </section>
              </div>
            </PopupShell>
          ) : null}
        </>
      ) : (
        <div className="empty-state">There are no active jobs matching your search yet.</div>
      )}
    </div>
  );
}

export default StudentJobsPage;
