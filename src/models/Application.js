const mongoose = require('mongoose');
const { Schema } = mongoose;

const APPLICATION_STATUSES = ['APPLIED', 'SHORTLISTED', 'REJECTED', 'SELECTED', 'WITHDRAWN'];
const APPLICATION_FIELD_TYPES = ['TEXT', 'EMAIL', 'PHONE', 'NUMBER', 'TEXTAREA', 'URL', 'FILE', 'YES_NO', 'SINGLE_CHOICE'];

const applicationFieldAnswerSchema = new Schema(
  {
    fieldKey: { type: String, trim: true, required: true },
    label: { type: String, trim: true, required: true },
    type: { type: String, enum: APPLICATION_FIELD_TYPES, default: 'TEXT' },
    value: { type: Schema.Types.Mixed, default: null },
  },
  { _id: false }
);

const screeningAnswerSchema = new Schema(
  {
    questionId: { type: String, trim: true, required: true },
    question: { type: String, trim: true, required: true },
    type: { type: String, trim: true, required: true },
    answer: { type: Schema.Types.Mixed, default: null },
  },
  { _id: false }
);

const uploadedArtifactSchema = new Schema(
  {
    fieldKey: { type: String, trim: true, default: '' },
    label: { type: String, trim: true, default: '' },
    fileKey: { type: String, trim: true, required: true },
    originalName: { type: String, trim: true, default: '' },
    mimeType: { type: String, trim: true, default: '' },
    size: { type: Number, min: 0 },
  },
  { _id: false }
);

const stageHistorySchema = new Schema(
  {
    stageKey: { type: String, trim: true, required: true },
    stageLabel: { type: String, trim: true, default: '' },
    movedAt: { type: Date, default: Date.now },
    movedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    note: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const applicationFeedbackSchema = new Schema(
  {
    summary: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
    rating: { type: Number, min: 1, max: 5 },
    updatedAt: { type: Date, default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { _id: false }
);

const applicationSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
    status: {
      type: String,
      enum: APPLICATION_STATUSES,
      default: 'APPLIED',
      required: true,
      index: true,
    },
    resumeKey: { type: String },
    resumeOriginalName: { type: String },
    resumeMimeType: { type: String },
    resumeSize: { type: Number },
    submittedFields: { type: [applicationFieldAnswerSchema], default: [] },
    screeningAnswers: { type: [screeningAnswerSchema], default: [] },
    uploadedArtifacts: { type: [uploadedArtifactSchema], default: [] },
    currentStageKey: { type: String, trim: true, default: 'applied' },
    currentStageLabel: { type: String, trim: true, default: 'Applied' },
    stageHistory: { type: [stageHistorySchema], default: [] },
    feedback: { type: applicationFeedbackSchema, default: () => ({}) },
  },
  { timestamps: true }
);

applicationSchema.index({ studentId: 1, jobId: 1 }, { unique: true });
applicationSchema.index({ tenantId: 1, status: 1 });
applicationSchema.index({ tenantId: 1, currentStageKey: 1, createdAt: -1 });

module.exports = mongoose.model('Application', applicationSchema);
