const mongoose = require('mongoose');
const config = require('../src/config');
const { Application, EmailLog, Job, StudentProfile, User } = require('../src/models');
const { getDefaultTenantId } = require('../src/services/tenantService');

async function backfillModel(model, field = 'tenantId') {
  const tenantId = await getDefaultTenantId();
  const result = await model.updateMany(
    { [field]: { $exists: false } },
    { $set: { [field]: tenantId } }
  );
  return result.modifiedCount || 0;
}

async function main() {
  await mongoose.connect(config.mongoUri);

  const updates = await Promise.all([
    backfillModel(User),
    backfillModel(StudentProfile),
    backfillModel(Job),
    backfillModel(Application),
    backfillModel(EmailLog),
  ]);

  console.log(`Backfilled tenant ownership for ${updates.reduce((sum, count) => sum + count, 0)} records.`);
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error.message);
  try {
    await mongoose.disconnect();
  } catch (disconnectError) {
    // ignore disconnect errors during failure cleanup
  }
  process.exit(1);
});
