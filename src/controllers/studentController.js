const { Application, Job, StudentProfile } = require('../models');
const { sendApplicationConfirmation, paginate, uploadResumeForStudent, getResumeReadUrl, deleteObject } = require('../services');
const { extractResumeFields, extractResumeText } = require('../services/resumeExtractionService');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { sendData, sendMessage } = require('../utils/response');

const getProfile = catchAsync(async (req, res, next) => {
  const profile = await StudentProfile.findOne({ userId: req.user.id });
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
  const profile = await StudentProfile.findOneAndUpdate({ userId: req.user.id }, updates, { new: true, runValidators: true });
  if (!profile) return next(new AppError('Profile not found', 404));
  return sendData(res, 200, {
    ...profile.toObject(),
    resumeUrl: profile.resumeKey ? await getResumeReadUrl(profile.resumeKey) : null,
  });
});

const uploadResume = catchAsync(async (req, res, next) => {
  if (!req.file) return next(new AppError('Resume file required', 400));
  const profile = await StudentProfile.findOne({ userId: req.user.id });
  if (!profile) return next(new AppError('Profile not found', 404));
  let resumeText = '';
  let extracted = {
    branch: undefined,
    cgpa: undefined,
    phone: undefined,
    educationDetails: undefined,
    skills: [],
  };
  let missingFields = ['branch', 'cgpa', 'educationDetails', 'skills'];

  try {
    resumeText = await extractResumeText(req.file);
    const extraction = extractResumeFields(resumeText);
    extracted = extraction.extracted;
    missingFields = extraction.missingFields;
  } catch (error) {
    // If parsing fails, still store the resume and let the student fill details manually.
  }

  Object.assign(profile, await uploadResumeForStudent(req.user.id, req.file, profile.resumeKey), {
    branch: extracted.branch || profile.branch,
    cgpa: extracted.cgpa ?? profile.cgpa,
    phone: extracted.phone || profile.phone,
    educationDetails: extracted.educationDetails || profile.educationDetails,
    skills: extracted.skills.length ? extracted.skills : profile.skills,
    resumeExtractedText: resumeText || '',
    resumeExtractedAt: new Date(),
    resumeExtractionMissingFields: missingFields,
  });
  await profile.save();
  return sendData(res, 200, {
    resumeKey: profile.resumeKey,
    resumeOriginalName: profile.resumeOriginalName,
    resumeMimeType: profile.resumeMimeType,
    resumeSize: profile.resumeSize,
    extractedFields: {
      branch: profile.branch || '',
      cgpa: profile.cgpa,
      phone: profile.phone || '',
      educationDetails: profile.educationDetails || '',
      skills: profile.skills || [],
    },
    missingFields,
  });
});

const getResumeUrl = catchAsync(async (req, res, next) => {
  const profile = await StudentProfile.findOne({ userId: req.user.id });
  if (!profile?.resumeKey) return next(new AppError('Resume not found', 404));
  return sendData(res, 200, { url: await getResumeReadUrl(profile.resumeKey) });
});

const listJobs = catchAsync(async (req, res) => {
  const profile = await StudentProfile.findOne({ userId: req.user.id }).lean();
  const result = await paginate(Job, { status: 'OPEN' }, { page: req.query.page, limit: req.query.limit });
  result.items = result.items.map((job) => ({
    ...job,
    eligible: (profile?.cgpa ?? 0) >= (job.minCgpa ?? 0),
  }));
  return sendData(res, 200, result);
});

const applyJob = catchAsync(async (req, res, next) => {
  const profile = await StudentProfile.findOne({ userId: req.user.id });
  if (!profile?.resumeKey) return next(new AppError('Upload a resume before applying', 400));
  const job = await Job.findOne({ jobId: req.body.jobId, status: 'OPEN' });
  if (!job) return next(new AppError('Job not found', 404));
  if (profile.cgpa < (job.minCgpa ?? 0)) return next(new AppError('Minimum CGPA not met', 400));
  const application = await Application.create({
    jobId: job._id,
    studentId: req.user.id,
    status: 'APPLIED',
    resumeKey: profile.resumeKey,
    resumeOriginalName: profile.resumeOriginalName,
    resumeMimeType: profile.resumeMimeType,
    resumeSize: profile.resumeSize,
  });
  await sendApplicationConfirmation({
    email: req.user.email,
    fullName: profile.fullName || req.user.fullName || req.user.email,
    jobTitle: job.title,
    companyName: job.companyName,
  });
  return sendData(res, 201, application);
});

const myApplications = catchAsync(async (req, res) => {
  const result = await paginate(Application, { studentId: req.user.id }, {
    page: req.query.page,
    limit: req.query.limit,
    populate: { path: 'jobId' },
  });
  result.items = await Promise.all(
    result.items.map(async (application) => ({
      ...application,
      resumeUrl: application.resumeKey ? await getResumeReadUrl(application.resumeKey) : null,
    }))
  );
  return sendData(res, 200, result);
});

const withdrawApplication = catchAsync(async (req, res, next) => {
  const application = await Application.findOne({ _id: req.params.id, studentId: req.user.id });
  if (!application) return next(new AppError('Application not found', 404));
  application.status = 'WITHDRAWN';
  await application.save();
  return sendMessage(res, 200, 'Application withdrawn successfully');
});

const deleteOwnApplication = catchAsync(async (req, res, next) => {
  const application = await Application.findOneAndDelete({ _id: req.params.id, studentId: req.user.id });
  if (!application) return next(new AppError('Application not found', 404));
  await deleteObject(application.resumeKey);
  return sendMessage(res, 200, 'Application deleted successfully');
});

module.exports = {
  getProfile,
  updateProfile,
  uploadResume,
  getResumeUrl,
  listJobs,
  applyJob,
  myApplications,
  withdrawApplication,
  deleteOwnApplication,
};
