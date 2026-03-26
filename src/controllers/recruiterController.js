const { Application, Job, StudentProfile, User } = require('../models');
const {
  APPLICATION_STATUSES,
  createRecruiterOwnedJob,
  ensureRecruiterOwnsJob,
  getApplicantsForRecruiter,
  paginate,
} = require('../services');
const { sendApplicationStatusUpdate } = require('../services');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { sendData, sendMessage } = require('../utils/response');

const listJobs = catchAsync(async (req, res) => {
  const result = await paginate(Job, { assignedRecruiters: req.user.id }, { page: req.query.page, limit: req.query.limit });
  return sendData(res, 200, result);
});

const createJob = catchAsync(async (req, res) => {
  const job = await createRecruiterOwnedJob(req.user.id, req.body);
  return sendData(res, 201, job);
});

const updateJob = catchAsync(async (req, res) => {
  const job = await ensureRecruiterOwnsJob(req.user.id, req.params.jobId);
  Object.assign(job, {
    title: req.body.title || job.title,
    role: req.body.title || job.role,
    description: req.body.description || job.description,
    status: req.body.status || job.status,
    deadline: req.body.deadline || job.deadline,
  });
  await job.save();
  return sendData(res, 200, job);
});

const getApplicants = catchAsync(async (req, res) => {
  return sendData(res, 200, await getApplicantsForRecruiter(req.user.id, req.params.jobId, req.query));
});

const updateApplication = catchAsync(async (req, res, next) => {
  if (!APPLICATION_STATUSES.includes(req.body.status)) {
    return next(new AppError('Invalid application status', 400));
  }
  const application = await Application.findById(req.params.id);
  if (!application) return next(new AppError('Application not found', 404));
  const job = await ensureRecruiterOwnsJob(req.user.id, req.body.jobId || (await Job.findById(application.jobId)).jobId);
  application.status = req.body.status;
  await application.save();
  const [studentUser, profile] = await Promise.all([
    User.findById(application.studentId),
    StudentProfile.findOne({ userId: application.studentId }),
  ]);
  if (studentUser) {
    await sendApplicationStatusUpdate({
      email: studentUser.email,
      fullName: profile?.fullName || studentUser.fullName || studentUser.email,
      jobTitle: job.title,
      companyName: job.companyName,
      status: application.status,
    });
  }
  return sendData(res, 200, application);
});

module.exports = { listJobs, createJob, updateJob, getApplicants, updateApplication };
