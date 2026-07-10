const { Application, Job, User } = require('../models');
const {
  APPLICATION_STATUSES,
  createAuditLog,
  createRecruiterOwnedJob,
  DEFAULT_HIRING_STAGES,
  ensureRecruiterOwnsJob,
  getApplicantsForRecruiter,
  mapStageToStatus,
  normalizeJobPayload,
  paginate,
} = require('../services');
const { sendApplicationStatusUpdate } = require('../services');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { getRequestOrigin } = require('../utils/requestOrigin');
const { sendData, sendMessage } = require('../utils/response');
const { getRequestTenantId } = require('../utils/tenantScope');
const config = require('../config');

const listJobs = catchAsync(async (req, res) => {
  const result = await paginate(
    Job,
    {
      tenantId: req.user.tenantId,
      $or: [
        { postedBy: req.user.id },
        { assignedRecruiters: req.user.id },
      ],
    },
    { page: req.query.page, limit: req.query.limit }
  );
  return sendData(res, 200, result);
});

const createJob = catchAsync(async (req, res) => {
  const job = await createRecruiterOwnedJob(req.user.id, {
    ...req.body,
    assignedRecruiters: [req.user.id],
    tenantId: getRequestTenantId(req, { allowPlatformSuperAdmin: false }),
  });
  await createAuditLog({
    req,
    action: 'tenant.recruiter_job.create',
    targetType: 'Job',
    targetId: job._id,
    metadata: {
      jobId: job.jobId,
      title: job.title,
      companyName: job.companyName,
      publishState: job.publishState,
      ownership: 'OWNER',
    },
  });
  return sendData(res, 201, job);
});

const updateJob = catchAsync(async (req, res) => {
  const job = await ensureRecruiterOwnsJob(req.user.id, req.user.tenantId, req.params.jobId);
  const previousPublishState = job.publishState;
  const jobData = normalizeJobPayload({
    ...job.toObject(),
    ...req.body,
    assignedRecruiters: job.assignedRecruiters,
  });
  jobData.assignedRecruiters = job.assignedRecruiters;
  Object.assign(job, jobData);
  await job.save();
  await createAuditLog({
    req,
    action: 'tenant.recruiter_job.update',
    targetType: 'Job',
    targetId: job._id,
    metadata: {
      jobId: job.jobId,
      title: job.title,
      companyName: job.companyName,
      publishState: job.publishState,
      previousPublishState,
      formFieldCount: job.applicationFormFields?.length || 0,
      screeningQuestionCount: job.screeningQuestions?.length || 0,
      hiringStageCount: job.hiringStages?.length || 0,
    },
  });
  return sendData(res, 200, job);
});

const getApplicants = catchAsync(async (req, res) => {
  return sendData(res, 200, await getApplicantsForRecruiter(req.user.id, req.user.tenantId, req.params.jobId, req.query));
});

const updateApplication = catchAsync(async (req, res, next) => {
  if (!APPLICATION_STATUSES.includes(req.body.status) && !req.body.stageKey && !req.body.feedback) {
    return next(new AppError('Invalid application status', 400));
  }
  const application = await Application.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
  if (!application) return next(new AppError('Application not found', 404));
  const applicationJob = await Job.findOne({ _id: application.jobId, tenantId: req.user.tenantId }).lean();
  const job = await ensureRecruiterOwnsJob(req.user.id, req.user.tenantId, applicationJob?.jobId);
  if (req.body.feedback && typeof req.body.feedback === 'object') {
    application.feedback = {
      summary: String(req.body.feedback.summary || '').trim(),
      notes: String(req.body.feedback.notes || '').trim(),
      rating: Number.isFinite(Number(req.body.feedback.rating)) ? Number(req.body.feedback.rating) : undefined,
      updatedAt: new Date(),
      updatedBy: req.user.id,
    };
    await application.save();
    await createAuditLog({
      req,
      action: 'tenant.candidate.feedback.update',
      targetType: 'Application',
      targetId: application._id,
      metadata: {
        applicationId: application._id,
        jobId: job.jobId,
        jobTitle: job.title,
        studentId: application.studentId,
        rating: application.feedback?.rating ?? null,
      },
    });
    return sendData(res, 200, application);
  }

  const pipelineStages = Array.isArray(job.hiringStages) && job.hiringStages.length ? job.hiringStages : DEFAULT_HIRING_STAGES;
  const requestedStage = req.body.stageKey
    ? pipelineStages.find((stage) => stage.stageKey === req.body.stageKey)
    : pipelineStages.find((stage) => mapStageToStatus(stage.stageKey) === req.body.status);
  if (!requestedStage) {
    return next(new AppError('Invalid hiring stage', 400));
  }

  application.currentStageKey = requestedStage.stageKey;
  application.currentStageLabel = requestedStage.label;
  application.status = req.body.status && APPLICATION_STATUSES.includes(req.body.status)
    ? req.body.status
    : mapStageToStatus(requestedStage.stageKey);
  application.stageHistory = [
    ...(application.stageHistory || []),
    {
      stageKey: requestedStage.stageKey,
      stageLabel: requestedStage.label,
      movedAt: new Date(),
      movedBy: req.user.id,
      note: 'Moved by recruiter',
    },
  ];
  await application.save();
  await createAuditLog({
    req,
    action: 'tenant.candidate.stage_move',
    targetType: 'Application',
    targetId: application._id,
    metadata: {
      applicationId: application._id,
      jobId: job.jobId,
      jobTitle: job.title,
      studentId: application.studentId,
      stageKey: requestedStage.stageKey,
      stageLabel: requestedStage.label,
      mappedStatus: application.status,
    },
  });
  const studentUser = await User.findOne({ _id: application.studentId, tenantId: req.user.tenantId });
  if (studentUser) {
    await sendApplicationStatusUpdate({
      email: studentUser.email,
      fullName: studentUser.fullName || studentUser.email,
      jobTitle: job.title,
      companyName: job.companyName,
      status: application.status,
      tenantId: req.user.tenantId,
      appOrigin: getRequestOrigin(req, {
        frontendOrigin: config.frontendOrigin,
        nodeEnv: config.nodeEnv,
      }),
    });
  }
  return sendData(res, 200, application);
});

module.exports = { listJobs, createJob, updateJob, getApplicants, updateApplication };
