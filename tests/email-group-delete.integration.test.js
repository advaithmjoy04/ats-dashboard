const request = require('supertest');
const { createTestContext } = require('./helpers/testContext');

describe('email group delete integration', () => {
  let ctx;

  beforeEach(async () => {
    ctx = await createTestContext();
  });

  afterEach(async () => {
    if (ctx?.shutdown) {
      await ctx.shutdown();
    }
  });

  test('admin can delete email group', async () => {
    const tenant = await ctx.createTenant({ name: 'Tenant A', slug: 'tenant-a', subdomain: 'tenant-a' });
    const admin = await ctx.createUser({
      email: 'admin@tenant-a.example.com',
      tenantId: tenant._id,
      role: 'ADMIN',
    });

    const group = await ctx.models.EmailGroup.create({
      tenantId: tenant._id,
      name: 'Test Group',
      role: 'STUDENT',
      createdBy: admin._id,
    });

    const response = await request(ctx.app)
      .delete(`/api/v1/admin/email-groups/${group._id}`)
      .set('Host', `${tenant.subdomain}.example.com`)
      .set('Authorization', `Bearer ${ctx.buildAccessToken(admin)}`);

    expect(response.status).toBe(200);

    const deletedGroup = await ctx.models.EmailGroup.findById(group._id);
    expect(deletedGroup).toBeNull();
  });
});
