const dotenv = require('dotenv');

dotenv.config();

const requiredEnv = [
  'PORT',
  'MONGO_URI',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'JWT_REFRESH_SECRET',
  'JWT_REFRESH_EXPIRES_IN',
  'ALLOWED_ORIGINS',
  'FRONTEND_ORIGIN',
  'AWS_REGION',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_S3_BUCKET',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
];

const missing = requiredEnv.filter((key) => !process.env[key]);
if (missing.length) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

module.exports = {
  port: Number(process.env.PORT),
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  frontendOrigin: process.env.FRONTEND_ORIGIN,
  allowedOrigins: process.env.ALLOWED_ORIGINS.split(',').map((value) => value.trim()).filter(Boolean),
  awsRegion: process.env.AWS_REGION,
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  awsBucket: process.env.AWS_S3_BUCKET,
  smtpHost: process.env.SMTP_HOST,
  smtpPort: Number(process.env.SMTP_PORT),
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  smtpFrom: process.env.SMTP_FROM,
  nodeEnv: process.env.NODE_ENV || 'development',
};
