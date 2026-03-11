import * as request from 'supertest';
import { RbacTestContext, createAuthenticatedUser, createRbacTestContext, deleteSupabaseUsers } from './rbac-test.utils';

/**
 * Agent Role Access Control Tests
 *
 * Verifies real HTTP access control for agent users.
 */
describe('Agent Access Control', () => {
  let ctx: RbacTestContext;
  const createdUsers: Array<{ id: string }> = [];

  beforeAll(async () => {
    ctx = await createRbacTestContext();
  });

  afterAll(async () => {
    await deleteSupabaseUsers(ctx, createdUsers);
    await ctx.cleanup();
  });

  it('returns 403 when an agent attempts to create a user and the handler does not persist anything', async () => {
    const agent = await createAuthenticatedUser(ctx, {
      tenantId: ctx.tenantAId,
      role: 'agent',
      name: 'Agent A',
      emailPrefix: 'rbac-agent-create',
    });
    createdUsers.push(agent);

    const forbiddenEmail = `blocked-${Date.now()}@example.com`;

    await request(ctx.app.getHttpServer())
      .post('/api/users')
      .set('Authorization', `Bearer ${agent.token}`)
      .send({
        email: forbiddenEmail,
        name: 'Should Not Exist',
        role: 'agent',
      })
      .expect(403);

    const result = await ctx.adminDataSource.query(
      'SELECT id FROM users WHERE email = $1',
      [forbiddenEmail],
    );

    expect(result).toHaveLength(0);
  });

  it('returns 403 when an agent attempts to update another user', async () => {
    const agent = await createAuthenticatedUser(ctx, {
      tenantId: ctx.tenantAId,
      role: 'agent',
      name: 'Agent B',
      emailPrefix: 'rbac-agent-update-actor',
    });
    createdUsers.push(agent);

    const victim = await createAuthenticatedUser(ctx, {
      tenantId: ctx.tenantAId,
      role: 'manager',
      name: 'Manager Victim',
      emailPrefix: 'rbac-agent-update-victim',
    });
    createdUsers.push(victim);

    await request(ctx.app.getHttpServer())
      .patch(`/api/users/${victim.id}`)
      .set('Authorization', `Bearer ${agent.token}`)
      .send({ name: 'Tampered Name' })
      .expect(403);
  });

  it('returns 403 when an agent attempts to delete another user', async () => {
    const agent = await createAuthenticatedUser(ctx, {
      tenantId: ctx.tenantAId,
      role: 'agent',
      name: 'Agent C',
      emailPrefix: 'rbac-agent-delete-actor',
    });
    createdUsers.push(agent);

    const victim = await createAuthenticatedUser(ctx, {
      tenantId: ctx.tenantAId,
      role: 'agent',
      name: 'Agent Victim',
      emailPrefix: 'rbac-agent-delete-victim',
    });
    createdUsers.push(victim);

    await request(ctx.app.getHttpServer())
      .delete(`/api/users/${victim.id}`)
      .set('Authorization', `Bearer ${agent.token}`)
      .expect(403);
  });

  it('returns only the authenticated agent when an agent lists users', async () => {
    const agent = await createAuthenticatedUser(ctx, {
      tenantId: ctx.tenantAId,
      role: 'agent',
      name: 'Agent Visible',
      emailPrefix: 'rbac-agent-list-self',
    });
    createdUsers.push(agent);

    const sameTenantManager = await createAuthenticatedUser(ctx, {
      tenantId: ctx.tenantAId,
      role: 'manager',
      name: 'Manager Hidden',
      emailPrefix: 'rbac-agent-list-manager',
    });
    createdUsers.push(sameTenantManager);

    const response = await request(ctx.app.getHttpServer())
      .get('/api/users')
      .set('Authorization', `Bearer ${agent.token}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      id: agent.id,
      email: agent.email,
      tenant_id: ctx.tenantAId,
      role: 'agent',
    });
  });
});
