const { Application, Job, StudentProfile, User } = require('../models');
const {
  createAuditLog,
  buildNextTenantJobId,
  createPendingInvitationUser,
  getAdminDashboardSummary,
  listAdminCandidates,
  normalizeJobPayload,
  paginate,
  deleteObject,
  sanitizeRecruiterAssignments,
} = require('../services');
const { sendTestEmail } = require('../services');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { getRequestOrigin } = require('../utils/requestOrigin');
const { sendData, sendMessage } = require('../utils/response');
const { verifyPasswordConfirmation } = require('../utils/passwordConfirmation');
const { getRequestTenantId } = require('../utils/tenantScope');
const config = require('../config');

function buildOptionalTenantFilter(tenantId, extra = {}) {
  return tenantId ? { ...extra, tenantId } : { ...extra };
}

const inviteStudent = catchAsync(async (req, res) => {
  const { email, fullName, usn, branch, semester, cgpa, phone, skills = [] } = req.body;
  const appOrigin = getRequestOrigin(req, {
    frontendOrigin: config.frontendOrigin,
    nodeEnv: config.nodeEnv,
  });
  const { user } = await createPendingInvitationUser({
    email,
    fullName,
    role: 'STUDENT',
    appOrigin,
    tenantId: getRequestTenantId(req, { allowPlatformSuperAdmin: false }),
    profile: {
      fullName,
      usn,
      branch,
      semester,
      cgpa,
      phone,
      skills,
      profileCompleted: false,
    },
  });
  await createAuditLog({
    req,
    action: 'tenant.student.invite',
    targetType: 'User',
    targetId: user._id,
    metadata: { email: user.email, role: user.role },
  });
  return sendData(res, 201, { id: user._id, email: user.email, role: user.role, status: user.status });
});

const inviteRecruiter = catchAsync(async (req, res) => {
  const { email, fullName } = req.body;
  const appOrigin = getRequestOrigin(req, {
    frontendOrigin: config.frontendOrigin,
    nodeEnv: config.nodeEnv,
  });
  const { user } = await createPendingInvitationUser({
    email,
    fullName,
    role: 'RECRUITER',
    appOrigin,
    tenantId: getRequestTenantId(req, { allowPlatformSuperAdmin: false }),
  });
  await createAuditLog({
    req,
    action: 'tenant.recruiter.invite',
    targetType: 'User',
    targetId: user._id,
    metadata: { email: user.email, role: user.role },
  });
  return sendData(res, 201, { id: user._id, email: user.email, role: user.role, status: user.status });
});

const deactivateUser = catchAsync(async (req, res, next) => {
  await verifyPasswordConfirmation({
    userId: req.user.id,
    tenantId: req.user.tenantId,
    role: 'ADMIN',
    passwordConfirmation: req.body.passwordConfirmation,
    req,
    action: 'tenant.user.deactivate.denied',
  });
  const user = await User.findOneAndUpdate({ _id: req.params.id, tenantId: req.user.tenantId }, { status: 'INACTIVE' }, { new: true });
  if (!user) return next(new AppError('User not found', 404));
  await createAuditLog({
    req,
    action: 'tenant.user.deactivate',
    targetType: 'User',
    targetId: user._id,
    metadata: { email: user.email, role: user.role },
  });
  return sendMessage(res, 200, 'User deactivated successfully');
});

const deleteUserInvite = catchAsync(async (req, res, next) => {
  await verifyPasswordConfirmation({
    userId: req.user.id,
    tenantId: req.user.tenantId,
    role: 'ADMIN',
    passwordConfirmation: req.body.passwordConfirmation,
    req,
    action: 'tenant.user.delete.denied',
  });
  const user = await User.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  if (user.role === 'STUDENT') {
    const applications = await Application.find({ studentId: user._id, tenantId: req.user.tenantId });
    await Promise.all(applications.map((application) => deleteObject(application.resumeKey)));
    await Application.deleteMany({ studentId: user._id, tenantId: req.user.tenantId });
    await StudentProfile.deleteOne({ userId: user._id, tenantId: req.user.tenantId });
  }

  if (user.role === 'RECRUITER') {
    await Job.updateMany(
      { tenantId: req.user.tenantId, assignedRecruiters: user._id },
      { $pull: { assignedRecruiters: user._id } }
    );
  }

  await User.deleteOne({ _id: user._id, tenantId: req.user.tenantId });
  await createAuditLog({
    req,
    action: 'tenant.user.delete',
    targetType: 'User',
    targetId: user._id,
    metadata: { email: user.email, role: user.role },
  });
  return sendMessage(res, 200, 'User deleted successfully');
});

const createJob = catchAsync(async (req, res) => {
  const tenantId = getRequestTenantId(req, { allowPlatformSuperAdmin: false });
  const assignedRecruiters = await sanitizeRecruiterAssignments(tenantId, req.body.assignedRecruiters);
  const jobData = normalizeJobPayload(req.body);
  if (jobData.publishState !== 'DRAFT' && !assignedRecruiters.length) {
    throw new AppError('Select at least one recruiter before publishing this job', 400);
  }
  const job = await Job.create({
    tenantId,
    jobId: await buildNextTenantJobId(tenantId),
    ...jobData,
    postedBy: req.user.id,
    assignedRecruiters,
  });
  await createAuditLog({
    req,
    action: 'tenant.job.create',
    targetType: 'Job',
    targetId: job._id,
    metadata: {
      jobId: job.jobId,
      title: job.title,
      companyName: job.companyName,
      publishState: job.publishState,
      assignedRecruiterCount: job.assignedRecruiters?.length || 0,
      formFieldCount: job.applicationFormFields?.length || 0,
      screeningQuestionCount: job.screeningQuestions?.length || 0,
      hiringStageCount: job.hiringStages?.length || 0,
    },
  });
  return sendData(res, 201, job);
});

const listJobs = catchAsync(async (req, res) => {
  const tenantId = getRequestTenantId(req);
  const result = await paginate(Job, buildOptionalTenantFilter(tenantId), {
    page: req.query.page,
    limit: req.query.limit,
    populate: {
      path: 'assignedRecruiters',
      select: 'email fullName status tenantId',
      ...(tenantId ? { match: { tenantId } } : {}),
    },
  });
  return sendData(res, 200, result);
});

const deleteJob = catchAsync(async (req, res, next) => {
  await verifyPasswordConfirmation({
    userId: req.user.id,
    tenantId: req.user.tenantId,
    role: 'ADMIN',
    passwordConfirmation: req.body.passwordConfirmation,
    req,
    action: 'tenant.job.delete.denied',
  });
  const job = await Job.findOneAndDelete({ jobId: req.params.jobId, tenantId: req.user.tenantId });
  if (!job) return next(new AppError('Job not found', 404));
  const applications = await Application.find({ jobId: job._id, tenantId: req.user.tenantId });
  await Promise.all(applications.map((application) => deleteObject(application.resumeKey)));
  await Application.deleteMany({ jobId: job._id, tenantId: req.user.tenantId });
  await createAuditLog({
    req,
    action: 'tenant.job.delete',
    targetType: 'Job',
    targetId: job._id,
    metadata: { jobId: job.jobId, title: job.title, companyName: job.companyName },
  });
  return sendMessage(res, 200, 'Job deleted successfully');
});

const getDashboard = catchAsync(async (req, res) => {
  return sendData(res, 200, await getAdminDashboardSummary(getRequestTenantId(req)));
});

const listRecruiters = catchAsync(async (req, res) => {
  const tenantId = getRequestTenantId(req);
  const result = await paginate(
    User,
    buildOptionalTenantFilter(tenantId, { role: 'RECRUITER', status: { $ne: 'INACTIVE' } }),
    { page: req.query.page, limit: req.query.limit }
  );
  return sendData(res, 200, result);
});

const listStudents = catchAsync(async (req, res) => {
  const tenantId = getRequestTenantId(req);
  const result = await paginate(StudentProfile, buildOptionalTenantFilter(tenantId), {
    page: req.query.page,
    limit: req.query.limit,
    populate: {
      path: 'userId',
      select: 'email fullName role status createdAt',
      match: buildOptionalTenantFilter(tenantId, { status: { $ne: 'INACTIVE' } }),
    },
  });
  return sendData(res, 200, {
    ...result,
    items: result.items.filter((item) => item.userId),
  });
});

const listCandidates = catchAsync(async (req, res) => {
  return sendData(res, 200, await listAdminCandidates({ ...req.query, tenantId: getRequestTenantId(req) }));
});

const updateCandidateFeedback = catchAsync(async (req, res, next) => {
  const tenantId = getRequestTenantId(req);
  const application = await Application.findOne(buildOptionalTenantFilter(tenantId, { _id: req.params.id }));
  if (!application) return next(new AppError('Application not found', 404));

  application.feedback = {
    summary: String(req.body.summary || '').trim(),
    notes: String(req.body.notes || '').trim(),
    rating: Number.isFinite(Number(req.body.rating)) ? Number(req.body.rating) : undefined,
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
      studentId: application.studentId,
      jobId: application.jobId,
      rating: application.feedback?.rating ?? null,
    },
  });

  return sendData(res, 200, application.feedback || {});
});

const sendEmailTest = catchAsync(async (req, res) => {
  await sendTestEmail({
    email: req.body.email,
    fullName: req.user.fullName || 'Admin',
    appOrigin: getRequestOrigin(req, {
      frontendOrigin: config.frontendOrigin,
      nodeEnv: config.nodeEnv,
    }),
    tenantId: req.user.tenantId,
  });
  return sendMessage(res, 200, `Test email sent to ${req.body.email}`);
});

module.exports = {
  inviteStudent,
  inviteRecruiter,
  deactivateUser,
  deleteUserInvite,
  createJob,
  listJobs,
  deleteJob,
  getDashboard,
  listRecruiters,
  listStudents,
  listCandidates,
  updateCandidateFeedback,
  sendEmailTest,
};
