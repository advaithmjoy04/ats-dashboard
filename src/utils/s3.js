const { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { randomUUID } = require('crypto');
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
  return `resumes/${userId}/${Date.now()}-${randomUUID()}.${extension}`;
}

function buildTenantAssetKey(tenantId, assetType, originalName = 'asset.png') {
  const normalizedType = assetType === 'favicon' ? 'favicon' : 'logo';
  const extension = (originalName.split('.').pop() || 'png').toLowerCase();
  return `tenant-assets/${tenantId}/${normalizedType}/${Date.now()}-${randomUUID()}.${extension}`;
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
  buildTenantAssetKey,
  uploadBuffer,
  getReadUrl,
  deleteObject,
};
