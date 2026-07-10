const { Job, User } = require('../models');
const {
  listAdminCandidates,
  listRecruiterCandidates,
  paginate,
} = require('../services');
const catchAsync = require('../utils/catchAsync');
const { sendData } = require('../utils/response');
const { getRequestTenantId } = require('../utils/tenantScope');

const MAX_SEARCH_QUERY_LENGTH = 100;
const MAX_REGEX_COMPLEXITY = 50;

function buildSearchRegex(value) {
  const query = String(value || '').trim();
  if (!query) {
    return null;
  }

  if (query.length > MAX_SEARCH_QUERY_LENGTH) {
    return null;
  }

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (escaped.length > MAX_REGEX_COMPLEXITY) {
    return null;
  }

  return new RegExp(escaped, 'i');
}

async function searchUsers({ regex, tenantId, allowedUserIds }) {
  if (!regex) {
    return [];
  }

  const query = {
    ...(tenantId ? { tenantId } : {}),
    $or: [{ fullName: regex }, { email: regex }],
  };

  if (allowedUserIds?.length) {
    query._id = { $in: allowedUserIds };
  }

  const users = await User.find(query)
    .select('_id fullName email role status tenantId createdAt')
    .sort({ createdAt: -1 })
    .limit(12)
    .lean();

  return users.map((user) => ({
    id: user._id,
    fullName: user.fullName || '',
    email: user.email,
    role: user.role,
    status: user.status,
    tenantId: user.tenantId || null,
    createdAt: user.createdAt,
  }));
}

async function searchJobs({ regex, tenantId, recruiterId, jobId }) {
  const query = {
    ...(tenantId ? { tenantId } : {}),
  };

  if (jobId) {
    query.jobId = jobId;
  }

  if (recruiterId) {
    query.$and = [
      {
        $or: [
          { postedBy: recruiterId },
          { assignedRecruiters: recruiterId },
        ],
      },
    ];
  }

  if (regex) {
    const searchFilter = {
      $or: [
        { title: regex },
        { role: regex },
        { companyName: regex },
        { jobId: regex },
      ],
    };
    if (query.$and) {
      query.$and.push(searchFilter);
    } else {
      query.$or = searchFilter.$or;
    }
  }

  const jobs = await Job.find(query)
    .select('_id jobId title role companyName tenantId status publishState createdAt')
    .sort({ createdAt: -1 })
    .limit(12)
    .lean();

  return jobs.map((job) => ({
    id: job._id,
    jobId: job.jobId,
    title: job.title || job.role,
    role: job.role,
    company: job.companyName || '',
    tenantId: job.tenantId || null,
    status: job.publishState || job.status,
    createdAt: job.createdAt,
  }));
}

async function buildCandidateUserScope(candidateItems = []) {
  return [...new Set(candidateItems.map((candidate) => candidate.student?.id).filter(Boolean))];
}

const search = catchAsync(async (req, res) => {
  const q = String(req.query.q || req.query.search || '').trim();
  const regex = buildSearchRegex(q);
  const commonFilters = {
    jobId: req.query.jobId,
    status: req.query.status,
    search: q,
    page: req.query.page,
    limit: req.query.limit,
  };
  const tenantId = getRequestTenantId(req);

  if (req.user.role === 'STUDENT') {
    const query = { tenantId, status: 'OPEN' };
    if (regex) {
      query.$or = [
        { title: regex },
        { role: regex },
        { companyName: regex },
        { jobId: regex },
      ];
    }

    const result = await paginate(Job, query, {
      page: req.query.page,
      limit: req.query.limit,
    });

    return sendData(res, 200, {
      users: [],
      jobs: (result.items || []).map((job) => ({
        id: job._id,
        jobId: job.jobId,
        title: job.title || job.role,
        role: job.role,
        company: job.companyName || '',
        tenantId: job.tenantId || null,
        status: job.publishState || job.status,
        createdAt: job.createdAt,
      })),
      candidates: [],
    });
  }

  if (req.user.role === 'RECRUITER') {
    const candidatesResult = await listRecruiterCandidates({
      recruiterId: req.user.id,
      tenantId,
      ...commonFilters,
    });
    const candidateUserIds = await buildCandidateUserScope(candidatesResult.items || []);
    const [users, jobs] = await Promise.all([
      searchUsers({ regex, tenantId, allowedUserIds: candidateUserIds }),
      searchJobs({ regex, tenantId, recruiterId: req.user.id, jobId: req.query.jobId }),
    ]);

    return sendData(res, 200, {
      users,
      jobs,
      candidates: candidatesResult.items || [],
    });
  }

  if (req.user.role === 'PLATFORM_SUPER_ADMIN') {
    const candidatesResult = await listAdminCandidates(commonFilters);
    const [users, jobs] = await Promise.all([
      searchUsers({ regex }),
      searchJobs({ regex, jobId: req.query.jobId }),
    ]);
    return sendData(res, 200, {
      users,
      jobs,
      candidates: candidatesResult.items || [],
    });
  }

  const candidatesResult = await listAdminCandidates({
    tenantId,
    ...commonFilters,
  });
  const [users, jobs] = await Promise.all([
    searchUsers({ regex, tenantId }),
    searchJobs({ regex, tenantId, jobId: req.query.jobId }),
  ]);
  return sendData(res, 200, {
    users,
    jobs,
    candidates: candidatesResult.items || [],
  });
});

module.exports = {
  search,
};
