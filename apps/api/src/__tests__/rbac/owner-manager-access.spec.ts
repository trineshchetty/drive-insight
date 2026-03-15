import * as jwt from 'jsonwebtoken';
import * as request from 'supertest';
import {
  RbacTestContext,
  createAuthenticatedUser,
  createRbacTestContext,
  deleteSupabaseUsers,
} from './rbac-test.utils';

describe('Owner/Manager Access Control', () => {
  let ctx: RbacTestContext;
  let fetchSpy: jest.SpiedFunction<typeof fetch>;
  const originalFetch = global.fetch;
  const createdUsers: Array<{ id: string }> = [];
  const originalResendApiKey = process.env.RESEND_API_KEY;
  const originalResendFromEmail = process.env.RESEND_FROM_EMAIL;

  beforeAll(async () => {
    process.env.RESEND_API_KEY = 'test-resend-key';
    process.env.RESEND_FROM_EMAIL = 'invites@example.com';
    fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(async (input, init) => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      if (url.startsWith('https://api.resend.com/')) {
        return {
          ok: true,
          text: async () => '',
          json: async () => ({ id: 'email_123' }),
        } as Response;
      }

      return originalFetch(input, init);
    });
    ctx = await createRbacTestContext();
  });

  beforeEach(() => {
    fetchSpy.mockClear();
  });

  afterAll(async () => {
    fetchSpy.mockRestore();
    process.env.RESEND_API_KEY = originalResendApiKey;
    process.env.RESEND_FROM_EMAIL = originalResendFromEmail;
    await deleteSupabaseUsers(ctx, createdUsers);
    await ctx.cleanup();
  });

  it('allows an owner to create a local-only user and assigns tenant scope server-side', async () => {
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
      account_status: 'active',
      must_change_password: false,
    });

    const rows = await ctx.adminDataSource.query(
      'SELECT id, tenant_id, account_status FROM users WHERE id = $1',
      [createdId],
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].tenant_id).toBe(ctx.tenantAId);
    expect(rows[0].account_status).toBe('active');
  });

  it('allows a manager to create a local-only user and assigns tenant scope server-side', async () => {
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
    expect(response.body.account_status).toBe('active');
  });

  it('allows an owner to invite a user, sends email, and blocks managers from the invite endpoint', async () => {
    const owner = await createAuthenticatedUser(ctx, {
      tenantId: ctx.tenantAId,
      role: 'owner',
      name: 'Owner Invite',
      emailPrefix: 'rbac-owner-invite-actor',
    });
    createdUsers.push(owner);

    const manager = await createAuthenticatedUser(ctx, {
      tenantId: ctx.tenantAId,
      role: 'manager',
      name: 'Manager Invite',
      emailPrefix: 'rbac-manager-invite-actor',
    });
    createdUsers.push(manager);

    const ownerInvitedEmail = `invited-owner-${Date.now()}@example.com`;

    const ownerResponse = await request(ctx.app.getHttpServer())
      .post('/api/users/invite')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({
        email: ownerInvitedEmail,
        name: 'Invited Agent',
        role: 'agent',
      })
      .expect(201);

    createdUsers.push({ id: ownerResponse.body.user.id });

    expect(ownerResponse.body).toMatchObject({
      invite_status: 'sent',
      invite_email_status: 'queued',
      user: {
        email: ownerInvitedEmail,
        tenant_id: ctx.tenantAId,
        role: 'agent',
        account_status: 'invited',
        must_change_password: true,
      },
    });
    expect(
      fetchSpy.mock.calls.filter(([input]) => {
        const url =
          typeof input === 'string'
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url;
        return url.startsWith('https://api.resend.com/');
      }),
    ).toHaveLength(1);

    const invitedRows = await ctx.adminDataSource.query(
      'SELECT tenant_id, account_status, must_change_password FROM users WHERE email = $1',
      [ownerInvitedEmail],
    );

    expect(invitedRows).toHaveLength(1);
    expect(invitedRows[0]).toMatchObject({
      tenant_id: ctx.tenantAId,
      account_status: 'invited',
      must_change_password: true,
    });

    const blockedEmail = `blocked-manager-${Date.now()}@example.com`;

    await request(ctx.app.getHttpServer())
      .post('/api/users/invite')
      .set('Authorization', `Bearer ${manager.token}`)
      .send({
        email: blockedEmail,
        name: 'Blocked Invite',
        role: 'agent',
      })
      .expect(403);

    const blockedRows = await ctx.adminDataSource.query(
      'SELECT id FROM users WHERE email = $1',
      [blockedEmail],
    );
    expect(blockedRows).toHaveLength(0);
  });

  it('allows an owner to update agent profiles and blocks managers from the update endpoint', async () => {
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

    const workingHours = {
      monday: { enabled: true, start: '08:00', end: '17:00' },
      tuesday: { enabled: true, start: '08:00', end: '17:00' },
      wednesday: { enabled: true, start: '08:00', end: '17:00' },
      thursday: { enabled: true, start: '08:00', end: '17:00' },
      friday: { enabled: true, start: '08:00', end: '16:00' },
      saturday: { enabled: false, start: null, end: null },
      sunday: { enabled: false, start: null, end: null },
    };

    const ownerResponse = await request(ctx.app.getHttpServer())
      .patch(`/api/users/${victim.id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({
        name: 'Updated By Owner',
        working_hours: workingHours,
        availability: false,
      })
      .expect(200);

    expect(ownerResponse.body).toMatchObject({
      id: victim.id,
      name: 'Updated By Owner',
      agent_profile: {
        user_id: victim.id,
        availability: false,
      },
    });

    await request(ctx.app.getHttpServer())
      .patch(`/api/users/${victim.id}`)
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ name: 'Updated By Manager' })
      .expect(403);

    const userRows = await ctx.adminDataSource.query(
      'SELECT name FROM users WHERE id = $1',
      [victim.id],
    );
    expect(userRows[0].name).toBe('Updated By Owner');

    const profileRows = await ctx.adminDataSource.query(
      'SELECT availability, working_hours FROM agent_profiles WHERE user_id = $1',
      [victim.id],
    );
    expect(profileRows).toHaveLength(1);
    expect(profileRows[0].availability).toBe(false);
    expect(profileRows[0].working_hours).toEqual(workingHours);
  });

  it('allows an owner to deactivate a user and blocks a manager from deactivating users', async () => {
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

    const victim = await createAuthenticatedUser(ctx, {
      tenantId: ctx.tenantAId,
      role: 'agent',
      name: 'Owner Delete Victim',
      emailPrefix: 'rbac-owner-delete-victim',
    });
    createdUsers.push(victim);

    await request(ctx.app.getHttpServer())
      .delete(`/api/users/${victim.id}`)
      .set('Authorization', `Bearer ${manager.token}`)
      .expect(403);

    const response = await request(ctx.app.getHttpServer())
      .delete(`/api/users/${victim.id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(200);

    expect(response.body).toMatchObject({
      message: `User ${victim.id} disabled successfully`,
      user: {
        id: victim.id,
        account_status: 'disabled',
        must_change_password: false,
      },
      lead_unassignment: {
        status: 'blocked',
      },
    });

    const rows = await ctx.adminDataSource.query(
      'SELECT id, account_status, disabled_at FROM users WHERE id = $1',
      [victim.id],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].account_status).toBe('disabled');
    expect(rows[0].disabled_at).not.toBeNull();

    await request(ctx.app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: victim.email,
        password: victim.password,
      })
      .expect((res) => {
        expect([401, 403]).toContain(res.status);
      });
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
