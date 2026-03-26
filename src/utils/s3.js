const { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

const s3Client = new S3Client({
  region: config.awsRegion,
  credentials: {
    accessKeyId: config.awsAccessKeyId,
    secretAccessKey: config.awsSecretAccessKey,
  },
});

function buildResumeKey(userId, originalName = 'resume.pdf') {
  const extension = originalName.split('.').pop() || 'pdf';
  return `resumes/${userId}/${Date.now()}-${uuidv4()}.${extension}`;
}

async function uploadBuffer({ key, body, contentType }) {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: config.awsBucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

async function getReadUrl(key, expiresIn = 900) {
  const command = new GetObjectCommand({ Bucket: config.awsBucket, Key: key });
  return getSignedUrl(s3Client, command, { expiresIn });
}

async function deleteObject(key) {
  if (!key) return;
  await s3Client.send(new DeleteObjectCommand({ Bucket: config.awsBucket, Key: key }));
}

module.exports = {
  buildResumeKey,
  uploadBuffer,
  getReadUrl,
  deleteObject,
};
