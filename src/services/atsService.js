const { createHash } = require('crypto');
const { Application, Job, StudentProfile, Tenant, User } = require('../models');
const AppError = require('../utils/AppError');
const { buildResumeKey, deleteObject, getReadUrl, uploadBuffer } = require('../utils/s3');
const { getDefaultTenantId } = require('./tenantService');

const APPLICATION_STATUSES = ['APPLIED', 'SHORTLISTED', 'REJECTED', 'SELECTED', 'WITHDRAWN'];
const DEFAULT_APPLICATION_FORM_FIELDS = [
  { key: 'firstName', label: 'First Name', category: 'PERSONAL', type: 'TEXT', mode: 'MANDATORY', placeholder: 'First Name' },
  { key: 'lastName', label: 'Last Name', category: 'PERSONAL', type: 'TEXT', mode: 'MANDATORY', placeholder: 'Last Name' },
  { key: 'email', label: 'Email', category: 'PERSONAL', type: 'EMAIL', mode: 'MANDATORY', placeholder: 'Email Address' },
  { key: 'contactNumber', label: 'Contact Number', category: 'PERSONAL', type: 'PHONE', mode: 'MANDATORY', placeholder: 'Contact Number' },
  { key: 'address', label: 'Address', category: 'PERSONAL', type: 'TEXTAREA', mode: 'OFF', placeholder: 'Address' },
  { key: 'resume', label: 'Resume', category: 'PROFESSIONAL', type: 'FILE_UPLOAD', mode: 'MANDATORY' },
  { key: 'cgpa', label: 'CGPA', category: 'ACADEMIC', type: 'NUMBER', mode: 'OPTIONAL', placeholder: 'Enter CGPA' },
  { key: 'skills', label: 'Skills', category: 'PROFESSIONAL', type: 'TEXTAREA', mode: 'OPTIONAL', placeholder: 'List relevant skills' },
  { key: 'workExperience', label: 'Work Experience', category: 'PROFESSIONAL', type: 'TEXTAREA', mode: 'OPTIONAL' },
  { key: 'educationDetails', label: 'Education Details', category: 'PROFESSIONAL', type: 'TEXTAREA', mode: 'OPTIONAL' },
  { key: 'noticePeriod', label: 'Notice Period', category: 'PROFESSIONAL', type: 'TEXT', mode: 'OFF' },
  { key: 'portfolioUrl', label: 'Work Link / Portfolio', category: 'PROFESSIONAL', type: 'URL', mode: 'OFF', placeholder: 'Portfolio URL' },
];
const DEFAULT_HIRING_STAGES = [
  { stageKey: 'sourced', label: 'Sourced', order: 0, locked: true },
  { stageKey: 'applied', label: 'Applied', order: 1, locked: true },
  { stageKey: 'contacted', label: 'Contacted', order: 2, locked: false },
  { stageKey: 'interview', label: 'Interview', order: 3, locked: false },
  { stageKey: 'offered', label: 'Offered', order: 4, locked: true },
  { stageKey: 'rejected', label: 'Rejected', order: 5, locked: true },
];

function buildTenantJobPrefix(tenant) {
  const source = String(tenant?.slug || tenant?.name || 'ATS');
  const normalized = source.replace(/[^a-z0-9]/gi, '').toUpperCase();
  return normalized.slice(0, 12) || 'ATS';
}

async function buildNextTenantJobId(tenantId) {
  const [tenant, latest] = await Promise.all([
    Tenant.findById(tenantId).select('name slug').lean(),
    Job.findOne({ tenantId }).sort({ createdAt: -1 }).select('jobId').lean(),
  ]);
  const prefix = buildTenantJobPrefix(tenant);
  const lastNumericPart = String(latest?.jobId || '').match(/-(\d+)$/)?.[1];
  const nextId = lastNumericPart ? Number(lastNumericPart) + 1 : 1;
  return `${prefix}-${String(nextId).padStart(3, '0')}`;
}

function mapStageToStatus(stageKey = '') {
  const normalizedStage = String(stageKey || '').trim().toLowerCase();
  if (normalizedStage === 'rejected') {
    return 'REJECTED';
  }
  if (normalizedStage === 'offered' || normalizedStage === 'selected' || normalizedStage === 'hired') {
    return 'SELECTED';
  }
  if (normalizedStage === 'applied') {
    return 'APPLIED';
  }
  if (normalizedStage) {
    return 'SHORTLISTED';
  }
  return 'APPLIED';
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

async function paginate(model, query, { page = 1, limit = 10, populate, sort = { createdAt: -1 } } = {}) {
  const pageNumber = Math.max(Number(page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(limit) || 10, 1), 100);
  let chain = model.find(query).sort(sort).skip((pageNumber - 1) * pageSize).limit(pageSize);
  if (populate) {
    chain = chain.populate(populate);
  }
  const [items, total] = await Promise.all([chain.lean(), model.countDocuments(query)]);
  return {
    items,
    pagination: {
      page: pageNumber,
      limit: pageSize,
      total,
      totalPages: Math.max(Math.ceil(total / pageSize), 1),
    },
  };
}

function sanitizeStringList(values = []) {
  return Array.isArray(values)
    ? [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))]
    : [];
}

function sanitizePrioritySkills(values = [], requiredSkills = []) {
  const required = new Set(sanitizeStringList(requiredSkills).map((skill) => skill.toLowerCase()));
  return sanitizeStringList(values).filter((skill) => required.has(skill.toLowerCase()));
}

function normalizeSkillValues(values = []) {
  return sanitizeStringList(values).map((skill) => skill.toLowerCase());
}

function extractSubmittedSkills(submittedFields = []) {
  const skillField = Array.isArray(submittedFields)
    ? submittedFields.find((field) => ['skills', 'skillSet'].includes(String(field.fieldKey || '').trim()))
    : null;

  if (!skillField) {
    return [];
  }

  if (Array.isArray(skillField.value)) {
    return sanitizeStringList(skillField.value);
  }

  return sanitizeStringList(String(skillField.value || '').split(','));
}

function extractSubmittedValue(submittedFields = [], acceptedKeys = []) {
  if (!Array.isArray(submittedFields)) {
    return '';
  }

  const accepted = new Set(acceptedKeys.map((key) => String(key).trim()));
  const field = submittedFields.find((item) => accepted.has(String(item.fieldKey || '').trim()));
  if (!field) {
    return '';
  }

  if (Array.isArray(field.value)) {
    return field.value.join(', ').trim();
  }

  return String(field.value || '').trim();
}

function computeSkillMatch(candidateSkills = [], requiredSkills = [], prioritySkills = []) {
  const candidate = new Set(normalizeSkillValues(candidateSkills));
  const required = sanitizeStringList(requiredSkills);
  const priority = sanitizePrioritySkills(prioritySkills, requiredSkills);
  const matchedSkills = required.filter((skill) => candidate.has(skill.toLowerCase()));
  const matchedPrioritySkills = priority.filter((skill) => candidate.has(skill.toLowerCase()));
  const requiredScore = required.length ? matchedSkills.length / required.length : 0;
  const priorityScore = priority.length ? matchedPrioritySkills.length / priority.length : 0;
  const score = Number((((priorityScore * 0.65) + (requiredScore * 0.35)) * 100).toFixed(1));

  let matchLevel = 'LOW';
  if (!matchedSkills.length && !matchedPrioritySkills.length) {
    matchLevel = 'NONE';
  } else if (priority.length && matchedPrioritySkills.length === priority.length) {
    matchLevel = 'HIGH';
  } else if (score >= 70 || matchedPrioritySkills.length >= Math.max(1, Math.ceil(priority.length / 2))) {
    matchLevel = 'HIGH';
  } else if (score >= 35) {
    matchLevel = 'MEDIUM';
  }

  return {
    score,
    matchLevel,
    matchedSkills,
    matchedPrioritySkills,
    missingPrioritySkills: priority.filter((skill) => !candidate.has(skill.toLowerCase())),
  };
}

function sanitizeLocations(locations = []) {
  if (!Array.isArray(locations)) {
    return [];
  }

  return locations
    .map((location) => {
      if (typeof location === 'string') {
        const label = location.trim();
        return label ? { label } : null;
      }

      if (!location || typeof location !== 'object') {
        return null;
      }

      const label = String(location.label || location.city || location.state || location.country || '').trim();
      if (!label) {
        return null;
      }

      return {
        label,
        city: String(location.city || '').trim(),
        state: String(location.state || '').trim(),
        country: String(location.country || '').trim(),
      };
    })
    .filter(Boolean);
}

function sanitizeApplicationFormFields(fields = []) {
  if (!Array.isArray(fields) || !fields.length) {
    return DEFAULT_APPLICATION_FORM_FIELDS;
  }

  const defaultFieldMap = new Map(DEFAULT_APPLICATION_FORM_FIELDS.map((field) => [field.key, field]));

  return fields
    .map((field) => {
      if (!field || typeof field !== 'object') {
        return null;
      }

      const key = String(field.key || '').trim();
      const label = String(field.label || '').trim();
      if (!key || !label) {
        return null;
      }

      const defaultField = defaultFieldMap.get(key);
      const type = ['TEXT', 'EMAIL', 'PHONE', 'NUMBER', 'TEXTAREA', 'URL', 'FILE_UPLOAD'].includes(field.type)
        ? field.type
        : defaultField?.type || 'TEXT';

      return {
        key,
        label,
        category: String(field.category || '').trim(),
        type,
        mode: ['MANDATORY', 'OPTIONAL', 'OFF'].includes(field.mode) ? field.mode : 'OPTIONAL',
        placeholder: String(field.placeholder || '').trim(),
        helpText: String(field.helpText || '').trim(),
      };
    })
    .filter(Boolean);
}

function sanitizeScreeningQuestions(questions = []) {
  if (!Array.isArray(questions)) {
    return [];
  }

  return questions
    .map((question, index) => {
      if (!question || typeof question !== 'object') {
        return null;
      }

      const prompt = String(question.question || '').trim();
      if (!prompt) {
        return null;
      }

      const type = ['TEXT', 'YES_NO', 'SINGLE_CHOICE', 'FILE_UPLOAD', 'URL'].includes(question.type)
        ? question.type
        : 'TEXT';

      return {
        questionId: String(question.questionId || `question-${index + 1}`).trim(),
        question: prompt,
        type,
        required: question.required !== false,
        options: type === 'SINGLE_CHOICE' ? sanitizeStringList(question.options) : [],
        helperText: String(question.helperText || '').trim(),
      };
    })
    .filter(Boolean);
}

function sanitizeHiringStages(stages = []) {
  if (!Array.isArray(stages) || !stages.length) {
    return DEFAULT_HIRING_STAGES;
  }

  return stages
    .map((stage, index) => {
      if (!stage || typeof stage !== 'object') {
        return null;
      }

      const stageKey = String(stage.stageKey || stage.label || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const label = String(stage.label || '').trim();
      if (!stageKey || !label) {
        return null;
      }

      return {
        stageKey,
        label,
        order: Number.isFinite(Number(stage.order)) ? Number(stage.order) : index,
        color: String(stage.color || '').trim(),
        locked: Boolean(stage.locked),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.order - b.order);
}

function normalizeJobPayload(payload = {}) {
  const requestedPublishState = String(payload.publishState || payload.status || '').toUpperCase();
  const publishState = ['DRAFT', 'OPEN', 'CLOSED'].includes(requestedPublishState)
    ? requestedPublishState
    : 'DRAFT';
  const title = String(payload.title || payload.role || '').trim();
  const description = String(payload.description || '').trim();

  if (publishState !== 'DRAFT') {
    if (!title) {
      throw new AppError('Job title is required to publish a job', 400);
    }
    if (!description) {
      throw new AppError('Job description is required to publish a job', 400);
    }
  }

  const normalizedTitle = title || 'Untitled Job Draft';
  const normalizedDescription = description || 'Draft in progress';
  const requiredSkills = sanitizeStringList(payload.requiredSkills);
  const prioritySkills = sanitizePrioritySkills(payload.prioritySkills, requiredSkills);

  return {
    title: normalizedTitle,
    role: String(payload.role || normalizedTitle).trim() || normalizedTitle,
    description: normalizedDescription,
    companyName: String(payload.companyName || payload.client || '').trim(),
    client: String(payload.client || '').trim(),
    department: String(payload.department || '').trim(),
    visibility: ['INTERNAL', 'EXTERNAL'].includes(String(payload.visibility || '').toUpperCase())
      ? String(payload.visibility).toUpperCase()
      : 'INTERNAL',
    workMode: ['IN_OFFICE', 'HYBRID', 'REMOTE'].includes(String(payload.workMode || '').toUpperCase())
      ? String(payload.workMode).toUpperCase()
      : 'IN_OFFICE',
    locations: sanitizeLocations(payload.locations),
    salary: {
      period: ['HOURLY', 'MONTHLY', 'ANNUAL'].includes(String(payload.salary?.period || '').toUpperCase())
        ? String(payload.salary.period).toUpperCase()
        : 'ANNUAL',
      min: payload.salary?.min ?? undefined,
      max: payload.salary?.max ?? undefined,
      currency: String(payload.salary?.currency || 'INR').trim().toUpperCase(),
      hideFromCandidates: Boolean(payload.salary?.hideFromCandidates),
    },
    experience: {
      minYears: payload.experience?.minYears ?? undefined,
      maxYears: payload.experience?.maxYears ?? undefined,
      level: String(payload.experience?.level || '').trim(),
    },
    employmentType: String(payload.employmentType || '').trim(),
    industryType: String(payload.industryType || '').trim(),
    educationRequirements: sanitizeStringList(payload.educationRequirements),
    openings: payload.openings ? Number(payload.openings) : undefined,
    requiredSkills,
    prioritySkills,
    minCgpa: payload.minCgpa ?? undefined,
    deadline: payload.deadline || undefined,
    publishState,
    status: publishState === 'OPEN' ? 'OPEN' : publishState === 'CLOSED' ? 'CLOSED' : 'DRAFT',
    active: publishState !== 'CLOSED',
    applicationFormFields: sanitizeApplicationFormFields(payload.applicationFormFields),
    screeningQuestions: sanitizeScreeningQuestions(payload.screeningQuestions),
    hiringStages: sanitizeHiringStages(payload.hiringStages),
  };
}

async function sanitizeRecruiterAssignments(tenantId, recruiterIds = [], fallbackRecruiterId) {
  const requestedIds = Array.isArray(recruiterIds) ? recruiterIds.filter(Boolean) : [];
  const normalizedIds = [...new Set(
    [
      ...requestedIds.map((value) => String(value)),
      ...(fallbackRecruiterId ? [String(fallbackRecruiterId)] : []),
    ].filter(Boolean)
  )];

  if (!normalizedIds.length) {
    return [];
  }

  const recruiters = await User.find({
    _id: { $in: normalizedIds },
    tenantId,
    role: 'RECRUITER',
    status: { $ne: 'INACTIVE' },
  })
    .select('_id')
    .lean();

  return recruiters.map((recruiter) => recruiter._id);
}

async function uploadResumeForStudent(userId, file, existingKey) {
  const key = buildResumeKey(userId, file.originalname);
  await uploadBuffer({ key, body: file.buffer, contentType: file.mimetype });
  if (existingKey) {
    await deleteObject(existingKey);
  }
  return {
    resumeKey: key,
    resumeOriginalName: file.originalname,
    resumeMimeType: file.mimetype,
    resumeSize: file.size,
  };
}

async function getResumeReadUrl(key) {
  if (!key) return null;
  return getReadUrl(key, 900);
}

function buildEmptyPagination(page, limit) {
  return {
    items: [],
    pagination: {
      page: Math.max(Number(page) || 1, 1),
      limit: Math.min(Math.max(Number(limit) || 10, 1), 100),
      total: 0,
      totalPages: 1,
    },
  };
}

function buildSearchRegex(search) {
  if (!search || !String(search).trim()) {
    return null;
  }

  return new RegExp(String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

async function applyCandidateSearchToQuery(query, tenantId, search) {
  const searchRegex = buildSearchRegex(search);
  if (!searchRegex) {
    return true;
  }

  const matchedProfiles = await StudentProfile.find({
    ...(tenantId ? { tenantId } : {}),
    $or: [
      { fullName: searchRegex },
      { usn: searchRegex },
      { branch: searchRegex },
      { skills: searchRegex },
    ],
  })
    .select('userId')
    .lean();
  const matchedUsers = await User.find({
    ...(tenantId ? { tenantId } : {}),
    $or: [{ email: searchRegex }, { fullName: searchRegex }],
  })
    .select('_id')
    .lean();
  const matchedJobs = await Job.find({
    ...(tenantId ? { tenantId } : {}),
    $or: [{ title: searchRegex }, { role: searchRegex }, { companyName: searchRegex }],
  })
    .select('_id')
    .lean();

  const studentIds = new Set([
    ...matchedProfiles.map((profile) => String(profile.userId)),
    ...matchedUsers.map((user) => String(user._id)),
  ]);
  const jobIds = matchedJobs.map((job) => job._id);

  query.$or = [
    ...(studentIds.size ? [{ studentId: { $in: Array.from(studentIds) } }] : []),
    ...(jobIds.length ? [{ jobId: { $in: jobIds } }] : []),
  ];

  return Boolean(query.$or.length);
}

async function mapCandidateApplications(paginated, tenantId) {
  const profileIds = paginated.items.map((application) => application.studentId?._id).filter(Boolean);
  const profiles = await StudentProfile.find({
    ...(tenantId ? { tenantId } : {}),
    userId: { $in: profileIds },
  }).lean();
  const profileMap = new Map(profiles.map((profile) => [String(profile.userId), profile]));

  return Promise.all(
    paginated.items.map(async (application) => {
      const profile = profileMap.get(String(application.studentId?._id));
      const applicationSkills = extractSubmittedSkills(application.submittedFields || []);
      const applicationCgpa = extractSubmittedValue(application.submittedFields || [], ['cgpa', 'currentCgpa']);
      const applicationEducation = extractSubmittedValue(application.submittedFields || [], ['educationDetails']);
      const uploadedArtifacts = await Promise.all(
        (application.uploadedArtifacts || []).map(async (artifact) => ({
          ...artifact,
          url: artifact.fileKey ? await getReadUrl(artifact.fileKey, 900) : null,
        }))
      );

      return {
        id: application._id,
        status: application.status,
        currentStageKey: application.currentStageKey || 'applied',
        currentStageLabel: application.currentStageLabel || 'Applied',
        appliedAt: application.createdAt,
        feedback: application.feedback || {},
        submittedFields: application.submittedFields || [],
        screeningAnswers: application.screeningAnswers || [],
        stageHistory: application.stageHistory || [],
        uploadedArtifacts,
        job: application.jobId
          ? {
              id: application.jobId._id,
              jobId: application.jobId.jobId,
              role: application.jobId.title || application.jobId.role,
              companyName: application.jobId.companyName,
              requiredSkills: application.jobId.requiredSkills || [],
              prioritySkills: application.jobId.prioritySkills || [],
              hiringStages: application.jobId.hiringStages || DEFAULT_HIRING_STAGES,
            }
          : null,
        student: {
          id: application.studentId?._id,
          email: application.studentId?.email,
          fullName: profile?.fullName || application.studentId?.fullName || '',
          usn: profile?.usn || '',
          branch: profile?.branch || '',
          semester: profile?.semester,
          cgpa: applicationCgpa || '--',
          skills: applicationSkills,
          educationDetails: applicationEducation || '',
          resumeKey: application.resumeKey || null,
          resumeOriginalName: application.resumeOriginalName || '',
          resumeUrl: application.resumeKey ? await getReadUrl(application.resumeKey, 900) : null,
        },
        skillMatch: computeSkillMatch(
          applicationSkills,
          application.jobId?.requiredSkills || [],
          application.jobId?.prioritySkills || []
        ),
      };
    })
  );
}

async function listScopedCandidates({ tenantId, jobMongoIds, status, search, page, limit }) {
  const query = tenantId ? { tenantId } : {};
  if (status && APPLICATION_STATUSES.includes(status)) {
    query.status = status;
  }
  if (jobMongoIds?.length) {
    query.jobId = { $in: jobMongoIds };
  }

  const hasSearchMatches = await applyCandidateSearchToQuery(query, tenantId, search);
  if (!hasSearchMatches) {
    return buildEmptyPagination(page, limit);
  }

  const paginated = await paginate(Application, query, {
    page,
    limit,
    populate: [
      { path: 'jobId', match: tenantId ? { tenantId } : {} },
      { path: 'studentId', select: 'email fullName tenantId', match: tenantId ? { tenantId } : {} },
    ],
  });

  return {
    items: await mapCandidateApplications(paginated, tenantId),
    pagination: paginated.pagination,
  };
}

async function listAdminCandidates({ tenantId, jobId, status, search, page, limit }) {
  let jobMongoIds;
  if (jobId) {
    const job = await Job.findOne({ jobId, ...(tenantId ? { tenantId } : {}) }).select('_id').lean();
    if (!job) {
      return buildEmptyPagination(page, limit);
    }
    jobMongoIds = [job._id];
  }

  return listScopedCandidates({ tenantId, jobMongoIds, status, search, page, limit });
}

async function listRecruiterCandidates({ recruiterId, tenantId, jobId, status, search, page, limit }) {
  const recruiterJobQuery = {
    tenantId,
    $or: [
      { postedBy: recruiterId },
      { assignedRecruiters: recruiterId },
    ],
  };

  if (jobId) {
    recruiterJobQuery.jobId = jobId;
  }

  const recruiterJobs = await Job.find(recruiterJobQuery).select('_id jobId').lean();
  if (!recruiterJobs.length) {
    return buildEmptyPagination(page, limit);
  }

  return listScopedCandidates({
    tenantId,
    jobMongoIds: recruiterJobs.map((job) => job._id),
    status,
    search,
    page,
    limit,
  });
}

async function getApplicantsForRecruiter(recruiterId, tenantId, jobId, { page, limit, search, status } = {}) {
  const job = await Job.findOne({
    jobId,
    tenantId,
    $or: [
      { postedBy: recruiterId },
      { assignedRecruiters: recruiterId },
    ],
  }).lean();
  if (!job) throw new AppError('Job not found or not assigned', 404);
  const candidates = await listRecruiterCandidates({ recruiterId, tenantId, jobId, status, search, page, limit });
  return {
    job: {
      id: job._id,
      jobId: job.jobId,
      title: job.title || job.role,
      companyName: job.companyName,
      requiredSkills: job.requiredSkills || [],
      prioritySkills: job.prioritySkills || [],
      hiringStages: job.hiringStages?.length ? job.hiringStages : DEFAULT_HIRING_STAGES,
    },
    ...candidates,
  };
}

async function getAdminDashboardSummary(tenantId) {
  const filter = tenantId ? { tenantId } : {};
  const [students, recruiters, jobs, applications, grouped] = await Promise.all([
    User.countDocuments({ ...filter, role: 'STUDENT' }),
    User.countDocuments({ ...filter, role: 'RECRUITER' }),
    Job.countDocuments(filter),
    Application.countDocuments(filter),
    Application.aggregate([{ $match: filter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);

  const byStatus = APPLICATION_STATUSES.reduce((acc, status) => ({ ...acc, [status]: 0 }), {});
  grouped.forEach((item) => {
    byStatus[item._id] = item.count;
  });

  return {
    users: { students, recruiters },
    jobs: { total: jobs },
    applications: { total: applications, byStatus },
  };
}

async function createRecruiterOwnedJob(recruiterId, payload) {
  const tenantId = payload.tenantId;
  if (!tenantId) {
    throw new AppError('Tenant context required to create recruiter-owned jobs', 403);
  }
  const assignedRecruiters = await sanitizeRecruiterAssignments(tenantId, payload.assignedRecruiters, recruiterId);
  const jobData = normalizeJobPayload(payload);
  return Job.create({
    tenantId,
    jobId: await buildNextTenantJobId(tenantId),
    ...jobData,
    postedBy: recruiterId,
    assignedRecruiters,
  });
}

async function ensureRecruiterOwnsJob(recruiterId, tenantId, jobId) {
  if (!tenantId) {
    throw new AppError('Tenant context required to access recruiter jobs', 403);
  }
  const job = await Job.findOne({ jobId, tenantId });
  if (!job) throw new AppError('Job not found', 404);
  if (String(job.postedBy) !== String(recruiterId) && !job.assignedRecruiters.some((id) => String(id) === String(recruiterId))) {
    throw new AppError('Forbidden', 403);
  }
  return job;
}

module.exports = {
  APPLICATION_STATUSES,
  DEFAULT_APPLICATION_FORM_FIELDS,
  DEFAULT_HIRING_STAGES,
  mapStageToStatus,
  hashToken,
  paginate,
  uploadResumeForStudent,
  getResumeReadUrl,
  sanitizeRecruiterAssignments,
  normalizeJobPayload,
  listAdminCandidates,
  listRecruiterCandidates,
  getApplicantsForRecruiter,
  getAdminDashboardSummary,
  createRecruiterOwnedJob,
  buildNextTenantJobId,
  ensureRecruiterOwnsJob,
  deleteObject,
  getDefaultTenantId,
};
