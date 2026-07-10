const request = require('supertest');
const { createTestContext } = require('./helpers/testContext');

describe('tenant assets integration', () => {
  let ctx;

  beforeEach(async () => {
    ctx = await createTestContext();
  });

  afterEach(async () => {
    if (ctx?.shutdown) {
      await ctx.shutdown();
    }
  });

  test('public config returns asset URLs with tenant slug parameter', async () => {
    const tenant = await ctx.createTenant({
      name: 'Test Tenant',
      slug: 'test-tenant',
      logoKey: 'logo-key-123',
    });

    const response = await request(ctx.app)
      .get('/api/v1/tenant/public?tenant=test-tenant')
      .set('Host', 'app.example.com');

    expect(response.status).toBe(200);
    expect(response.body.data.logoUrl).toContain('tenant=test-tenant');
  });

  test('admin can update settings with relative and absolute logo/favicon URLs', async () => {
    const tenant = await ctx.createTenant({ name: 'Tenant A', slug: 'tenant-a', subdomain: 'tenant-a' });
    const admin = await ctx.createUser({
      email: 'admin@tenant-a.example.com',
      tenantId: tenant._id,
      role: 'ADMIN',
    });

    const response = await request(ctx.app)
      .patch('/api/v1/tenant/settings')
      .set('Host', `${tenant.subdomain}.example.com`)
      .set('Authorization', `Bearer ${ctx.buildAccessToken(admin)}`)
      .send({
        name: 'New Tenant Name',
        logoUrl: '/api/v1/tenant/assets/logo?tenant=tenant-a',
        faviconUrl: 'https://example.com/external-favicon.ico',
      });

    expect(response.status).toBe(200);

    const updated = await ctx.models.Tenant.findById(tenant._id);
    expect(updated.name).toBe('New Tenant Name');
    expect(updated.logoUrl).toBe('/api/v1/tenant/assets/logo?tenant=tenant-a');
    expect(updated.faviconUrl).toBe('https://example.com/external-favicon.ico');
  });
});
