import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import { formatDate } from '../utils/formatters';
import { useOutletContext } from 'react-router-dom';
import JobCard from '../components/JobCard';
import PopupShell from '../components/PopupShell';

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

function StudentJobsPage() {
  const { search } = useOutletContext();
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
  const [resumeFile, setResumeFile] = useState(null);
  const [openingFormJobId, setOpeningFormJobId] = useState('');

  async function loadJobs() {
    try {
      const [jobsResponse, applicationsResponse] = await Promise.all([
        api.get('/students/jobs', { params: { limit: 50 } }),
        api.get('/students/applications/my', { params: { limit: 100 } }),
      ]);
      setJobs(jobsResponse.data.items || []);
      setAppliedJobIds(
        (applicationsResponse.data.items || [])
          .map((application) => application.jobId?.jobId)
          .filter(Boolean)
      );
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load open jobs.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadJobs();
  }, []);

  const filteredJobs = useMemo(() => {
    const query = String(search || '').toLowerCase();
    if (!query) {
      return jobs;
    }
    return jobs.filter((job) =>
      [job.companyName, job.title, job.role, job.description, job.jobId].filter(Boolean).join(' ').toLowerCase().includes(query)
    );
  }, [jobs, search]);

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
      setResumeFile(null);
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
          type:
            field.key === 'email'
              ? 'EMAIL'
              : field.key === 'contactNumber'
                ? 'PHONE'
                : field.key === 'resume'
                  ? 'FILE'
                  : 'TEXT',
          value: applicationForm[field.key] ?? '',
        }))));
      payload.append('screeningAnswers', JSON.stringify((applicationSchema.job?.screeningQuestions || []).map((question) => ({
          questionId: question.questionId,
          question: question.question,
          type: question.type,
          answer: screeningAnswers[question.questionId] ?? '',
        }))));
      if (resumeFile) {
        payload.append('resume', resumeFile);
      }

      await api.post('/students/applications', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessage(`Applied to ${selectedJob.companyName} - ${selectedJob.title || selectedJob.role}`);
      setAppliedJobIds((current) => (current.includes(selectedJob.jobId) ? current : [...current, selectedJob.jobId]));
      setSelectedJob(null);
      setApplicationSchema(null);
      setApplicationForm({});
      setScreeningAnswers({});
      setResumeFile(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to apply for this job.');
    } finally {
      setApplyingJobId('');
    }
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
      ) : filteredJobs.length ? (
        <>
          <section className="jobs-grid">
            {filteredJobs.map((job) => (
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
                setResumeFile(null);
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
                        {field.key === 'resume' ? (
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={(event) => setResumeFile(event.target.files?.[0] || null)}
                          />
                        ) : field.key === 'cgpa' ? (
                          <input
                            type="number"
                            min="0"
                            max="10"
                            step="0.1"
                            value={applicationForm[field.key] || ''}
                            onChange={(event) => setApplicationForm((current) => ({ ...current, [field.key]: event.target.value }))}
                            placeholder={field.placeholder || field.label}
                          />
                        ) : field.key === 'educationDetails' || field.key === 'skills' ? (
                          <textarea
                            rows={field.key === 'educationDetails' ? 4 : 3}
                            value={applicationForm[field.key] || ''}
                            onChange={(event) => setApplicationForm((current) => ({ ...current, [field.key]: event.target.value }))}
                            placeholder={field.placeholder || field.label}
                          />
                        ) : (
                          <input
                            value={applicationForm[field.key] || ''}
                            onChange={(event) => setApplicationForm((current) => ({ ...current, [field.key]: event.target.value }))}
                            placeholder={field.placeholder || field.label}
                          />
                        )}
                      </label>
                    ))}

                    {(applicationSchema.job?.screeningQuestions || []).map((question) => (
                      <label className="full-width" key={question.questionId}>
                        {question.question}{question.required ? ' *' : ''}
                        {question.type === 'YES_NO' ? (
                          <select
                            value={screeningAnswers[question.questionId] || ''}
                            onChange={(event) => setScreeningAnswers((current) => ({ ...current, [question.questionId]: event.target.value }))}
                          >
                            <option value="">Select an answer</option>
                            <option value="YES">Yes</option>
                            <option value="NO">No</option>
                          </select>
                        ) : question.type === 'SINGLE_CHOICE' ? (
                          <select
                            value={screeningAnswers[question.questionId] || ''}
                            onChange={(event) => setScreeningAnswers((current) => ({ ...current, [question.questionId]: event.target.value }))}
                          >
                            <option value="">Select an option</option>
                            {(question.options || []).map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            value={screeningAnswers[question.questionId] || ''}
                            onChange={(event) => setScreeningAnswers((current) => ({ ...current, [question.questionId]: event.target.value }))}
                            placeholder={`Answer (${question.type})`}
                          />
                        )}
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
