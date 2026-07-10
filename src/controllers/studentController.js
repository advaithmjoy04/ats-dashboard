const { Application, Job, StudentProfile } = require('../models');
const { sendApplicationConfirmation, paginate, uploadResumeForStudent, getResumeReadUrl, deleteObject } = require('../services');
const { extractResumeFields, extractResumeText } = require('../services/resumeExtractionService');
const { buildResumeKey, uploadBuffer } = require('../utils/s3');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { getRequestOrigin } = require('../utils/requestOrigin');
const { sendData, sendMessage } = require('../utils/response');
const { getRequestTenantId } = require('../utils/tenantScope');
const config = require('../config');
const MIN_RESUME_TEXT_LENGTH = 80;
const DEFAULT_STAGE = { stageKey: 'applied', label: 'Applied' };

function parsePayloadArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }
  return [];
}

function sanitizeSubmittedFields(fields = []) {
  if (!Array.isArray(fields)) {
    return [];
  }

  return fields
    .map((field) => {
      if (!field || typeof field !== 'object') {
        return null;
      }

      const fieldKey = String(field.fieldKey || field.key || '').trim();
      const label = String(field.label || '').trim();
      if (!fieldKey || !label) {
        return null;
      }

      return {
        fieldKey,
        label,
        type: String(field.type || 'TEXT').trim().toUpperCase(),
        value: field.value ?? null,
      };
    })
    .filter(Boolean);
}

function sanitizeScreeningAnswers(answers = []) {
  if (!Array.isArray(answers)) {
    return [];
  }

  return answers
    .map((answer) => {
      if (!answer || typeof answer !== 'object') {
        return null;
      }

      const questionId = String(answer.questionId || '').trim();
      const question = String(answer.question || '').trim();
      if (!questionId || !question) {
        return null;
      }

      return {
        questionId,
        question,
        type: String(answer.type || 'TEXT').trim().toUpperCase(),
        answer: answer.answer ?? null,
      };
    })
    .filter(Boolean);
}

function getVisibleApplicationFields(job) {
  return Array.isArray(job?.applicationFormFields)
    ? job.applicationFormFields.filter((field) => field.mode !== 'OFF')
    : [];
}

function getSubmittedFieldValue(submittedFields, fieldKey) {
  const answer = submittedFields.find((item) => item.fieldKey === fieldKey);
  if (!answer) {
    return '';
  }

  if (Array.isArray(answer.value)) {
    return answer.value.join(' ').trim();
  }

  return String(answer.value ?? '').trim();
}

function buildUploadedFileMap(req) {
  const incomingFiles = Array.isArray(req.files)
    ? req.files
    : Array.isArray(req.file)
      ? req.file
      : req.file
        ? [req.file]
        : [];

  return new Map(incomingFiles.map((file) => [file.fieldname, file]));
}

function buildApplicationFieldFileInputName(fieldKey) {
  return `field_${fieldKey}`;
}

function buildScreeningFileInputName(questionId) {
  return `screening_${questionId}`;
}

const getJobApplicationForm = catchAsync(async (req, res, next) => {
  const job = await Job.findOne({ tenantId: req.user.tenantId, jobId: req.params.jobId, status: 'OPEN' }).lean();
  if (!job) {
    return next(new AppError('Job not found', 404));
  }

  return sendData(res, 200, {
    job: {
      id: job._id,
      jobId: job.jobId,
      title: job.title || job.role,
      companyName: job.companyName,
      description: job.description,
      workMode: job.workMode,
      locations: job.locations || [],
      requiredSkills: job.requiredSkills || [],
      minCgpa: job.minCgpa,
      experience: job.experience || {},
      applicationFormFields: getVisibleApplicationFields(job),
      screeningQuestions: job.screeningQuestions || [],
    },
  });
});

const getProfile = catchAsync(async (req, res, next) => {
  const profile = await StudentProfile.findOne({ userId: req.user.id, tenantId: req.user.tenantId });
  if (!profile) return next(new AppError('Profile not found', 404));
  return sendData(res, 200, {
    ...profile.toObject(),
    resumeUrl: profile.resumeKey ? await getResumeReadUrl(profile.resumeKey) : null,
  });
});

const updateProfile = catchAsync(async (req, res, next) => {
  const allowedFields = ['fullName', 'branch', 'semester', 'cgpa', 'phone', 'skills', 'educationDetails', 'profileCompleted'];
  const updates = Object.fromEntries(
    Object.entries(req.body).filter(([key]) => allowedFields.includes(key))
  );
  if (Array.isArray(updates.skills)) {
    updates.skills = updates.skills.map((value) => String(value).trim()).filter(Boolean);
  }
  const profile = await StudentProfile.findOneAndUpdate({ userId: req.user.id, tenantId: req.user.tenantId }, updates, { new: true, runValidators: true });
  if (!profile) return next(new AppError('Profile not found', 404));
  return sendData(res, 200, {
    ...profile.toObject(),
    resumeUrl: profile.resumeKey ? await getResumeReadUrl(profile.resumeKey) : null,
  });
});

const uploadResume = catchAsync(async (req, res, next) => {
  if (!req.file) return next(new AppError('Resume file required', 400));
  const profile = await StudentProfile.findOne({ userId: req.user.id, tenantId: req.user.tenantId });
  if (!profile) return next(new AppError('Profile not found', 404));
  let resumeText = '';
  let extracted = {
    fullName: undefined,
    email: undefined,
    branch: undefined,
    cgpa: undefined,
    phone: undefined,
    educationDetails: undefined,
    skills: [],
  };
  let missingFields = ['fullName', 'email', 'branch', 'cgpa', 'phone', 'educationDetails', 'skills'];
  let resumeTextDetected = false;

  try {
    resumeText = await extractResumeText(req.file);
    resumeTextDetected = resumeText.trim().length >= MIN_RESUME_TEXT_LENGTH;
    if (resumeTextDetected) {
      const extraction = await extractResumeFields(resumeText);
      extracted = extraction.extracted;
      missingFields = extraction.missingFields;
    }
  } catch (error) {
    // If parsing fails, still store the resume and let the student fill details manually.
  }

  Object.assign(profile, await uploadResumeForStudent(req.user.id, req.file, profile.resumeKey), {
    fullName: extracted.fullName || profile.fullName,
    branch: extracted.branch || profile.branch,
    cgpa: extracted.cgpa ?? profile.cgpa,
    phone: extracted.phone || profile.phone,
    educationDetails: extracted.educationDetails || profile.educationDetails,
    skills: extracted.skills.length ? extracted.skills : profile.skills,
    resumeExtractedText: resumeText || '',
    resumeExtractedAt: new Date(),
    resumeTextDetected,
    resumeExtractionMissingFields: missingFields,
  });
  await profile.save();
  return sendData(res, 200, {
    resumeKey: profile.resumeKey,
    resumeOriginalName: profile.resumeOriginalName,
    resumeMimeType: profile.resumeMimeType,
    resumeSize: profile.resumeSize,
    extractedFields: {
      fullName: profile.fullName || '',
      email: req.user.email || '',
      branch: profile.branch || '',
      cgpa: profile.cgpa,
      phone: profile.phone || '',
      educationDetails: profile.educationDetails || '',
      skills: profile.skills || [],
    },
    resumeTextDetected,
    missingFields,
    extractionMessage: resumeTextDetected
      ? 'Resume uploaded. We extracted whatever details we could find, and you can fill in anything missing below.'
      : 'Resume uploaded, but we could not detect readable text. This usually happens with scanned or image-only PDFs. Please fill the profile manually or upload a text PDF/DOCX.',
  });
});

const getResumeUrl = catchAsync(async (req, res, next) => {
  const profile = await StudentProfile.findOne({ userId: req.user.id, tenantId: req.user.tenantId });
  if (!profile?.resumeKey) return next(new AppError('Resume not found', 404));
  return sendData(res, 200, { url: await getResumeReadUrl(profile.resumeKey) });
});

const listJobs = catchAsync(async (req, res) => {
  const query = { tenantId: req.user.tenantId, status: 'OPEN' };
  const trimmedSearch = String(req.query.search || '').trim();
  if (trimmedSearch) {
    const searchRegex = new RegExp(trimmedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [
      { title: searchRegex },
      { role: searchRegex },
      { companyName: searchRegex },
      { jobId: searchRegex },
    ];
  }
  const result = await paginate(Job, query, { page: req.query.page, limit: req.query.limit });
  return sendData(res, 200, result);
});

const applyJob = catchAsync(async (req, res, next) => {
  const job = await Job.findOne({ tenantId: req.user.tenantId, jobId: req.body.jobId, status: 'OPEN' });
  if (!job) return next(new AppError('Job not found', 404));
  const uploadedFileMap = buildUploadedFileMap(req);
  const submittedFields = sanitizeSubmittedFields(parsePayloadArray(req.body.submittedFields));
  const screeningAnswers = sanitizeScreeningAnswers(parsePayloadArray(req.body.screeningAnswers));
  const visibleFields = getVisibleApplicationFields(job);
  const mandatoryFields = visibleFields.filter((field) => field.mode === 'MANDATORY');

  for (const field of mandatoryFields) {
    const normalizedValue = getSubmittedFieldValue(submittedFields, field.key);
    const fieldFile = uploadedFileMap.get(buildApplicationFieldFileInputName(field.key));

    if (field.key === 'resume') {
      if (!uploadedFileMap.get('resume')) {
        return next(new AppError('Upload a resume to apply for this job', 400));
      }
      continue;
    }

    if (field.type === 'FILE_UPLOAD') {
      if (!fieldFile) {
        return next(new AppError(`${field.label} is required for this application`, 400));
      }
      continue;
    }

    if (!normalizedValue) {
      return next(new AppError(`${field.label} is required for this application`, 400));
    }
  }

  const requiredQuestions = Array.isArray(job.screeningQuestions)
    ? job.screeningQuestions.filter((question) => question.required)
    : [];
  for (const question of requiredQuestions) {
    const answer = screeningAnswers.find((item) => item.questionId === question.questionId);
    const questionFile = uploadedFileMap.get(buildScreeningFileInputName(question.questionId));
    if (question.type === 'FILE_UPLOAD') {
      if (!questionFile) {
        return next(new AppError(`Answer required for: ${question.question}`, 400));
      }
      continue;
    }
    const normalizedAnswer = Array.isArray(answer?.answer) ? answer.answer.join(' ').trim() : String(answer?.answer ?? '').trim();
    if (!normalizedAnswer) {
      return next(new AppError(`Answer required for: ${question.question}`, 400));
    }
  }

  const submittedCgpaField = submittedFields.find((field) => ['cgpa', 'currentCgpa'].includes(field.fieldKey));
  const submittedCgpa = submittedCgpaField ? Number(submittedCgpaField.value) : undefined;
  if (job.minCgpa !== undefined && job.minCgpa !== null) {
    if (!Number.isFinite(Number(submittedCgpa))) {
      return next(new AppError('CGPA is required for this application', 400));
    }
    if (Number(submittedCgpa) < (job.minCgpa ?? 0)) {
      return next(new AppError('Minimum CGPA not met', 400));
    }
  }

  const appliedStage = Array.isArray(job.hiringStages)
    ? job.hiringStages.find((stage) => stage.stageKey === 'applied') || job.hiringStages[0]
    : DEFAULT_STAGE;

  let resumeKey;
  let resumeOriginalName;
  let resumeMimeType;
  let resumeSize;
  const uploadedArtifacts = [];
  const resumeFile = uploadedFileMap.get('resume');

  if (resumeFile) {
    resumeKey = buildResumeKey(req.user.id, resumeFile.originalname);
    await uploadBuffer({
      key: resumeKey,
      body: resumeFile.buffer,
      contentType: resumeFile.mimetype,
    });
    resumeOriginalName = resumeFile.originalname;
    resumeMimeType = resumeFile.mimetype;
    resumeSize = resumeFile.size;
    uploadedArtifacts.push({
      fieldKey: 'resume',
      label: 'Resume',
      fileKey: resumeKey,
      originalName: resumeOriginalName,
      mimeType: resumeMimeType,
      size: resumeSize,
    });
  }

  const normalizedSubmittedFields = visibleFields
    .map((field) => {
      const fieldFile = uploadedFileMap.get(buildApplicationFieldFileInputName(field.key));
      const submittedField = submittedFields.find((item) => item.fieldKey === field.key);
      if (field.key === 'resume') {
        return {
          fieldKey: field.key,
          label: field.label,
          type: field.type || 'FILE_UPLOAD',
          value: resumeOriginalName || submittedField?.value || null,
        };
      }
      if (field.type === 'FILE_UPLOAD') {
        if (!fieldFile) {
          return submittedField || null;
        }
        uploadedArtifacts.push({
          fieldKey: field.key,
          label: field.label,
          fileKey: buildResumeKey(req.user.id, fieldFile.originalname),
          originalName: fieldFile.originalname,
          mimeType: fieldFile.mimetype,
          size: fieldFile.size,
        });
        return {
          fieldKey: field.key,
          label: field.label,
          type: field.type,
          value: fieldFile.originalname,
        };
      }
      return submittedField || {
        fieldKey: field.key,
        label: field.label,
        type: field.type || 'TEXT',
        value: null,
      };
    })
    .filter(Boolean);

  const normalizedScreeningAnswers = (job.screeningQuestions || [])
    .map((question) => {
      const uploadedQuestionFile = uploadedFileMap.get(buildScreeningFileInputName(question.questionId));
      const answer = screeningAnswers.find((item) => item.questionId === question.questionId);
      if (question.type === 'FILE_UPLOAD') {
        if (!uploadedQuestionFile) {
          return answer || null;
        }
        uploadedArtifacts.push({
          fieldKey: question.questionId,
          label: question.question,
          fileKey: buildResumeKey(req.user.id, uploadedQuestionFile.originalname),
          originalName: uploadedQuestionFile.originalname,
          mimeType: uploadedQuestionFile.mimetype,
          size: uploadedQuestionFile.size,
        });
        return {
          questionId: question.questionId,
          question: question.question,
          type: question.type,
          answer: uploadedQuestionFile.originalname,
        };
      }
      return answer || {
        questionId: question.questionId,
        question: question.question,
        type: question.type,
        answer: null,
      };
    })
    .filter(Boolean);

  for (const artifact of uploadedArtifacts.filter((item) => item.fieldKey !== 'resume')) {
    const matchingFile =
      uploadedFileMap.get(buildApplicationFieldFileInputName(artifact.fieldKey))
      || uploadedFileMap.get(buildScreeningFileInputName(artifact.fieldKey));
    if (!matchingFile) {
      continue;
    }
    await uploadBuffer({
      key: artifact.fileKey,
      body: matchingFile.buffer,
      contentType: matchingFile.mimetype,
    });
  }

  const application = await Application.create({
    tenantId: getRequestTenantId(req, { allowPlatformSuperAdmin: false }),
    jobId: job._id,
    studentId: req.user.id,
    status: 'APPLIED',
    resumeKey,
    resumeOriginalName,
    resumeMimeType,
    resumeSize,
    submittedFields: normalizedSubmittedFields,
    screeningAnswers: normalizedScreeningAnswers,
    uploadedArtifacts,
    currentStageKey: appliedStage?.stageKey || DEFAULT_STAGE.stageKey,
    currentStageLabel: appliedStage?.label || DEFAULT_STAGE.label,
    stageHistory: [
      {
        stageKey: appliedStage?.stageKey || DEFAULT_STAGE.stageKey,
        stageLabel: appliedStage?.label || DEFAULT_STAGE.label,
        movedAt: new Date(),
        movedBy: req.user.id,
        note: 'Application submitted',
      },
    ],
  });
  const fullNameField = submittedFields.find((field) => field.fieldKey === 'firstName');
  const lastNameField = submittedFields.find((field) => field.fieldKey === 'lastName');
  const applicantFullName = [fullNameField?.value, lastNameField?.value].filter(Boolean).join(' ').trim();
  await sendApplicationConfirmation({
    email: req.user.email,
    fullName: applicantFullName || req.user.fullName || req.user.email,
    jobTitle: job.title,
    companyName: job.companyName,
    tenantId: req.user.tenantId,
    appOrigin: getRequestOrigin(req, {
      frontendOrigin: config.frontendOrigin,
      nodeEnv: config.nodeEnv,
    }),
  });
  return sendData(res, 201, application);
});

const myApplications = catchAsync(async (req, res) => {
  const result = await paginate(Application, { tenantId: req.user.tenantId, studentId: req.user.id }, {
    page: req.query.page,
    limit: req.query.limit,
    populate: { path: 'jobId', match: { tenantId: req.user.tenantId } },
  });
  result.items = await Promise.all(
    result.items.map(async (application) => ({
      ...application,
      feedback: application.feedback || {},
      resumeUrl: application.resumeKey ? await getResumeReadUrl(application.resumeKey) : null,
      uploadedArtifacts: await Promise.all(
        (application.uploadedArtifacts || []).map(async (artifact) => ({
          ...artifact,
          url: artifact.fileKey ? await getResumeReadUrl(artifact.fileKey) : null,
        }))
      ),
    }))
  );
  return sendData(res, 200, result);
});

const withdrawApplication = catchAsync(async (req, res, next) => {
  const application = await Application.findOne({ _id: req.params.id, tenantId: req.user.tenantId, studentId: req.user.id });
  if (!application) return next(new AppError('Application not found', 404));
  application.status = 'WITHDRAWN';
  await application.save();
  return sendMessage(res, 200, 'Application withdrawn successfully');
});

const deleteOwnApplication = catchAsync(async (req, res, next) => {
  const application = await Application.findOneAndDelete({ _id: req.params.id, tenantId: req.user.tenantId, studentId: req.user.id });
  if (!application) return next(new AppError('Application not found', 404));
  return sendMessage(res, 200, 'Application deleted successfully');
});

module.exports = {
  getProfile,
  updateProfile,
  uploadResume,
  getResumeUrl,
  listJobs,
  getJobApplicationForm,
  applyJob,
  myApplications,
  withdrawApplication,
  deleteOwnApplication,
};
