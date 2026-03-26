const { createHash } = require('crypto');
const { Application, Job, StudentProfile, User } = require('../models');
const AppError = require('../utils/AppError');
const { buildResumeKey, deleteObject, getReadUrl, uploadBuffer } = require('../utils/s3');

const APPLICATION_STATUSES = ['APPLIED', 'SHORTLISTED', 'REJECTED', 'SELECTED', 'WITHDRAWN'];

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

async function listAdminCandidates({ jobId, status, search, page, limit }) {
  const query = {};
  if (status && APPLICATION_STATUSES.includes(status)) {
    query.status = status;
  }
  if (jobId) {
    const job = await Job.findOne({ jobId }).select('_id').lean();
    if (!job) {
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
    query.jobId = job._id;
  }

  if (search) {
    const searchRegex = new RegExp(String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const matchedProfiles = await StudentProfile.find({
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
      $or: [{ email: searchRegex }, { fullName: searchRegex }],
    })
      .select('_id')
      .lean();
    const matchedJobs = await Job.find({
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

    if (!query.$or.length) {
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
  }

  const paginated = await paginate(Application, query, {
    page,
    limit,
    populate: [{ path: 'jobId' }, { path: 'studentId', select: 'email fullName' }],
  });

  const profileIds = paginated.items.map((application) => application.studentId?._id).filter(Boolean);
  const profiles = await StudentProfile.find({ userId: { $in: profileIds } }).lean();
  const profileMap = new Map(profiles.map((profile) => [String(profile.userId), profile]));

  const mapped = await Promise.all(
    paginated.items.map(async (application) => {
      const profile = profileMap.get(String(application.studentId?._id));
      return {
        id: application._id,
        status: application.status,
        appliedAt: application.createdAt,
        job: application.jobId
          ? {
              id: application.jobId._id,
              jobId: application.jobId.jobId,
              role: application.jobId.title || application.jobId.role,
              companyName: application.jobId.companyName,
            }
          : null,
        student: {
          id: application.studentId?._id,
          email: application.studentId?.email,
          fullName: profile?.fullName || application.studentId?.fullName || '',
          usn: profile?.usn || '',
          branch: profile?.branch || '',
          semester: profile?.semester,
          cgpa: profile?.cgpa,
          skills: profile?.skills || [],
          resumeKey: profile?.resumeKey || application.resumeKey,
          resumeOriginalName: profile?.resumeOriginalName || application.resumeOriginalName,
          resumeUrl: profile?.resumeKey ? await getReadUrl(profile.resumeKey, 900) : null,
        },
      };
    })
  );

  return {
    items: mapped,
    pagination: paginated.pagination,
  };
}

async function getApplicantsForRecruiter(recruiterId, jobId, { page, limit }) {
  const job = await Job.findOne({ jobId, assignedRecruiters: recruiterId }).lean();
  if (!job) throw new AppError('Job not found or not assigned', 404);
  return listAdminCandidates({ jobId, page, limit });
}

async function getAdminDashboardSummary() {
  const [students, recruiters, jobs, applications, grouped] = await Promise.all([
    User.countDocuments({ role: 'STUDENT' }),
    User.countDocuments({ role: 'RECRUITER' }),
    Job.countDocuments(),
    Application.countDocuments(),
    Application.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
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
  const latest = await Job.findOne().sort({ createdAt: -1 }).lean();
  const nextId = latest?.jobId ? Number(String(latest.jobId).split('-').pop()) + 1 : 1;
  return Job.create({
    jobId: `ATS-${String(nextId).padStart(3, '0')}`,
    title: payload.title,
    role: payload.title,
    companyName: payload.companyName,
    description: payload.description,
    postedBy: recruiterId,
    status: payload.status || 'OPEN',
    deadline: payload.deadline,
    minCgpa: payload.minCgpa,
    assignedRecruiters: payload.assignedRecruiters?.length ? payload.assignedRecruiters : [recruiterId],
    active: payload.status !== 'CLOSED',
  });
}

async function ensureRecruiterOwnsJob(recruiterId, jobId) {
  const job = await Job.findOne({ jobId });
  if (!job) throw new AppError('Job not found', 404);
  if (String(job.postedBy) !== String(recruiterId) && !job.assignedRecruiters.some((id) => String(id) === String(recruiterId))) {
    throw new AppError('Forbidden', 403);
  }
  return job;
}

module.exports = {
  APPLICATION_STATUSES,
  hashToken,
  paginate,
  uploadResumeForStudent,
  getResumeReadUrl,
  listAdminCandidates,
  getApplicantsForRecruiter,
  getAdminDashboardSummary,
  createRecruiterOwnedJob,
  ensureRecruiterOwnsJob,
  deleteObject,
};
