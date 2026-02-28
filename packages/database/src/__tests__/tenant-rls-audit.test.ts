/**
 * Integration Tests for Story 1.1: Tenant Database Schema & RLS Policies
 *
 * Tests cover:
 * - AC1: Tables exist with tenant_id and RLS enabled
 * - AC2: RLS policies enforce tenant isolation
 * - AC3: Audit logging on mutations
 * - AC4: TypeORM entities map correctly
 */

import { Pool } from 'pg';
import { AppDataSource } from '../data-source';

describe('Story 1.1: Tenant Database Schema & RLS Policies', () => {
  let pool: Pool;

  beforeAll(async () => {
    // Connect to Supabase local database
    pool = new Pool({
      host: 'localhost',
      port: 54322,
      user: 'postgres',
      password: 'postgres',
      database: 'postgres',
    });

    // Initialize TypeORM DataSource
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
  });

  afterAll(async () => {
    await pool.end();
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  describe('AC1: Schema Validation', () => {
    it('should have tenants table with correct columns', async () => {
      const result = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'tenants'
        ORDER BY ordinal_position
      `);

      const columns = result.rows.map(r => r.column_name);
      expect(columns).toContain('id');
      expect(columns).toContain('name');
      expect(columns).toContain('branch');
      expect(columns).toContain('status');
      expect(columns).toContain('created_at');
      expect(columns).toContain('updated_at');
    });

    it('should have users table with tenant_id and RLS enabled', async () => {
      const result = await pool.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'tenant_id'
      `);
      expect(result.rows.length).toBe(1);

      const rlsResult = await pool.query(`
        SELECT relrowsecurity FROM pg_class
        WHERE relname = 'users'
      `);
      expect(rlsResult.rows[0].relrowsecurity).toBe(true);
    });

    it('should have agent_profiles table with tenant_id and user_id foreign keys', async () => {
      const result = await pool.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'agent_profiles' AND column_name IN ('tenant_id', 'user_id')
      `);
      expect(result.rows.length).toBe(2);
    });

    it('should have audit_log table with required columns', async () => {
      const result = await pool.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'audit_log'
        AND column_name IN ('actor_user_id', 'action', 'entity_type', 'entity_id', 'before', 'after')
      `);
      expect(result.rows.length).toBe(6);
    });

    it('should have all required indexes', async () => {
      const result = await pool.query(`
        SELECT indexname FROM pg_indexes
        WHERE tablename IN ('tenants', 'users', 'agent_profiles', 'audit_log')
      `);

      const indexes = result.rows.map(r => r.indexname);
      expect(indexes).toContain('idx_users_tenant');
      expect(indexes).toContain('idx_agent_profiles_tenant');
      expect(indexes).toContain('idx_audit_log_tenant');
    });
  });

  describe('AC2: RLS Policy Tests', () => {
    let tenantA: string;
    let tenantB: string;

    beforeEach(async () => {
      // Create two test tenants
      const tenantAResult = await pool.query(`
        INSERT INTO tenants (name, branch) VALUES ('Tenant A', 'Branch A') RETURNING id
      `);
      tenantA = tenantAResult.rows[0].id;

      const tenantBResult = await pool.query(`
        INSERT INTO tenants (name, branch) VALUES ('Tenant B', 'Branch B') RETURNING id
      `);
      tenantB = tenantBResult.rows[0].id;

      // Insert users for both tenants
      await pool.query(`
        INSERT INTO users (tenant_id, email, role, name)
        VALUES
          ($1, 'user-a@tenant-a.com', 'owner', 'User A'),
          ($2, 'user-b@tenant-b.com', 'owner', 'User B')
      `, [tenantA, tenantB]);
    });

    afterEach(async () => {
      // Clean up test data
      await pool.query('DELETE FROM users WHERE tenant_id IN ($1, $2)', [tenantA, tenantB]);
      await pool.query('DELETE FROM tenants WHERE id IN ($1, $2)', [tenantA, tenantB]);
    });

    it('should only return tenant A data when app.current_tenant_id is set to tenant A', async () => {
      // Use a single client connection to maintain session variables
      const client = await pool.connect();
      try {
        // Set session variable for tenant A
        await client.query(`SELECT set_config('app.current_tenant_id', $1, false)`, [tenantA]);

        const result = await client.query('SELECT * FROM users');

        expect(result.rows.length).toBe(1);
        expect(result.rows[0].tenant_id).toBe(tenantA);
        expect(result.rows[0].email).toBe('user-a@tenant-a.com');
      } finally {
        client.release();
      }
    });

    it('should return zero rows when querying tenant B data with tenant A session', async () => {
      // Use a single client connection to maintain session variables
      const client = await pool.connect();
      try {
        // Set session variable for tenant A
        await client.query(`SELECT set_config('app.current_tenant_id', $1, false)`, [tenantA]);

        // Try to query tenant B data explicitly
        const result = await client.query('SELECT * FROM users WHERE tenant_id = $1', [tenantB]);

        expect(result.rows.length).toBe(0);
      } finally {
        client.release();
      }
    });

    it('should prevent UPDATE on tenant B data when session is tenant A', async () => {
      // Use a single client connection to maintain session variables
      const client = await pool.connect();
      try {
        await client.query(`SELECT set_config('app.current_tenant_id', $1, false)`, [tenantA]);

        // Try to update tenant B user
        const result = await client.query(`
          UPDATE users SET name = 'Hacked' WHERE tenant_id = $1 RETURNING *
        `, [tenantB]);

        expect(result.rows.length).toBe(0);

        // Reset session and verify tenant B data unchanged
        await client.query(`SELECT set_config('app.current_tenant_id', $1, false)`, [tenantB]);
        const check = await client.query('SELECT name FROM users WHERE tenant_id = $1', [tenantB]);
        expect(check.rows[0].name).toBe('User B');
      } finally {
        client.release();
      }
    });
  });

  describe('AC3: Audit Logging Tests', () => {
    let tenantId: string;
    let userId: string;

    beforeEach(async () => {
      const tenantResult = await pool.query(`
        INSERT INTO tenants (name) VALUES ('Audit Test Tenant') RETURNING id
      `);
      tenantId = tenantResult.rows[0].id;
    });

    afterEach(async () => {
      await pool.query('DELETE FROM audit_log WHERE tenant_id = $1', [tenantId]);
      await pool.query('DELETE FROM users WHERE tenant_id = $1', [tenantId]);
      await pool.query('DELETE FROM tenants WHERE id = $1', [tenantId]);
    });

    it('should create audit_log entry on INSERT with action=INSERT and after state', async () => {
      const userResult = await pool.query(`
        INSERT INTO users (tenant_id, email, role, name)
        VALUES ($1, 'test@test.com', 'owner', 'Test User')
        RETURNING id
      `, [tenantId]);
      userId = userResult.rows[0].id;

      const auditResult = await pool.query(`
        SELECT * FROM audit_log
        WHERE entity_type = 'users' AND entity_id = $1 AND action = 'INSERT'
      `, [userId]);

      expect(auditResult.rows.length).toBe(1);
      expect(auditResult.rows[0].action).toBe('INSERT');
      expect(auditResult.rows[0].before).toBeNull();
      expect(auditResult.rows[0].after).toBeTruthy();
      expect(auditResult.rows[0].after.email).toBe('test@test.com');
    });

    it('should create audit_log entry on UPDATE with before and after state', async () => {
      const userResult = await pool.query(`
        INSERT INTO users (tenant_id, email, role, name)
        VALUES ($1, 'update-test@test.com', 'owner', 'Original Name')
        RETURNING id
      `, [tenantId]);
      userId = userResult.rows[0].id;

      // Update the user
      await pool.query(`
        UPDATE users SET name = 'Updated Name' WHERE id = $1
      `, [userId]);

      const auditResult = await pool.query(`
        SELECT * FROM audit_log
        WHERE entity_type = 'users' AND entity_id = $1 AND action = 'UPDATE'
        ORDER BY created_at DESC
        LIMIT 1
      `, [userId]);

      expect(auditResult.rows.length).toBe(1);
      expect(auditResult.rows[0].action).toBe('UPDATE');
      expect(auditResult.rows[0].before.name).toBe('Original Name');
      expect(auditResult.rows[0].after.name).toBe('Updated Name');
    });

    it('should create audit_log entry on DELETE with before state', async () => {
      const userResult = await pool.query(`
        INSERT INTO users (tenant_id, email, role, name)
        VALUES ($1, 'delete-test@test.com', 'owner', 'Delete Me')
        RETURNING id
      `, [tenantId]);
      userId = userResult.rows[0].id;

      // Delete the user
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);

      const auditResult = await pool.query(`
        SELECT * FROM audit_log
        WHERE entity_type = 'users' AND entity_id = $1 AND action = 'DELETE'
      `, [userId]);

      expect(auditResult.rows.length).toBe(1);
      expect(auditResult.rows[0].action).toBe('DELETE');
      expect(auditResult.rows[0].before.email).toBe('delete-test@test.com');
      expect(auditResult.rows[0].after).toBeNull();
    });
  });

  describe('AC4: TypeORM Entity Tests', () => {
    it('should initialize AppDataSource successfully', () => {
      expect(AppDataSource.isInitialized).toBe(true);
    });

    it('should have all entities registered', () => {
      const entities = AppDataSource.entityMetadatas.map(meta => meta.tableName);
      expect(entities).toContain('tenants');
      expect(entities).toContain('users');
      expect(entities).toContain('agent_profiles');
      expect(entities).toContain('audit_log');
    });

    it('should query tenants using TypeORM repository', async () => {
      const tenantRepo = AppDataSource.getRepository('Tenant');

      const tenant = tenantRepo.create({
        name: 'TypeORM Test Tenant',
        branch: 'Test Branch',
      });

      const saved = await tenantRepo.save(tenant);
      expect(saved.id).toBeTruthy();
      expect(saved.name).toBe('TypeORM Test Tenant');

      await tenantRepo.delete(saved.id);
    });
  });
});
