const mongoose = require('mongoose');
const { Schema } = mongoose;

const JOB_STATUSES = ['DRAFT', 'OPEN', 'CLOSED'];

const jobSchema = new Schema(
  {
    jobId: { type: String, required: true, unique: true, trim: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    postedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: JOB_STATUSES, default: 'OPEN', index: true },
    deadline: { type: Date },
    companyName: { type: String, trim: true },
    role: { type: String, trim: true },
    minCgpa: { type: Number, min: 0, max: 10 },
    assignedRecruiters: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

jobSchema.index({ companyName: 1 });
jobSchema.index({ role: 1 });

module.exports = mongoose.model('Job', jobSchema);
