const multer = require('multer');
const AppError = require('../utils/AppError');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowed.includes(file.mimetype)) {
      return cb(new AppError('Only PDF and DOCX files are allowed', 400));
    }
    return cb(null, true);
  },
});

module.exports = upload;
