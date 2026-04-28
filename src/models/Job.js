const mongoose = require('mongoose');
const { Schema } = mongoose;

const JOB_STATUSES = ['DRAFT', 'OPEN', 'CLOSED'];
const JOB_VISIBILITY = ['INTERNAL', 'EXTERNAL'];
const JOB_WORK_MODES = ['IN_OFFICE', 'HYBRID', 'REMOTE'];
const SALARY_PERIODS = ['HOURLY', 'MONTHLY', 'ANNUAL'];
const FORM_FIELD_MODES = ['MANDATORY', 'OPTIONAL', 'OFF'];
const SCREENING_QUESTION_TYPES = ['TEXT', 'YES_NO', 'SINGLE_CHOICE', 'FILE_UPLOAD', 'URL'];

const jobLocationSchema = new Schema(
  {
    label: { type: String, trim: true, required: true },
    city: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    country: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const salaryConfigSchema = new Schema(
  {
    period: { type: String, enum: SALARY_PERIODS, default: 'ANNUAL' },
    min: { type: Number, min: 0 },
    max: { type: Number, min: 0 },
    currency: { type: String, trim: true, uppercase: true, default: 'INR' },
    hideFromCandidates: { type: Boolean, default: false },
  },
  { _id: false }
);

const experienceConfigSchema = new Schema(
  {
    minYears: { type: Number, min: 0 },
    maxYears: { type: Number, min: 0 },
    level: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const applicationFieldSchema = new Schema(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    category: { type: String, trim: true, default: '' },
    mode: { type: String, enum: FORM_FIELD_MODES, default: 'OPTIONAL' },
    placeholder: { type: String, trim: true, default: '' },
    helpText: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const screeningQuestionSchema = new Schema(
  {
    questionId: { type: String, trim: true, required: true },
    question: { type: String, trim: true, required: true },
    type: { type: String, enum: SCREENING_QUESTION_TYPES, required: true },
    required: { type: Boolean, default: true },
    options: [{ type: String, trim: true }],
    helperText: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const hiringStageSchema = new Schema(
  {
    stageKey: { type: String, trim: true, required: true },
    label: { type: String, trim: true, required: true },
    order: { type: Number, required: true, min: 0 },
    color: { type: String, trim: true, default: '' },
    locked: { type: Boolean, default: false },
  },
  { _id: false }
);

const jobSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', index: true },
    jobId: { type: String, required: true, unique: true, trim: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    postedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: JOB_STATUSES, default: 'OPEN', index: true },
    publishState: { type: String, enum: JOB_STATUSES, default: 'DRAFT', index: true },
    visibility: { type: String, enum: JOB_VISIBILITY, default: 'INTERNAL' },
    deadline: { type: Date },
    companyName: { type: String, trim: true },
    client: { type: String, trim: true },
    department: { type: String, trim: true },
    role: { type: String, trim: true },
    workMode: { type: String, enum: JOB_WORK_MODES, default: 'IN_OFFICE' },
    locations: { type: [jobLocationSchema], default: [] },
    salary: { type: salaryConfigSchema, default: () => ({}) },
    experience: { type: experienceConfigSchema, default: () => ({}) },
    employmentType: { type: String, trim: true },
    industryType: { type: String, trim: true },
    educationRequirements: [{ type: String, trim: true }],
    openings: { type: Number, min: 1 },
    requiredSkills: [{ type: String, trim: true }],
    prioritySkills: [{ type: String, trim: true }],
    minCgpa: { type: Number, min: 0, max: 10 },
    applicationFormFields: { type: [applicationFieldSchema], default: [] },
    screeningQuestions: { type: [screeningQuestionSchema], default: [] },
    hiringStages: { type: [hiringStageSchema], default: [] },
    assignedRecruiters: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

jobSchema.index({ companyName: 1 });
jobSchema.index({ role: 1 });
jobSchema.index({ tenantId: 1, createdAt: -1 });
jobSchema.index({ tenantId: 1, postedBy: 1, createdAt: -1 });
jobSchema.index({ tenantId: 1, publishState: 1, createdAt: -1 });

module.exports = mongoose.model('Job', jobSchema);
