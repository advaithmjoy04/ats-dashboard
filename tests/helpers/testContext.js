const bcrypt = require('bcryptjs');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod = null;
let cachedApp = null;

async function createTestContext() {
  jest.resetModules();
  mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri();

  const { connectDatabase, disconnectDatabase } = require('../../src/db');
  await connectDatabase(process.env.MONGO_URI);

  const models = require('../../src/models');
  const { signAccessToken, signRefreshToken } = require('../../src/utils/jwt');
  const { hashToken } = require('../../src/services/atsService');
  cachedApp = require('../../src/app');

  return {
    app: cachedApp,
    models,
    signAccessToken,
    signRefreshToken,
    hashToken,
    async createTenant(overrides = {}) {
      return models.Tenant.create({
        name: 'Tenant One',
        slug: 'tenant-one',
        supportEmail: 'support@tenant-one.example.com',
        emailFromName: 'Tenant One',
        loginHeadline: 'Welcome',
        loginSubtext: 'Sign in',
        allowedOrigins: ['https://app.example.com'],
        isActive: true,
        ...overrides,
      });
    },
    async createUser(overrides = {}) {
      return models.User.create({
        fullName: 'Test User',
        email: `user-${Date.now()}-${Math.random()}@example.com`,
        password: await bcrypt.hash('Password123', 10),
        role: 'ADMIN',
        status: 'ACTIVE',
        ...overrides,
      });
    },
    async createStudentProfile(overrides = {}) {
      return models.StudentProfile.create({
        tenantId: overrides.tenantId,
        userId: overrides.userId,
        fullName: 'Student User',
        usn: `USN-${Date.now()}`,
        branch: 'CSE',
        semester: 6,
        cgpa: 8.1,
        skills: ['react'],
        profileCompleted: false,
        ...overrides,
      });
    },
    buildAccessToken(user) {
      return signAccessToken({
        id: user._id,
        tenantId: user.tenantId,
        role: user.role,
        email: user.email,
        platformScope: user.role === 'PLATFORM_SUPER_ADMIN',
      });
    },
    async buildRefreshCookie(user, rawToken = null) {
      const token = rawToken || signRefreshToken({
        id: user._id,
        tenantId: user.tenantId,
        role: user.role,
        platformScope: user.role === 'PLATFORM_SUPER_ADMIN',
      });
      await models.User.updateOne(
        { _id: user._id },
        { $set: { refreshToken: hashToken(token) } }
      );
      return `refreshToken=${token}`;
    },
    async shutdown() {
      await disconnectDatabase();
      if (mongod) {
        await mongod.stop();
        mongod = null;
      }
    },
  };
}

module.exports = {
  createTestContext,
};
