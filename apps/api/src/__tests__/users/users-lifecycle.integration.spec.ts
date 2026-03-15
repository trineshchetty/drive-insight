import * as request from 'supertest';
import {
  RbacTestContext,
  createAuthenticatedUser,
  createRbacTestContext,
  deleteSupabaseUsers,
} from '../rbac/rbac-test.utils';

describe('Users Lifecycle Integration', () => {
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

  it('reissues an existing invite deterministically and keeps a single local/auth user', async () => {
    const owner = await createAuthenticatedUser(ctx, {
      tenantId: ctx.tenantAId,
      role: 'owner',
      name: 'Owner Reinvite',
      emailPrefix: 'rbac-owner-reinvite',
    });
    createdUsers.push(owner);

    const reinviteEmail = `reinvite-${Date.now()}@example.com`;

    const firstResponse = await request(ctx.app.getHttpServer())
      .post('/api/users/invite')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({
        email: reinviteEmail,
        name: 'First Invite',
        role: 'agent',
      })
      .expect(201);

    createdUsers.push({ id: firstResponse.body.user.id });

    const secondResponse = await request(ctx.app.getHttpServer())
      .post('/api/users/invite')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({
        email: reinviteEmail,
        name: 'Reissued Invite',
        role: 'agent',
      })
      .expect(201);

    expect(secondResponse.body).toMatchObject({
      invite_status: 'resent',
      user: {
        id: firstResponse.body.user.id,
        email: reinviteEmail,
        name: 'Reissued Invite',
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
    ).toHaveLength(2);

    const localRows = await ctx.adminDataSource.query(
      'SELECT id, name, account_status FROM users WHERE tenant_id = $1 AND email = $2',
      [ctx.tenantAId, reinviteEmail],
    );

    expect(localRows).toHaveLength(1);
    expect(localRows[0]).toMatchObject({
      id: firstResponse.body.user.id,
      name: 'Reissued Invite',
      account_status: 'invited',
    });

    const { data } = await ctx.supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    const authMatches = data.users.filter((user) => user.email === reinviteEmail);
    expect(authMatches).toHaveLength(1);
    expect(authMatches[0].id).toBe(firstResponse.body.user.id);
  });

  it('returns 404 when an owner attempts to update or deactivate a user in another tenant', async () => {
    const ownerA = await createAuthenticatedUser(ctx, {
      tenantId: ctx.tenantAId,
      role: 'owner',
      name: 'Owner A',
      emailPrefix: 'rbac-cross-tenant-owner-a',
    });
    createdUsers.push(ownerA);

    const victimB = await createAuthenticatedUser(ctx, {
      tenantId: ctx.tenantBId,
      role: 'agent',
      name: 'Victim B',
      emailPrefix: 'rbac-cross-tenant-victim-b',
    });
    createdUsers.push(victimB);

    await request(ctx.app.getHttpServer())
      .patch(`/api/users/${victimB.id}`)
      .set('Authorization', `Bearer ${ownerA.token}`)
      .send({ name: 'Should Not Update' })
      .expect(404);

    await request(ctx.app.getHttpServer())
      .delete(`/api/users/${victimB.id}`)
      .set('Authorization', `Bearer ${ownerA.token}`)
      .expect(404);
  });

  it('blocks owner self-deactivation to prevent tenant lockout', async () => {
    const owner = await createAuthenticatedUser(ctx, {
      tenantId: ctx.tenantAId,
      role: 'owner',
      name: 'Self Disable Owner',
      emailPrefix: 'rbac-self-disable-owner',
    });
    createdUsers.push(owner);

    await request(ctx.app.getHttpServer())
      .delete(`/api/users/${owner.id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(400);
  });
});
