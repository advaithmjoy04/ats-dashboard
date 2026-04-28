const multer = require('multer');
const AppError = require('../utils/AppError');
const path = require('path');

function createMemoryUpload({ maxSizeMb, allowedMimeTypes, allowedExtensions, errorMessage }) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxSizeMb * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const extension = path.extname(String(file.originalname || '')).toLowerCase();
      if (!allowedMimeTypes.includes(file.mimetype) || !allowedExtensions.includes(extension)) {
        return cb(new AppError(errorMessage, 400));
      }
      return cb(null, true);
    },
  });
}

const upload = createMemoryUpload({
  maxSizeMb: 5,
  allowedMimeTypes: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  allowedExtensions: ['.pdf', '.docx'],
  errorMessage: 'Only PDF and DOCX files are allowed',
});

const imageUpload = createMemoryUpload({
  maxSizeMb: 2,
  allowedMimeTypes: [
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/x-icon',
    'image/vnd.microsoft.icon',
  ],
  allowedExtensions: ['.png', '.jpg', '.jpeg', '.webp', '.ico'],
  errorMessage: 'Only PNG, JPG, WEBP, and ICO files are allowed',
});

module.exports = {
  upload,
  imageUpload,
};
