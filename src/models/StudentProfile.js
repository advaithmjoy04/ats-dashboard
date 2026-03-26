const mongoose = require('mongoose');
const { Schema } = mongoose;

const studentProfileSchema = new Schema(
  {
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
    resumeExtractionMissingFields: [{ type: String }],
    profileCompleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

studentProfileSchema.index(
  { usn: 1 },
  {
    unique: true,
    partialFilterExpression: {
      usn: { $exists: true, $type: 'string', $ne: '' },
    },
  }
);

module.exports = mongoose.model('StudentProfile', studentProfileSchema);
