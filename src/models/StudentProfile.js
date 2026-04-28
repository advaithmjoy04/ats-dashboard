const mongoose = require('mongoose');
const { Schema } = mongoose;

const studentProfileSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    fullName: { type: String, required: true },
    usn: { type: String, trim: true },
    branch: { type: String },
    semester: { type: Number },
    cgpa: { type: Number, min: 0, max: 10 },
    phone: { type: String, trim: true },
    skills: [{ type: String }],
    educationDetails: { type: String },
    resumeKey: { type: String },
    resumeOriginalName: { type: String },
    resumeMimeType: { type: String },
    resumeSize: { type: Number },
    resumeExtractedText: { type: String },
    resumeExtractedAt: { type: Date },
    resumeTextDetected: { type: Boolean },
    resumeExtractionMissingFields: [{ type: String }],
    profileCompleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

studentProfileSchema.index(
  { usn: 1 },
  {
    unique: true,
    sparse: true,
  }
);
studentProfileSchema.index({ tenantId: 1, userId: 1 });

module.exports = mongoose.model('StudentProfile', studentProfileSchema);
