const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const config = require('../src/config');
const { User } = require('../src/models');
const { getDefaultTenantId } = require('../src/services/tenantService');

async function main() {
  const email = process.env.PLATFORM_ADMIN_EMAIL || 'platform-admin@example.com';
  const password = process.env.PLATFORM_ADMIN_PASSWORD || 'Platform@123';
  const fullName = process.env.PLATFORM_ADMIN_FULL_NAME || 'Platform Super Admin';

  await mongoose.connect(config.mongoUri);
  const tenantId = await getDefaultTenantId();

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.findOneAndUpdate(
    { email: email.toLowerCase() },
    {
      tenantId,
      fullName,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'PLATFORM_SUPER_ADMIN',
      status: 'ACTIVE',
      failedLoginAttempts: 0,
      lockUntil: undefined,
      resetToken: undefined,
      resetTokenExpiry: undefined,
      inviteToken: undefined,
      inviteTokenExpiry: undefined,
      refreshToken: undefined,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).select('+password');

  console.log('Platform super admin is ready');
  console.log(`Email: ${user.email}`);
  console.log(`Password: ${password}`);

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
