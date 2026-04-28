const request = require('supertest');
const bcrypt = require('bcryptjs');
const { createTestContext } = require('./helpers/testContext');

describe('security integration', () => {
  let ctx;

  beforeEach(async () => {
    ctx = await createTestContext();
  });

  afterEach(async () => {
    if (ctx?.shutdown) {
      await ctx.shutdown();
    }
  });

  test('platform super admin can use /auth/me without tenantId', async () => {
    const platformUser = await ctx.createUser({
      email: 'platform@example.com',
      role: 'PLATFORM_SUPER_ADMIN',
      tenantId: undefined,
    });

    const response = await request(ctx.app)
      .get('/api/v1/auth/me')
      .set('Host', 'app.example.com')
      .set('Authorization', `Bearer ${ctx.buildAccessToken(platformUser)}`);

    expect(response.status).toBe(200);
    expect(response.body.data.role).toBe('PLATFORM_SUPER_ADMIN');
  });

  test('institute admin cannot access platform routes', async () => {
    const tenant = await ctx.createTenant();
    const admin = await ctx.createUser({
      email: 'admin@tenant-one.example.com',
      tenantId: tenant._id,
      role: 'ADMIN',
    });

    const response = await request(ctx.app)
      .get('/api/v1/platform/tenants')
      .set('Host', 'app.example.com')
      .set('Authorization', `Bearer ${ctx.buildAccessToken(admin)}`);

    expect(response.status).toBe(403);
  });

  test('cross-tenant admin access is denied by host tenant mismatch', async () => {
    const tenantA = await ctx.createTenant({ name: 'Tenant A', slug: 'tenant-a', subdomain: 'tenant-a' });
    const tenantB = await ctx.createTenant({ name: 'Tenant B', slug: 'tenant-b', subdomain: 'tenant-b' });
    const admin = await ctx.createUser({
      email: 'admin@tenant-a.example.com',
      tenantId: tenantA._id,
      role: 'ADMIN',
    });
    await ctx.createUser({
      email: 'student@tenant-a.example.com',
      tenantId: tenantA._id,
      role: 'STUDENT',
    });

    const response = await request(ctx.app)
      .get('/api/v1/admin/students')
      .set('Host', `${tenantB.subdomain}.example.com`)
      .set('Authorization', `Bearer ${ctx.buildAccessToken(admin)}`);

    expect(response.status).toBe(403);
  });

  test('cross-tenant recruiter access is denied for foreign job applicants', async () => {
    const tenantA = await ctx.createTenant({ name: 'Tenant A', slug: 'tenant-a', subdomain: 'tenant-a' });
    const tenantB = await ctx.createTenant({ name: 'Tenant B', slug: 'tenant-b', subdomain: 'tenant-b' });
    const recruiterA = await ctx.createUser({
      email: 'recruiter-a@example.com',
      tenantId: tenantA._id,
      role: 'RECRUITER',
    });
    const recruiterB = await ctx.createUser({
      email: 'recruiter-b@example.com',
      tenantId: tenantB._id,
      role: 'RECRUITER',
    });
    const jobB = await ctx.models.Job.create({
      tenantId: tenantB._id,
      jobId: 'TENANTB-001',
      title: 'Backend Engineer',
      companyName: 'Tenant B',
      description: 'Role',
      status: 'OPEN',
      publishState: 'OPEN',
      postedBy: recruiterB._id,
      assignedRecruiters: [recruiterB._id],
    });

    const response = await request(ctx.app)
      .get(`/api/v1/recruiters/jobs/${jobB.jobId}/applicants`)
      .set('Host', `${tenantA.subdomain}.example.com`)
      .set('Authorization', `Bearer ${ctx.buildAccessToken(recruiterA)}`);

    expect(response.status).toBe(404);
  });

  test('refresh token tenant mismatch is denied', async () => {
    const tenantA = await ctx.createTenant({ name: 'Tenant A', slug: 'tenant-a', subdomain: 'tenant-a' });
    const tenantB = await ctx.createTenant({ name: 'Tenant B', slug: 'tenant-b', subdomain: 'tenant-b' });
    const admin = await ctx.createUser({
      email: 'admin@tenant-a.example.com',
      tenantId: tenantA._id,
      role: 'ADMIN',
    });

    const cookie = await ctx.buildRefreshCookie(admin);
    const response = await request(ctx.app)
      .post('/api/v1/auth/refresh')
      .set('Host', `${tenantB.subdomain}.example.com`)
      .set('Cookie', cookie);

    expect(response.status).toBe(403);
  });

  test('reset token cannot be used across tenants on shared host', async () => {
    const tenantA = await ctx.createTenant({ name: 'Tenant A', slug: 'tenant-a' });
    await ctx.createTenant({ name: 'Tenant B', slug: 'tenant-b' });
    const rawToken = 'reset-token-a';
    const student = await ctx.createUser({
      email: 'student@tenant-a.example.com',
      tenantId: tenantA._id,
      role: 'STUDENT',
      resetToken: ctx.hashToken(rawToken),
      resetTokenExpiry: new Date(Date.now() + 60000),
    });

    const response = await request(ctx.app)
      .post('/api/v1/auth/reset-password?tenant=tenant-b')
      .set('Host', 'localhost:3000')
      .send({ token: rawToken, newPassword: 'NewPassword123' });

    expect(response.status).toBe(400);

    const unchanged = await ctx.models.User.findById(student._id).select('+password');
    expect(await bcrypt.compare('Password123', unchanged.password)).toBe(true);
  });

  test('destructive admin actions fail with incorrect password confirmation', async () => {
    const tenant = await ctx.createTenant({ name: 'Tenant A', slug: 'tenant-a', subdomain: 'tenant-a' });
    const admin = await ctx.createUser({
      email: 'admin@tenant-a.example.com',
      tenantId: tenant._id,
      role: 'ADMIN',
    });
    const student = await ctx.createUser({
      email: 'student@tenant-a.example.com',
      tenantId: tenant._id,
      role: 'STUDENT',
    });

    const response = await request(ctx.app)
      .patch(`/api/v1/admin/users/${student._id}/deactivate`)
      .set('Host', `${tenant.subdomain}.example.com`)
      .set('Authorization', `Bearer ${ctx.buildAccessToken(admin)}`)
      .send({ passwordConfirmation: 'WrongPassword123' });

    expect(response.status).toBe(403);
  });

  test('tenant public config ignores foreign tenant hint on custom domains', async () => {
    const tenantA = await ctx.createTenant({
      name: 'Tenant A',
      slug: 'tenant-a',
      customDomain: 'a.example.com',
      loginHeadline: 'Tenant A Login',
    });
    await ctx.createTenant({
      name: 'Tenant B',
      slug: 'tenant-b',
      customDomain: 'b.example.com',
      loginHeadline: 'Tenant B Login',
    });

    const response = await request(ctx.app)
      .get('/api/v1/tenant/public?tenant=tenant-b')
      .set('Host', tenantA.customDomain);

    expect(response.status).toBe(200);
    expect(response.body.data.slug).toBe('tenant-a');
    expect(response.body.data.loginHeadline).toBe('Tenant A Login');
  });

  test('student can only access own-tenant job data', async () => {
    const tenantA = await ctx.createTenant({ name: 'Tenant A', slug: 'tenant-a', subdomain: 'tenant-a' });
    await ctx.createTenant({ name: 'Tenant B', slug: 'tenant-b', subdomain: 'tenant-b' });
    const student = await ctx.createUser({
      email: 'student@tenant-a.example.com',
      tenantId: tenantA._id,
      role: 'STUDENT',
    });
    await ctx.createStudentProfile({ tenantId: tenantA._id, userId: student._id });

    const response = await request(ctx.app)
      .get('/api/v1/students/jobs')
      .set('Host', 'tenant-b.example.com')
      .set('Authorization', `Bearer ${ctx.buildAccessToken(student)}`);

    expect(response.status).toBe(403);
  });
});
