const mongoose = require('mongoose');
const config = require('../src/config');
const { getOrCreateDefaultTenant } = require('../src/services/tenantService');

async function main() {
  await mongoose.connect(config.mongoUri);
  const tenant = await getOrCreateDefaultTenant();
  console.log(`Default tenant ready: ${tenant.name} (${tenant.slug})`);
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
