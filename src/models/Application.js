const mongoose = require('mongoose');
const { Schema } = mongoose;

const APPLICATION_STATUSES = ['APPLIED', 'SHORTLISTED', 'REJECTED', 'SELECTED', 'WITHDRAWN'];

const applicationSchema = new Schema(
  {
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
  },
  { timestamps: true }
);

applicationSchema.index({ studentId: 1, jobId: 1 }, { unique: true });

module.exports = mongoose.model('Application', applicationSchema);
