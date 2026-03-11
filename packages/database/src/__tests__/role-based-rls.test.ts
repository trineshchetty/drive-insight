import { randomUUID } from 'crypto';
import { Pool } from 'pg';

describe('Story 1.3: Role-Based RLS Policies', () => {
  let adminPool: Pool;
  let appPool: Pool;

  beforeAll(async () => {
    adminPool = new Pool({
      host: 'localhost',
      port: 54322,
      user: 'postgres',
      password: 'postgres',
      database: 'postgres',
    });

    appPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '54322'),
      user: process.env.DB_USER || 'app_user',
      password: process.env.DB_PASSWORD || 'app_user_dev',
      database: process.env.DB_NAME || 'postgres',
    });
  });

  afterAll(async () => {
    await appPool.end();
    await adminPool.end();
  });

  it('allows owner role to see all users in the current tenant only', async () => {
    const tenantAId = randomUUID();
    const tenantBId = randomUUID();
    const ownerId = randomUUID();
    const managerId = randomUUID();
    const agentId = randomUUID();
    const otherTenantUserId = randomUUID();
    const adminClient = await adminPool.connect();
    const appClient = await appPool.connect();

    try {
      await adminClient.query(
        `INSERT INTO tenants (id, name, branch, status)
         VALUES ($1, 'Role RLS Tenant A', 'HQ', 'active'),
                ($2, 'Role RLS Tenant B', 'Branch', 'active')`,
        [tenantAId, tenantBId],
      );

      await adminClient.query(
        `INSERT INTO users (id, tenant_id, email, role, name)
         VALUES
           ($1, $2, 'owner-tenant-a@example.com', 'owner', 'Owner A'),
           ($3, $2, 'manager-tenant-a@example.com', 'manager', 'Manager A'),
           ($4, $2, 'agent-tenant-a@example.com', 'agent', 'Agent A'),
           ($5, $6, 'owner-tenant-b@example.com', 'owner', 'Owner B')`,
        [ownerId, tenantAId, managerId, agentId, otherTenantUserId, tenantBId],
      );

      await appClient.query(`BEGIN`);
      await appClient.query(`SELECT set_config('app.current_user_role', $1, true)`, ['owner']);
      await appClient.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [tenantAId]);
      await appClient.query(`SELECT set_config('app.current_user_id', $1, true)`, [ownerId]);

      const result = await appClient.query(
        `SELECT email, tenant_id FROM users ORDER BY email ASC`,
      );

      expect(result.rows).toHaveLength(3);
      expect(result.rows.every((row) => row.tenant_id === tenantAId)).toBe(true);
      expect(result.rows.map((row) => row.email)).toEqual([
        'agent-tenant-a@example.com',
        'manager-tenant-a@example.com',
        'owner-tenant-a@example.com',
      ]);
    } finally {
      await appClient.query('ROLLBACK').catch(() => undefined);
      adminClient.release();
      appClient.release();
      await cleanupTenantData(adminPool, [tenantAId, tenantBId]);
    }
  });

  it('allows agent role to see only its own user row', async () => {
    const tenantId = randomUUID();
    const ownerId = randomUUID();
    const agentId = randomUUID();
    const secondAgentId = randomUUID();
    const adminClient = await adminPool.connect();
    const appClient = await appPool.connect();

    try {
      await adminClient.query(
        `INSERT INTO tenants (id, name, branch, status)
         VALUES ($1, 'Role RLS Tenant', 'HQ', 'active')`,
        [tenantId],
      );

      await adminClient.query(
        `INSERT INTO users (id, tenant_id, email, role, name)
         VALUES
           ($1, $4, 'owner@example.com', 'owner', 'Owner'),
           ($2, $4, 'agent-one@example.com', 'agent', 'Agent One'),
           ($3, $4, 'agent-two@example.com', 'agent', 'Agent Two')`,
        [ownerId, agentId, secondAgentId, tenantId],
      );

      await appClient.query(`BEGIN`);
      await appClient.query(`SELECT set_config('app.current_user_role', $1, true)`, ['agent']);
      await appClient.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [tenantId]);
      await appClient.query(`SELECT set_config('app.current_user_id', $1, true)`, [agentId]);

      const result = await appClient.query(
        `SELECT id, email FROM users ORDER BY email ASC`,
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toMatchObject({
        id: agentId,
        email: 'agent-one@example.com',
      });
    } finally {
      await appClient.query('ROLLBACK').catch(() => undefined);
      adminClient.release();
      appClient.release();
      await cleanupTenantData(adminPool, [tenantId]);
    }
  });

  it('allows agent role to see only its own agent profile', async () => {
    const tenantId = randomUUID();
    const agentOneId = randomUUID();
    const agentTwoId = randomUUID();
    const profileOneId = randomUUID();
    const profileTwoId = randomUUID();
    const adminClient = await adminPool.connect();
    const appClient = await appPool.connect();

    try {
      await adminClient.query(
        `INSERT INTO tenants (id, name, branch, status)
         VALUES ($1, 'Agent Profile Tenant', 'HQ', 'active')`,
        [tenantId],
      );

      await adminClient.query(
        `INSERT INTO users (id, tenant_id, email, role, name)
         VALUES
           ($1, $3, 'agent-one-profile@example.com', 'agent', 'Agent One'),
           ($2, $3, 'agent-two-profile@example.com', 'agent', 'Agent Two')`,
        [agentOneId, agentTwoId, tenantId],
      );

      await adminClient.query(
        `INSERT INTO agent_profiles (id, tenant_id, user_id, working_hours, availability)
         VALUES
           ($1, $3, $4, '{}'::jsonb, true),
           ($2, $3, $5, '{}'::jsonb, true)`,
        [profileOneId, profileTwoId, tenantId, agentOneId, agentTwoId],
      );

      await appClient.query(`BEGIN`);
      await appClient.query(`SELECT set_config('app.current_user_role', $1, true)`, ['agent']);
      await appClient.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [tenantId]);
      await appClient.query(`SELECT set_config('app.current_user_id', $1, true)`, [agentOneId]);

      const result = await appClient.query(
        `SELECT id, user_id FROM agent_profiles ORDER BY id ASC`,
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toMatchObject({
        id: profileOneId,
        user_id: agentOneId,
      });
    } finally {
      await appClient.query('ROLLBACK').catch(() => undefined);
      adminClient.release();
      appClient.release();
      await cleanupTenantData(adminPool, [tenantId]);
    }
  });

  it('allows owner role to insert a user when tenant context matches', async () => {
    const tenantId = randomUUID();
    const ownerId = randomUUID();
    const adminClient = await adminPool.connect();
    const appClient = await appPool.connect();

    try {
      await adminClient.query(
        `INSERT INTO tenants (id, name, branch, status)
         VALUES ($1, 'Owner Insert Tenant', 'HQ', 'active')`,
        [tenantId],
      );

      await adminClient.query(
        `INSERT INTO users (id, tenant_id, email, role, name)
         VALUES ($1, $2, 'owner-insert@example.com', 'owner', 'Owner Insert')`,
        [ownerId, tenantId],
      );

      await appClient.query(`BEGIN`);
      await appClient.query(`SELECT set_config('app.current_user_role', $1, true)`, ['owner']);
      await appClient.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [tenantId]);
      await appClient.query(`SELECT set_config('app.current_user_id', $1, true)`, [ownerId]);

      const inserted = await appClient.query(
        `INSERT INTO users (tenant_id, email, role, name)
         VALUES ($1, 'created-via-rls@example.com', 'agent', 'Created Via RLS')
         RETURNING tenant_id, email, role, name`,
        [tenantId],
      );

      expect(inserted.rows).toHaveLength(1);
      expect(inserted.rows[0]).toMatchObject({
        tenant_id: tenantId,
        email: 'created-via-rls@example.com',
        role: 'agent',
        name: 'Created Via RLS',
      });
    } finally {
      await appClient.query('ROLLBACK').catch(() => undefined);
      adminClient.release();
      appClient.release();
      await cleanupTenantData(adminPool, [tenantId]);
    }
  });
});

async function cleanupTenantData(pool: Pool, tenantIds: string[]) {
  await pool.query(
    'DELETE FROM agent_profiles WHERE tenant_id = ANY($1::uuid[])',
    [tenantIds],
  );
  await pool.query(
    'DELETE FROM users WHERE tenant_id = ANY($1::uuid[])',
    [tenantIds],
  );
  await pool.query(
    'DELETE FROM audit_log WHERE tenant_id = ANY($1::uuid[])',
    [tenantIds],
  );
  await pool.query(
    'DELETE FROM tenants WHERE id = ANY($1::uuid[])',
    [tenantIds],
  );
}
