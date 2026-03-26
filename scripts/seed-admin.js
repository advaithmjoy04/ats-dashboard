const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const config = require('../src/config');
const { User } = require('../src/models');

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD || 'Admin@123';
  const fullName = process.env.ADMIN_FULL_NAME || 'Platform Admin';

  await mongoose.connect(config.mongoUri);

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.findOneAndUpdate(
    { email: email.toLowerCase() },
    {
      fullName,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
      failedLoginAttempts: 0,
      lockUntil: undefined,
      resetToken: undefined,
      resetTokenExpiry: undefined,
      inviteToken: undefined,
      inviteTokenExpiry: undefined,
      refreshToken: undefined,
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  ).select('+password');

  console.log('Admin user is ready');
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
