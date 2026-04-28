import { useEffect, useMemo, useState } from 'react';

const defaultApplicationFields = [
  { key: 'firstName', label: 'First Name', category: 'Personal Information', mode: 'MANDATORY', placeholder: 'First Name' },
  { key: 'lastName', label: 'Last Name', category: 'Personal Information', mode: 'MANDATORY', placeholder: 'Last Name' },
  { key: 'email', label: 'Email', category: 'Personal Information', mode: 'MANDATORY', placeholder: 'Email Address' },
  { key: 'contactNumber', label: 'Contact Number', category: 'Personal Information', mode: 'MANDATORY', placeholder: 'Contact Number' },
  { key: 'address', label: 'Address', category: 'Personal Information', mode: 'OFF', placeholder: 'Address' },
  { key: 'resume', label: 'Resume', category: 'Professional Information', mode: 'MANDATORY', placeholder: '' },
  { key: 'cgpa', label: 'CGPA', category: 'Academic Information', mode: 'OPTIONAL', placeholder: 'Enter CGPA' },
  { key: 'skills', label: 'Skills', category: 'Professional Information', mode: 'OPTIONAL', placeholder: 'List relevant skills' },
  { key: 'workExperience', label: 'Work Experience', category: 'Professional Information', mode: 'OPTIONAL', placeholder: 'Work Experience' },
  { key: 'educationDetails', label: 'Education Details', category: 'Professional Information', mode: 'OPTIONAL', placeholder: 'Education Details' },
  { key: 'noticePeriod', label: 'Notice Period', category: 'Professional Information', mode: 'OFF', placeholder: 'Notice Period' },
  { key: 'portfolioUrl', label: 'Work Link / Portfolio', category: 'Professional Information', mode: 'OFF', placeholder: 'Portfolio URL' },
];

const defaultHiringStages = [
  { stageKey: 'sourced', label: 'Sourced', order: 0, locked: true },
  { stageKey: 'applied', label: 'Applied', order: 1, locked: true },
  { stageKey: 'contacted', label: 'Contacted', order: 2, locked: false },
  { stageKey: 'interview', label: 'Interview', order: 3, locked: false },
  { stageKey: 'offered', label: 'Offered', order: 4, locked: true },
  { stageKey: 'rejected', label: 'Rejected', order: 5, locked: true },
];

const initialState = {
  title: '',
  companyName: '',
  client: '',
  department: '',
  workMode: 'IN_OFFICE',
  locationsText: '',
  description: '',
  requiredSkillsText: '',
  prioritySkills: [],
  salaryPeriod: 'ANNUAL',
  salaryMin: '',
  salaryMax: '',
  salaryCurrency: 'INR',
  hideSalaryFromCandidates: false,
  experienceMinYears: '',
  experienceMaxYears: '',
  employmentType: '',
  industryType: '',
  openings: '',
  minCgpa: '',
  deadline: '',
  assignedRecruiterId: '',
  publishState: 'OPEN',
  applicationFormFields: defaultApplicationFields,
  screeningQuestions: [],
  hiringStages: defaultHiringStages,
};

const emptyQuestion = {
  question: '',
  type: 'TEXT',
  required: true,
  optionsText: '',
};

function parseCommaSeparated(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function CreateJobModal({
  open,
  recruiters = [],
  onClose,
  onSubmit,
  submitting,
  allowRecruiterAssignments = false,
  heading = 'About Job',
}) {
  const [form, setForm] = useState(initialState);
  const [currentStep, setCurrentStep] = useState('ABOUT');
  const [draftQuestion, setDraftQuestion] = useState(emptyQuestion);
  const [dragStageKey, setDragStageKey] = useState('');
  const [publishValidationError, setPublishValidationError] = useState('');
  const parsedRequiredSkills = useMemo(() => parseCommaSeparated(form.requiredSkillsText), [form.requiredSkillsText]);
  const visibleApplicationFields = useMemo(
    () => form.applicationFormFields.filter((field) => field.mode !== 'OFF'),
    [form.applicationFormFields]
  );

  useEffect(() => {
    if (!open) {
      setForm(initialState);
      setCurrentStep('ABOUT');
      setDraftQuestion(emptyQuestion);
      setDragStageKey('');
      setPublishValidationError('');
    }
  }, [open]);

  if (!open) {
    return null;
  }

  function handleChange(event) {
    const { name, value, type, checked, options, multiple } = event.target;

    if (type === 'checkbox') {
      setForm((current) => ({ ...current, [name]: checked }));
      return;
    }

    if (multiple) {
      setForm((current) => ({
        ...current,
        [name]: Array.from(options)
          .filter((option) => option.selected)
          .map((option) => option.value),
      }));
      return;
    }

    if (name === 'requiredSkillsText') {
      const nextSkills = parseCommaSeparated(value);
      setForm((current) => ({
        ...current,
        requiredSkillsText: value,
        prioritySkills: current.prioritySkills.filter((skill) => nextSkills.includes(skill)),
      }));
      return;
    }

    if (name === 'assignedRecruiterId') {
      setPublishValidationError('');
    }

    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({
      title: form.title.trim(),
      role: form.title.trim(),
      companyName: form.companyName.trim() || form.client.trim(),
      client: form.client.trim(),
      department: form.department.trim(),
      workMode: form.workMode,
      locations: parseCommaSeparated(form.locationsText).map((label) => ({ label })),
      description: form.description.trim(),
      requiredSkills: parsedRequiredSkills,
      prioritySkills: form.prioritySkills.filter((skill) => parsedRequiredSkills.includes(skill)),
      salary: {
        period: form.salaryPeriod,
        min: form.salaryMin === '' ? undefined : Number(form.salaryMin),
        max: form.salaryMax === '' ? undefined : Number(form.salaryMax),
        currency: form.salaryCurrency.trim().toUpperCase(),
        hideFromCandidates: form.hideSalaryFromCandidates,
      },
      experience: {
        minYears: form.experienceMinYears === '' ? undefined : Number(form.experienceMinYears),
        maxYears: form.experienceMaxYears === '' ? undefined : Number(form.experienceMaxYears),
      },
      employmentType: form.employmentType.trim(),
      industryType: form.industryType.trim(),
      openings: form.openings === '' ? undefined : Number(form.openings),
      minCgpa: form.minCgpa === '' ? undefined : Number(form.minCgpa),
      deadline: form.deadline || undefined,
      publishState: form.publishState,
      status: form.publishState,
      assignedRecruiters: allowRecruiterAssignments && form.assignedRecruiterId ? [form.assignedRecruiterId] : [],
      applicationFormFields: form.applicationFormFields.map(({ key, label, category, mode, placeholder }) => ({
        key,
        label,
        category,
        mode,
        placeholder,
      })),
      screeningQuestions: form.screeningQuestions.map((question, index) => ({
        questionId: question.questionId || `question-${index + 1}`,
        question: question.question,
        type: question.type,
        required: question.required,
        options: question.type === 'SINGLE_CHOICE' ? parseCommaSeparated(question.optionsText) : [],
      })),
      hiringStages: form.hiringStages.map((stage, index) => ({
        stageKey: stage.stageKey,
        label: stage.label.trim(),
        order: index,
        locked: stage.locked,
      })),
    });
  }

  function updateFieldMode(fieldKey, nextMode) {
    setForm((current) => ({
      ...current,
      applicationFormFields: current.applicationFormFields.map((field) =>
        field.key === fieldKey ? { ...field, mode: nextMode } : field
      ),
    }));
  }

  function addScreeningQuestion() {
    if (!draftQuestion.question.trim()) {
      return;
    }

    setForm((current) => ({
      ...current,
      screeningQuestions: [
        ...current.screeningQuestions,
        {
          questionId: `question-${current.screeningQuestions.length + 1}`,
          question: draftQuestion.question.trim(),
          type: draftQuestion.type,
          required: draftQuestion.required,
          optionsText: draftQuestion.optionsText,
        },
      ],
    }));
    setDraftQuestion(emptyQuestion);
  }

  function removeQuestion(questionId) {
    setForm((current) => ({
      ...current,
      screeningQuestions: current.screeningQuestions.filter((question) => question.questionId !== questionId),
    }));
  }

  function updateStageLabel(stageKey, label) {
    setForm((current) => ({
      ...current,
      hiringStages: current.hiringStages.map((stage) =>
        stage.stageKey === stageKey ? { ...stage, label } : stage
      ),
    }));
  }

  function reorderStages(sourceKey, targetKey) {
    if (!sourceKey || !targetKey || sourceKey === targetKey) {
      return;
    }

    setForm((current) => {
      const stages = [...current.hiringStages];
      const sourceIndex = stages.findIndex((stage) => stage.stageKey === sourceKey);
      const targetIndex = stages.findIndex((stage) => stage.stageKey === targetKey);

      if (sourceIndex === -1 || targetIndex === -1) {
        return current;
      }

      const [movedStage] = stages.splice(sourceIndex, 1);
      stages.splice(targetIndex, 0, movedStage);

      return {
        ...current,
        hiringStages: stages.map((stage, index) => ({ ...stage, order: index })),
      };
    });
  }

  function togglePrioritySkill(skillLabel) {
    setForm((current) => ({
      ...current,
      prioritySkills: current.prioritySkills.includes(skillLabel)
        ? current.prioritySkills.filter((skill) => skill !== skillLabel)
        : [...current.prioritySkills, skillLabel],
    }));
  }

  function addHiringStage() {
    setForm((current) => {
      const nextIndex = current.hiringStages.length;
      return {
        ...current,
        hiringStages: [
          ...current.hiringStages,
          {
            stageKey: `custom-stage-${nextIndex + 1}`,
            label: `Custom Stage ${nextIndex + 1}`,
            order: nextIndex,
            locked: false,
          },
        ],
      };
    });
  }

  function removeHiringStage(stageKey) {
    setForm((current) => ({
      ...current,
      hiringStages: current.hiringStages
        .filter((stage) => stage.stageKey !== stageKey || stage.locked)
        .map((stage, index) => ({ ...stage, order: index })),
    }));
  }

  return (
    <div className="modal-overlay" role="presentation">
      <div className="modal-card modal-card-wide">
        <div className="panel-heading wizard-heading">
          <div>
            <p className="eyebrow">Step 1</p>
            <h2>{heading}</h2>
            <p className="page-description">Set the core job details before moving to application form and hiring flow.</p>
          </div>
          <button type="button" className="text-button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="job-wizard-shell">
          <aside className="job-wizard-sidebar">
            <button
              type="button"
              className={`job-step-pill${currentStep === 'ABOUT' ? ' is-active' : ''}`}
              onClick={() => setCurrentStep('ABOUT')}
            >
              About Job
            </button>
            <button
              type="button"
              className={`job-step-pill${currentStep === 'APPLICATION_FORM' ? ' is-active' : ''}`}
              onClick={() => setCurrentStep('APPLICATION_FORM')}
            >
              Application Form
            </button>
            <button
              type="button"
              className={`job-step-pill${currentStep === 'HIRING_FLOW' ? ' is-active' : ''}`}
              onClick={() => setCurrentStep('HIRING_FLOW')}
            >
              Hiring Flow
            </button>
            <button
              type="button"
              className={`job-step-pill${currentStep === 'REVIEW' ? ' is-active' : ''}`}
              onClick={() => setCurrentStep('REVIEW')}
            >
              Review & Publish
            </button>
          </aside>

          <form className="job-about-form" onSubmit={handleSubmit}>
            {currentStep === 'ABOUT' ? (
              <>
                <section className="job-form-section">
                  <h3>Basic Details</h3>
                  <div className="job-form-grid">
                    <label className="full-width">
                      Job title
                      <input name="title" value={form.title} onChange={handleChange} placeholder="Enter the job title" />
                    </label>
                    <label>
                      Company / Client
                      <input name="companyName" value={form.companyName} onChange={handleChange} placeholder="Enter company or client" />
                    </label>
                    <label>
                      Internal client label
                      <input name="client" value={form.client} onChange={handleChange} placeholder="Optional internal client name" />
                    </label>
                    <label>
                      Department
                      <input name="department" value={form.department} onChange={handleChange} placeholder="Engineering, Sales, Product..." />
                    </label>
                    <label>
                      Deadline
                      <input name="deadline" type="date" value={form.deadline} onChange={handleChange} />
                    </label>
                  </div>
                </section>

                <section className="job-form-section">
                  <h3>Work Setup</h3>
                  <div className="segmented-control">
                    {[
                      ['IN_OFFICE', 'In-Office'],
                      ['HYBRID', 'Hybrid'],
                      ['REMOTE', 'Remote'],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        className={`segment-button${form.workMode === value ? ' is-active' : ''}`}
                        onClick={() => setForm((current) => ({ ...current, workMode: value }))}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <label className="full-width">
                    Location(s)
                    <input
                      name="locationsText"
                      value={form.locationsText}
                      onChange={handleChange}
                      placeholder="Bengaluru, Mangaluru, Remote"
                    />
                  </label>
                </section>

                <section className="job-form-section">
                  <h3>Job Description</h3>
                  <label className="full-width">
                    Description
                    <textarea
                      name="description"
                      rows="6"
                      value={form.description}
                      onChange={handleChange}
                      placeholder="Describe responsibilities, expectations, and candidate requirements."
                    />
                  </label>
                  <label className="full-width">
                    Required skills
                    <input
                      name="requiredSkillsText"
                      value={form.requiredSkillsText}
                      onChange={handleChange}
                      placeholder="React, Node.js, MongoDB, Communication"
                    />
                  </label>
                  <div className="priority-skills-panel">
                    <div className="priority-skills-copy">
                      <strong>Priority skills</strong>
                      <span>Mark the most important skills so recruiters can filter and sort candidates faster.</span>
                    </div>
                    {parsedRequiredSkills.length ? (
                      <div className="priority-skill-chip-list">
                        {parsedRequiredSkills.map((skill) => {
                          const isPriority = form.prioritySkills.includes(skill);
                          return (
                            <button
                              key={skill}
                              type="button"
                              className={`priority-skill-chip${isPriority ? ' is-priority' : ''}`}
                              onClick={() => togglePrioritySkill(skill)}
                            >
                              <span className="priority-skill-star">{isPriority ? '★' : '☆'}</span>
                              <span>{skill}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="empty-state compact">Add at least three required skills, then mark the priority ones here.</div>
                    )}
                  </div>
                </section>

                <section className="job-form-section">
                  <h3>Employment Details</h3>
                  <div className="job-form-grid">
                    <label>
                      Salary period
                      <select name="salaryPeriod" value={form.salaryPeriod} onChange={handleChange}>
                        <option value="HOURLY">Hourly</option>
                        <option value="MONTHLY">Monthly</option>
                        <option value="ANNUAL">Annual</option>
                      </select>
                    </label>
                    <label>
                      Currency
                      <input name="salaryCurrency" value={form.salaryCurrency} onChange={handleChange} placeholder="INR" />
                    </label>
                    <label>
                      Salary min
                      <input name="salaryMin" type="number" min="0" value={form.salaryMin} onChange={handleChange} placeholder="Ex: 600000" />
                    </label>
                    <label>
                      Salary max
                      <input name="salaryMax" type="number" min="0" value={form.salaryMax} onChange={handleChange} placeholder="Ex: 1200000" />
                    </label>
                    <label>
                      Employment type
                      <input name="employmentType" value={form.employmentType} onChange={handleChange} placeholder="Full-time, Internship..." />
                    </label>
                    <label>
                      Industry type
                      <input name="industryType" value={form.industryType} onChange={handleChange} placeholder="Software, SaaS, Fintech..." />
                    </label>
                    <label>
                      Openings
                      <input name="openings" type="number" min="1" value={form.openings} onChange={handleChange} />
                    </label>
                    {allowRecruiterAssignments ? (
                      <label className="full-width">
                        Assigned recruiter
                        <select name="assignedRecruiterId" value={form.assignedRecruiterId} onChange={handleChange}>
                          <option value="">Select a recruiter</option>
                          {recruiters.map((recruiter) => (
                            <option key={recruiter._id} value={recruiter._id}>
                              {recruiter.fullName || recruiter.email}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                    <label>
                      Minimum CGPA
                      <input name="minCgpa" type="number" min="0" max="10" step="0.1" value={form.minCgpa} onChange={handleChange} />
                    </label>
                    <label className="checkbox-row full-width">
                      <input
                        name="hideSalaryFromCandidates"
                        type="checkbox"
                        checked={form.hideSalaryFromCandidates}
                        onChange={handleChange}
                      />
                      <span>Hide salary details from candidates</span>
                    </label>
                  </div>
                </section>

              </>
            ) : currentStep === 'APPLICATION_FORM' ? (
              <div className="application-builder-layout">
                <section className="job-form-section">
                  <h3>Suggested Fields</h3>
                  <div className="application-field-list">
                    {form.applicationFormFields.map((field) => (
                      <div className="application-field-row" key={field.key}>
                        <div>
                          <strong>{field.label}</strong>
                          <span>{field.category}</span>
                        </div>
                        <div className="segmented-control compact-segments">
                          {['MANDATORY', 'OPTIONAL', 'OFF'].map((mode) => (
                            <button
                              key={mode}
                              type="button"
                              className={`segment-button${field.mode === mode ? ' is-active' : ''}`}
                              onClick={() => updateFieldMode(field.key, mode)}
                            >
                              {mode === 'MANDATORY' ? 'Mandatory' : mode === 'OPTIONAL' ? 'Optional' : 'Off'}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="screening-questions-block">
                    <div className="panel-heading compact-heading">
                      <div>
                        <h3>Screening Questions</h3>
                        <p className="page-description">Add custom questions to narrow down the applicant pool.</p>
                      </div>
                    </div>

                    {form.screeningQuestions.length ? (
                      <div className="question-chip-list">
                        {form.screeningQuestions.map((question) => (
                          <div className="question-chip" key={question.questionId}>
                            <div>
                              <strong>{question.question}</strong>
                              <span>{question.type}{question.required ? ' • Required' : ''}</span>
                            </div>
                            <button type="button" className="text-button" onClick={() => removeQuestion(question.questionId)}>
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-state compact">No questions added yet.</div>
                    )}

                    <div className="job-form-grid">
                      <label className="full-width">
                        Question
                        <input
                          value={draftQuestion.question}
                          onChange={(event) => setDraftQuestion((current) => ({ ...current, question: event.target.value }))}
                          placeholder="Add a screening question"
                        />
                      </label>
                      <label>
                        Answer type
                        <select
                          value={draftQuestion.type}
                          onChange={(event) => setDraftQuestion((current) => ({ ...current, type: event.target.value }))}
                        >
                          <option value="TEXT">Text</option>
                          <option value="YES_NO">Yes / No</option>
                          <option value="SINGLE_CHOICE">Single Choice</option>
                          <option value="FILE_UPLOAD">File Upload</option>
                          <option value="URL">URL</option>
                        </select>
                      </label>
                      <label className="checkbox-row">
                        <input
                          type="checkbox"
                          checked={draftQuestion.required}
                          onChange={(event) => setDraftQuestion((current) => ({ ...current, required: event.target.checked }))}
                        />
                        <span>Required</span>
                      </label>
                      {draftQuestion.type === 'SINGLE_CHOICE' ? (
                        <label className="full-width">
                          Options
                          <input
                            value={draftQuestion.optionsText}
                            onChange={(event) => setDraftQuestion((current) => ({ ...current, optionsText: event.target.value }))}
                            placeholder="Option 1, Option 2, Option 3"
                          />
                        </label>
                      ) : null}
                    </div>
                    <button type="button" className="primary-button" onClick={addScreeningQuestion}>
                      Add Question
                    </button>
                  </div>
                </section>

                <aside className="job-form-section application-preview-card">
                  <div className="panel-heading compact-heading">
                    <div>
                      <h3>Application Form Preview</h3>
                      <p className="page-description">This is how the student application form will look for this job.</p>
                    </div>
                  </div>

                  <div className="application-preview-hero">
                    <div className="job-logo">{(form.companyName || form.client || form.title || 'JB').slice(0, 2).toUpperCase()}</div>
                    <div>
                      <strong>{form.title || 'Job title preview'}</strong>
                      <span>{form.companyName || form.client || 'Company / client preview'}</span>
                    </div>
                  </div>

                  <div className="preview-field-list">
                    {visibleApplicationFields.map((field) => (
                      <div className="preview-field" key={field.key}>
                        <strong>{field.label}{field.mode === 'MANDATORY' ? ' *' : ''}</strong>
                        {field.key === 'resume' ? (
                          <div className="preview-upload-box">Upload resume for this application</div>
                        ) : field.key === 'educationDetails' || field.key === 'skills' ? (
                          <textarea rows={field.key === 'educationDetails' ? 4 : 3} readOnly placeholder={field.placeholder || field.label} />
                        ) : (
                          <input readOnly placeholder={field.placeholder || field.label} />
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="preview-screening-block">
                    <h4>Screening Questions</h4>
                    {form.screeningQuestions.length ? (
                      form.screeningQuestions.map((question) => (
                        <div className="preview-question" key={question.questionId}>
                          <strong>{question.question}</strong>
                          <span>{question.type}{question.required ? ' • Required' : ''}</span>
                        </div>
                      ))
                    ) : (
                      <div className="empty-state compact">No custom screening questions yet.</div>
                    )}
                  </div>
                </aside>
              </div>
            ) : currentStep === 'HIRING_FLOW' ? (
              <section className="job-form-section">
                <div className="panel-heading compact-heading">
                  <div>
                    <h3>Setup Interview Stages</h3>
                    <p className="page-description">Define how candidates move through this specific hiring pipeline.</p>
                  </div>
                  <button type="button" className="primary-button" onClick={addHiringStage}>
                    Add Stage
                  </button>
                </div>

                <div className="hiring-stage-board">
                  {form.hiringStages.map((stage, index) => (
                    <div
                      className={`hiring-stage-column${dragStageKey === stage.stageKey ? ' is-dragging' : ''}`}
                      key={stage.stageKey}
                      draggable
                      onDragStart={() => setDragStageKey(stage.stageKey)}
                      onDragEnd={() => setDragStageKey('')}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => {
                        reorderStages(dragStageKey, stage.stageKey);
                        setDragStageKey('');
                      }}
                    >
                      <div className="hiring-stage-column-head">
                        <span className="hiring-stage-accent" />
                        <div className="hiring-stage-head-copy">
                          <span className="hiring-stage-position">Stage {index + 1}</span>
                          <label>
                            <input
                              value={stage.label}
                              onChange={(event) => updateStageLabel(stage.stageKey, event.target.value)}
                            />
                          </label>
                        </div>
                        <div className="hiring-stage-inline-actions">
                          <span className="drag-hint" title="Drag to reorder">⋮⋮</span>
                          {!stage.locked ? (
                            <button type="button" className="text-button" onClick={() => removeHiringStage(stage.stageKey)}>
                              Remove
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <div className="hiring-stage-column-body">
                        {[0, 1, 2].map((placeholder) => (
                          <div className="hiring-stage-candidate-shell" key={`${stage.stageKey}-${placeholder}`}>
                            <div className="candidate-shell-avatar" />
                            <div className="candidate-shell-lines">
                              <span />
                              <span />
                            </div>
                            <div className="candidate-shell-meta">
                              <span />
                              <span />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="hiring-stage-column-foot">
                        {stage.locked ? (
                          <span className="summary-pill small-pill">Default stage</span>
                        ) : (
                          <span className="summary-pill small-pill">Custom stage</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

              </section>
            ) : (
              <section className="job-form-section">
                <div className="panel-heading compact-heading">
                  <div>
                    <h3>Review Job Setup</h3>
                    <p className="page-description">Check the final setup, confirm recruiter assignment, and publish the job.</p>
                  </div>
                </div>

                <div className="review-block">
                  <h4>About Job</h4>
                  <div className="review-grid">
                    <div><strong>Title</strong><span>{form.title || 'Untitled Job'}</span></div>
                    <div><strong>Company</strong><span>{form.companyName || form.client || '--'}</span></div>
                    <div><strong>Department</strong><span>{form.department || '--'}</span></div>
                    <div><strong>Work Mode</strong><span>{form.workMode.replace('_', ' ')}</span></div>
                    <div><strong>Locations</strong><span>{form.locationsText || '--'}</span></div>
                    <div><strong>Deadline</strong><span>{form.deadline || '--'}</span></div>
                    <div><strong>Employment Type</strong><span>{form.employmentType || '--'}</span></div>
                    <div><strong>Industry Type</strong><span>{form.industryType || '--'}</span></div>
                    <div><strong>Openings</strong><span>{form.openings || '--'}</span></div>
                    <div><strong>Minimum CGPA</strong><span>{form.minCgpa || '--'}</span></div>
                    {allowRecruiterAssignments ? (
                      <div className="full-width">
                        <strong>Assigned Recruiter</strong>
                        <span>
                          {recruiters.find((recruiter) => recruiter._id === form.assignedRecruiterId)?.fullName
                            || recruiters.find((recruiter) => recruiter._id === form.assignedRecruiterId)?.email
                            || 'Not selected'}
                        </span>
                      </div>
                    ) : null}
                  </div>
                  <div className="review-copy-block">
                    <strong>Description</strong>
                    <p>{form.description || 'No description added yet.'}</p>
                  </div>
                  <div className="review-copy-block">
                    <strong>Required Skills</strong>
                    <p>{form.requiredSkillsText || 'No skills specified yet.'}</p>
                  </div>
                  <div className="review-copy-block">
                    <strong>Priority Skills</strong>
                    {form.prioritySkills.length ? (
                      <div className="review-chip-list">
                        {form.prioritySkills.map((skill) => (
                          <div className="review-chip" key={skill}>
                            <strong>{skill}</strong>
                            <span>Priority</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p>No priority skills marked yet.</p>
                    )}
                  </div>
                </div>

                <div className="review-block">
                  <h4>Application Form</h4>
                  <div className="review-chip-list">
                    {form.applicationFormFields
                      .filter((field) => field.mode !== 'OFF')
                      .map((field) => (
                        <div className="review-chip" key={field.key}>
                          <strong>{field.label}</strong>
                          <span>{field.mode === 'MANDATORY' ? 'Mandatory' : 'Optional'}</span>
                        </div>
                      ))}
                  </div>
                  <div className="review-copy-block">
                    <strong>Screening Questions</strong>
                    {form.screeningQuestions.length ? (
                      <ul className="review-list">
                        {form.screeningQuestions.map((question) => (
                          <li key={question.questionId}>
                            {question.question} ({question.type})
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>No screening questions added.</p>
                    )}
                  </div>
                </div>

                <div className="review-block">
                  <h4>Hiring Flow</h4>
                  <div className="review-chip-list">
                    {form.hiringStages.map((stage) => (
                      <div className="review-chip" key={stage.stageKey}>
                        <strong>{stage.label}</strong>
                        <span>{stage.locked ? 'Default' : 'Custom'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            <div className="job-form-actions">
              <button type="button" className="text-button" onClick={onClose}>
                Cancel
              </button>
              {currentStep === 'APPLICATION_FORM' ? (
                <button type="button" className="text-button" onClick={() => setCurrentStep('ABOUT')}>
                  Back to About Job
                </button>
              ) : null}
              {currentStep === 'HIRING_FLOW' ? (
                <button type="button" className="text-button" onClick={() => setCurrentStep('APPLICATION_FORM')}>
                  Back to Application Form
                </button>
              ) : null}
              {currentStep === 'REVIEW' ? (
                <button type="button" className="text-button" onClick={() => setCurrentStep('HIRING_FLOW')}>
                  Back to Hiring Flow
                </button>
              ) : null}
              {currentStep === 'ABOUT' ? (
                <button type="button" className="primary-button" onClick={() => setCurrentStep('APPLICATION_FORM')}>
                  Continue to Application Form
                </button>
              ) : null}
              {currentStep === 'APPLICATION_FORM' ? (
                <button type="button" className="primary-button" onClick={() => setCurrentStep('HIRING_FLOW')}>
                  Continue to Hiring Flow
                </button>
              ) : null}
              {currentStep === 'HIRING_FLOW' ? (
                <button type="button" className="primary-button" onClick={() => setCurrentStep('REVIEW')}>
                  Continue to Review
                </button>
              ) : null}
              {currentStep === 'REVIEW' ? (
                <>
                  {publishValidationError ? <span className="form-error-text">{publishValidationError}</span> : null}
                  <button
                    type="button"
                    className="primary-button"
                    disabled={submitting || (allowRecruiterAssignments && !form.assignedRecruiterId)}
                    onClick={() => {
                      if (allowRecruiterAssignments && !form.assignedRecruiterId) {
                        setPublishValidationError('Select a recruiter before publishing this job.');
                        return;
                      }
                      setPublishValidationError('');
                      setForm((current) => ({ ...current, publishState: 'OPEN' }));
                      setTimeout(() => document.querySelector('.job-about-form').requestSubmit(), 0);
                    }}
                  >
                    {submitting ? 'Publishing...' : 'Publish'}
                  </button>
                </>
              ) : null}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CreateJobModal;
