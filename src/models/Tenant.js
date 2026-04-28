const mongoose = require('mongoose');

const { Schema } = mongoose;

const tenantSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    logoKey: { type: String, trim: true },
    logoUrl: { type: String, trim: true },
    faviconKey: { type: String, trim: true },
    faviconUrl: { type: String, trim: true },
    primaryColor: { type: String, trim: true, default: '#3d79f2' },
    secondaryColor: { type: String, trim: true, default: '#18212f' },
    supportEmail: { type: String, trim: true, lowercase: true },
    emailFromName: { type: String, trim: true },
    loginHeadline: { type: String, trim: true },
    loginSubtext: { type: String, trim: true },
    customDomain: { type: String, trim: true, lowercase: true, sparse: true, unique: true },
    subdomain: { type: String, trim: true, lowercase: true, sparse: true, unique: true },
    allowedOrigins: [{ type: String, trim: true, lowercase: true }],
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Tenant', tenantSchema);
