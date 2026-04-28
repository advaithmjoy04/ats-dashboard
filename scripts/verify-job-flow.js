const assert = require('assert');
const { Job, Application } = require('../src/models');
const { normalizeJobPayload, DEFAULT_HIRING_STAGES, DEFAULT_APPLICATION_FORM_FIELDS, mapStageToStatus } = require('../src/services');

function verifyDraftNormalization() {
  const payload = normalizeJobPayload({
    title: '',
    description: '',
    publishState: 'DRAFT',
  });

  assert.equal(payload.publishState, 'DRAFT');
  assert.equal(payload.title, 'Untitled Job Draft');
  assert.equal(payload.description, 'Draft in progress');
  assert.ok(Array.isArray(payload.applicationFormFields) && payload.applicationFormFields.length >= DEFAULT_APPLICATION_FORM_FIELDS.length);
  assert.ok(Array.isArray(payload.hiringStages) && payload.hiringStages.length >= DEFAULT_HIRING_STAGES.length);
}

function verifyPublishedValidation() {
  let threw = false;
  try {
    normalizeJobPayload({
      publishState: 'OPEN',
      title: '',
      description: '',
    });
  } catch (error) {
    threw = true;
    assert.match(error.message, /title is required|description is required/i);
  }

  assert.equal(threw, true, 'Published jobs must reject incomplete payloads');
}

function verifyRichJobSchema() {
  const payload = normalizeJobPayload({
    title: 'Product Manager',
    role: 'Product Manager',
    description: 'Lead roadmap and execution.',
    publishState: 'OPEN',
    companyName: 'MITE',
    client: 'MITE',
    department: 'Product',
    workMode: 'HYBRID',
    locations: [{ label: 'Bengaluru', city: 'Bengaluru', state: 'Karnataka', country: 'India' }],
    requiredSkills: ['Strategy', 'Analytics', 'Leadership'],
    applicationFormFields: [
      { key: 'firstName', label: 'First Name', category: 'PERSONAL', mode: 'MANDATORY' },
      { key: 'portfolioUrl', label: 'Portfolio', category: 'PROFESSIONAL', mode: 'OPTIONAL' },
    ],
    screeningQuestions: [
      { questionId: 'q1', question: 'Have you built a product before?', type: 'YES_NO', required: true },
    ],
    hiringStages: [
      { stageKey: 'sourced', label: 'Sourced', order: 0, locked: true },
      { stageKey: 'applied', label: 'Applied', order: 1, locked: true },
      { stageKey: 'interview', label: 'Interview', order: 2, locked: false },
    ],
  });

  const job = new Job({
    tenantId: '507f1f77bcf86cd799439011',
    jobId: 'ATS-999',
    postedBy: '507f1f77bcf86cd799439012',
    ...payload,
  });

  const error = job.validateSync();
  assert.equal(error, undefined, 'Rich job documents should validate');
  assert.equal(job.applicationFormFields.length, 2);
  assert.equal(job.screeningQuestions.length, 1);
  assert.equal(job.hiringStages[2].label, 'Interview');
}

function verifyApplicationSchema() {
  const application = new Application({
    tenantId: '507f1f77bcf86cd799439011',
    jobId: '507f1f77bcf86cd799439013',
    studentId: '507f1f77bcf86cd799439014',
    status: 'APPLIED',
    currentStageKey: 'applied',
    currentStageLabel: 'Applied',
    submittedFields: [
      { fieldKey: 'firstName', label: 'First Name', value: 'Advaith' },
      { fieldKey: 'portfolioUrl', label: 'Portfolio', value: 'https://example.com' },
    ],
    screeningAnswers: [
      { questionId: 'q1', question: 'Have you built a product before?', type: 'YES_NO', answer: 'Yes' },
    ],
    uploadedArtifacts: [
      { label: 'Resume', fileKey: 'resumes/user/file.pdf', originalName: 'resume.pdf', mimeType: 'application/pdf' },
    ],
    stageHistory: [
      { stageKey: 'applied', stageLabel: 'Applied', movedAt: new Date() },
    ],
  });

  const error = application.validateSync();
  assert.equal(error, undefined, 'Job-specific application records should validate');
  assert.equal(application.submittedFields.length, 2);
  assert.equal(application.screeningAnswers.length, 1);
}

function verifyStageMapping() {
  assert.equal(mapStageToStatus('applied'), 'APPLIED');
  assert.equal(mapStageToStatus('interview'), 'SHORTLISTED');
  assert.equal(mapStageToStatus('offered'), 'SELECTED');
  assert.equal(mapStageToStatus('rejected'), 'REJECTED');
}

function main() {
  verifyDraftNormalization();
  verifyPublishedValidation();
  verifyRichJobSchema();
  verifyApplicationSchema();
  verifyStageMapping();
  console.log('Job flow verification passed.');
}

main();
