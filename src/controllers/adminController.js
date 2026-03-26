const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { Application, Job, StudentProfile, User } = require('../models');
const { getAdminDashboardSummary, hashToken, listAdminCandidates, paginate, deleteObject } = require('../services');
const { sendAccountInvitation, sendTestEmail } = require('../services');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { sendData, sendMessage } = require('../utils/response');
const config = require('../config');

async function createPendingUser({ email, fullName, role, profile }) {
  const plainToken = crypto.randomBytes(32).toString('hex');
  const inviteToken = hashToken(plainToken);
  const normalizedEmail = email.toLowerCase();
  let user = await User.findOne({ email: normalizedEmail }).select('+inviteToken');
  let createdNewUser = false;

  if (user) {
    if (user.role !== role) {
      throw new AppError(`A user with ${normalizedEmail} already exists with role ${user.role}`, 409);
    }
    if (user.status === 'ACTIVE') {
      throw new AppError(`A ${role.toLowerCase()} with this email already exists`, 409);
    }

    user.fullName = fullName;
    user.status = 'PENDING';
    user.inviteToken = inviteToken;
    user.inviteTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    user.password = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
    await user.save();
  } else {
    user = await User.create({
      email: normalizedEmail,
      fullName,
      password: await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10),
      role,
      status: 'PENDING',
      inviteToken,
      inviteTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    createdNewUser = true;
  }

  try {
    if (profile) {
      const cleanedProfile = Object.fromEntries(
        Object.entries(profile).filter(([, value]) => value !== undefined && value !== null && value !== '')
      );
      const existingProfile = await StudentProfile.findOne({ userId: user._id });
      if (existingProfile) {
        Object.assign(existingProfile, {
          ...cleanedProfile,
          fullName: cleanedProfile.fullName || existingProfile.fullName,
        });
        await existingProfile.save();
      } else {
        await StudentProfile.create({ userId: user._id, ...cleanedProfile });
      }
    }

    await sendAccountInvitation({
      email: normalizedEmail,
      fullName: fullName || normalizedEmail,
      inviteLink: `${config.frontendOrigin}/activate?token=${plainToken}`,
      loginLink: `${config.frontendOrigin}/login`,
    });
  } catch (error) {
    if (profile && !createdNewUser) {
      // Keep existing user/profile records when resend email fails.
    } else if (profile) {
      await StudentProfile.deleteOne({ userId: user._id });
      await User.deleteOne({ _id: user._id });
    } else if (!createdNewUser) {
      // keep existing recruiter
    } else {
      await User.deleteOne({ _id: user._id });
    }
    throw error;
  }

  return user;
}

const inviteStudent = catchAsync(async (req, res) => {
  const { email, fullName, usn, branch, semester, cgpa, phone, skills = [] } = req.body;
  const user = await createPendingUser({
    email,
    fullName,
    role: 'STUDENT',
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
  return sendData(res, 201, { id: user._id, email: user.email, role: user.role, status: user.status });
});

const inviteRecruiter = catchAsync(async (req, res) => {
  const { email, fullName } = req.body;
  const user = await createPendingUser({ email, fullName, role: 'RECRUITER' });
  return sendData(res, 201, { id: user._id, email: user.email, role: user.role, status: user.status });
});

const deactivateUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(req.params.id, { status: 'INACTIVE' }, { new: true });
  if (!user) return next(new AppError('User not found', 404));
  return sendMessage(res, 200, 'User deactivated successfully');
});

const deleteUserInvite = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  if (user.role === 'STUDENT') {
    const applications = await Application.find({ studentId: user._id });
    await Promise.all(applications.map((application) => deleteObject(application.resumeKey)));
    await Application.deleteMany({ studentId: user._id });
    await StudentProfile.deleteOne({ userId: user._id });
  }

  if (user.role === 'RECRUITER') {
    await Job.updateMany(
      { assignedRecruiters: user._id },
      { $pull: { assignedRecruiters: user._id } }
    );
  }

  await User.deleteOne({ _id: user._id });
  return sendMessage(res, 200, 'User deleted successfully');
});

const createJob = catchAsync(async (req, res) => {
  const latest = await Job.findOne().sort({ createdAt: -1 }).lean();
  const nextId = latest?.jobId ? Number(String(latest.jobId).split('-').pop()) + 1 : 1;
  const job = await Job.create({
    jobId: `ATS-${String(nextId).padStart(3, '0')}`,
    title: req.body.title || req.body.role,
    role: req.body.title || req.body.role,
    companyName: req.body.companyName,
    description: req.body.description,
    postedBy: req.user.id,
    status: req.body.status || 'OPEN',
    deadline: req.body.deadline,
    minCgpa: req.body.minCgpa,
    assignedRecruiters: req.body.assignedRecruiters || [],
    active: (req.body.status || 'OPEN') !== 'CLOSED',
  });
  return sendData(res, 201, job);
});

const listJobs = catchAsync(async (req, res) => {
  const result = await paginate(Job, {}, {
    page: req.query.page,
    limit: req.query.limit,
    populate: { path: 'assignedRecruiters', select: 'email fullName status' },
  });
  return sendData(res, 200, result);
});

const deleteJob = catchAsync(async (req, res, next) => {
  const job = await Job.findOneAndDelete({ jobId: req.params.jobId });
  if (!job) return next(new AppError('Job not found', 404));
  const applications = await Application.find({ jobId: job._id });
  await Promise.all(applications.map((application) => deleteObject(application.resumeKey)));
  await Application.deleteMany({ jobId: job._id });
  return sendMessage(res, 200, 'Job deleted successfully');
});

const getDashboard = catchAsync(async (req, res) => {
  return sendData(res, 200, await getAdminDashboardSummary());
});

const listRecruiters = catchAsync(async (req, res) => {
  const result = await paginate(User, { role: 'RECRUITER', status: { $ne: 'INACTIVE' } }, { page: req.query.page, limit: req.query.limit });
  return sendData(res, 200, result);
});

const listStudents = catchAsync(async (req, res) => {
  const result = await paginate(StudentProfile, {}, {
    page: req.query.page,
    limit: req.query.limit,
    populate: {
      path: 'userId',
      select: 'email fullName role status createdAt',
      match: { status: { $ne: 'INACTIVE' } },
    },
  });
  return sendData(res, 200, {
    ...result,
    items: result.items.filter((item) => item.userId),
  });
});

const listCandidates = catchAsync(async (req, res) => {
  return sendData(res, 200, await listAdminCandidates(req.query));
});

const sendEmailTest = catchAsync(async (req, res) => {
  await sendTestEmail({
    email: req.body.email,
    fullName: req.user.fullName || 'Admin',
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
  sendEmailTest,
};
