import * as jwt from 'jsonwebtoken';
import * as request from 'supertest';
import { RbacTestContext, createAuthenticatedUser, createRbacTestContext, deleteSupabaseUsers } from './rbac-test.utils';

/**
 * Owner/Manager Role Access Control Tests
 *
 * Verifies real HTTP access control for owner and manager users.
 */
describe('Owner/Manager Access Control', () => {
  let ctx: RbacTestContext;
  const createdUsers: Array<{ id: string }> = [];

  beforeAll(async () => {
    ctx = await createRbacTestContext();
  });

  afterAll(async () => {
    await deleteSupabaseUsers(ctx, createdUsers);
    await ctx.cleanup();
  });

  it('allows an owner to create a user and assigns tenant scope server-side', async () => {
    const owner = await createAuthenticatedUser(ctx, {
      tenantId: ctx.tenantAId,
      role: 'owner',
      name: 'Owner A',
      emailPrefix: 'rbac-owner-create-actor',
    });
    createdUsers.push(owner);

    const createdEmail = `created-owner-${Date.now()}@example.com`;

    const response = await request(ctx.app.getHttpServer())
      .post('/api/users')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({
        email: createdEmail,
        name: 'Created By Owner',
        role: 'agent',
      })
      .expect(201);

    const createdId = response.body.id as string;

    expect(response.body).toMatchObject({
      email: createdEmail,
      name: 'Created By Owner',
      role: 'agent',
      tenant_id: ctx.tenantAId,
    });

    const rows = await ctx.adminDataSource.query(
      'SELECT id, tenant_id FROM users WHERE id = $1',
      [createdId],
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].tenant_id).toBe(ctx.tenantAId);
  });

  it('allows a manager to create a user and assigns tenant scope server-side', async () => {
    const manager = await createAuthenticatedUser(ctx, {
      tenantId: ctx.tenantAId,
      role: 'manager',
      name: 'Manager A',
      emailPrefix: 'rbac-manager-create-actor',
    });
    createdUsers.push(manager);

    const createdEmail = `created-manager-${Date.now()}@example.com`;

    const response = await request(ctx.app.getHttpServer())
      .post('/api/users')
      .set('Authorization', `Bearer ${manager.token}`)
      .send({
        email: createdEmail,
        name: 'Created By Manager',
        role: 'agent',
      })
      .expect(201);

    expect(response.body.tenant_id).toBe(ctx.tenantAId);
  });

  it('allows owner and manager to update users in their tenant', async () => {
    const owner = await createAuthenticatedUser(ctx, {
      tenantId: ctx.tenantAId,
      role: 'owner',
      name: 'Owner Update',
      emailPrefix: 'rbac-owner-update-actor',
    });
    createdUsers.push(owner);

    const manager = await createAuthenticatedUser(ctx, {
      tenantId: ctx.tenantAId,
      role: 'manager',
      name: 'Manager Update',
      emailPrefix: 'rbac-manager-update-actor',
    });
    createdUsers.push(manager);

    const victim = await createAuthenticatedUser(ctx, {
      tenantId: ctx.tenantAId,
      role: 'agent',
      name: 'Agent Update Victim',
      emailPrefix: 'rbac-update-victim',
    });
    createdUsers.push(victim);

    await request(ctx.app.getHttpServer())
      .patch(`/api/users/${victim.id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ name: 'Updated By Owner' })
      .expect(200);

    await request(ctx.app.getHttpServer())
      .patch(`/api/users/${victim.id}`)
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ name: 'Updated By Manager' })
      .expect(200);

    const rows = await ctx.adminDataSource.query(
      'SELECT name FROM users WHERE id = $1',
      [victim.id],
    );

    expect(rows[0].name).toBe('Updated By Manager');
  });

  it('allows an owner to delete a user and blocks a manager from deleting a user', async () => {
    const owner = await createAuthenticatedUser(ctx, {
      tenantId: ctx.tenantAId,
      role: 'owner',
      name: 'Owner Delete',
      emailPrefix: 'rbac-owner-delete-actor',
    });
    createdUsers.push(owner);

    const manager = await createAuthenticatedUser(ctx, {
      tenantId: ctx.tenantAId,
      role: 'manager',
      name: 'Manager Delete',
      emailPrefix: 'rbac-manager-delete-actor',
    });
    createdUsers.push(manager);

    const managerVictim = await createAuthenticatedUser(ctx, {
      tenantId: ctx.tenantAId,
      role: 'agent',
      name: 'Manager Delete Victim',
      emailPrefix: 'rbac-manager-delete-victim',
    });
    createdUsers.push(managerVictim);

    await request(ctx.app.getHttpServer())
      .delete(`/api/users/${managerVictim.id}`)
      .set('Authorization', `Bearer ${manager.token}`)
      .expect(403);

    const stillThere = await ctx.adminDataSource.query(
      'SELECT id FROM users WHERE id = $1',
      [managerVictim.id],
    );
    expect(stillThere).toHaveLength(1);

    const ownerVictim = await createAuthenticatedUser(ctx, {
      tenantId: ctx.tenantAId,
      role: 'agent',
      name: 'Owner Delete Victim',
      emailPrefix: 'rbac-owner-delete-victim',
    });
    createdUsers.push(ownerVictim);

    await request(ctx.app.getHttpServer())
      .delete(`/api/users/${ownerVictim.id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(200);

    const deleted = await ctx.adminDataSource.query(
      'SELECT id FROM users WHERE id = $1',
      [ownerVictim.id],
    );
    expect(deleted).toHaveLength(0);
  });

  it('returns all tenant users for owner and manager', async () => {
    const owner = await createAuthenticatedUser(ctx, {
      tenantId: ctx.tenantAId,
      role: 'owner',
      name: 'Owner Visible',
      emailPrefix: 'rbac-owner-list',
    });
    createdUsers.push(owner);

    const manager = await createAuthenticatedUser(ctx, {
      tenantId: ctx.tenantAId,
      role: 'manager',
      name: 'Manager Visible',
      emailPrefix: 'rbac-manager-list',
    });
    createdUsers.push(manager);

    const tenantBUser = await createAuthenticatedUser(ctx, {
      tenantId: ctx.tenantBId,
      role: 'owner',
      name: 'Other Tenant Owner',
      emailPrefix: 'rbac-other-tenant-list',
    });
    createdUsers.push(tenantBUser);

    const ownerResponse = await request(ctx.app.getHttpServer())
      .get('/api/users')
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(200);

    const managerResponse = await request(ctx.app.getHttpServer())
      .get('/api/users')
      .set('Authorization', `Bearer ${manager.token}`)
      .expect(200);

    expect(ownerResponse.body.some((user: any) => user.id === owner.id)).toBe(true);
    expect(ownerResponse.body.some((user: any) => user.id === manager.id)).toBe(true);
    expect(ownerResponse.body.some((user: any) => user.id === tenantBUser.id)).toBe(false);

    expect(managerResponse.body.some((user: any) => user.id === owner.id)).toBe(true);
    expect(managerResponse.body.some((user: any) => user.id === manager.id)).toBe(true);
    expect(managerResponse.body.some((user: any) => user.id === tenantBUser.id)).toBe(false);
  });

  it('rejects requests when the authenticated token is missing a role claim', async () => {
    const missingRoleToken = jwt.sign(
      {
        sub: 'missing-role-user',
        email: 'missing-role@example.com',
        tenant_id: ctx.tenantAId,
      },
      process.env.SUPABASE_JWT_SECRET as string,
      { algorithm: 'HS256' },
    );

    await request(ctx.app.getHttpServer())
      .get('/api/users')
      .set('Authorization', `Bearer ${missingRoleToken}`)
      .expect(401);
  });
});
