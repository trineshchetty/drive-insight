/**
 * RLS (Row Level Security) Verification Script
 *
 * Purpose: Verify that PostgreSQL RLS policies are correctly enforcing tenant isolation
 *
 * This script tests:
 * 1. That BYPASSRLS is disabled for the current database user
 * 2. That RLS policies enforce tenant isolation when session variables are set
 * 3. That users from different tenants cannot see each other's data
 *
 * Usage:
 *   pnpm exec dotenv -e ../../.env -- node apps/api/test-rls.js
 *
 * Expected Result (when RLS is working):
 *   ✓ Tenant A owner sees only Tenant A users (1 user)
 *   ✓ Tenant B owner sees only Tenant B users (1 user)
 *
 * If you see users from the wrong tenant, RLS is not working!
 * See docs/RLS-BYPASSRLS-ISSUE.md for troubleshooting.
 *
 * Related:
 * - docs/RLS-BYPASSRLS-ISSUE.md - Complete analysis of RLS issues
 * - supabase/migrations/*_rls_policies.sql - RLS policy definitions
 * - src/common/interceptors/tenant-context.interceptor.ts - Sets session variables
 */

const { Client } = require('pg');

const TENANT_A_ID = '11111111-1111-1111-1111-111111111111';
const TENANT_B_ID = '22222222-2222-2222-2222-222222222222';

async function testRLS() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '54322'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'postgres',
  });

  await client.connect();
  console.log('Connected to database\n');

  try {
    // 0. Check if current user has BYPASSRLS enabled
    console.log('=== Step 0: Check database user RLS status ===');
    const rlsStatus = await client.query(`
      SELECT
        current_user as db_user,
        rolbypassrls
      FROM pg_roles
      WHERE rolname = current_user
    `);
    console.table(rlsStatus.rows);

    if (rlsStatus.rows[0].rolbypassrls) {
      console.log('\n❌ WARNING: Current user has BYPASSRLS enabled!');
      console.log('RLS policies will NOT be enforced.');
      console.log('See docs/RLS-BYPASSRLS-ISSUE.md for solutions.\n');
      console.log('Quick fix for development:');
      console.log(`  ALTER ROLE ${rlsStatus.rows[0].db_user} NOBYPASSRLS;\n`);
    } else {
      console.log('✓ Current user does NOT have BYPASSRLS\n');
    }
    // 1. Insert test tenants
    console.log('=== Step 1: Insert test tenants ===');
    await client.query(
      `INSERT INTO tenants (id, name, branch, status) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING`,
      [TENANT_B_ID, 'Dealership B', 'Downtown', 'active']
    );
    console.log('✓ Tenants created\n');

    // 2. Insert test users (without RLS context - simulating test setup)
    console.log('=== Step 2: Insert test users (simulating test setup) ===');
    const ownerAId = '00000000-0000-0000-0000-000000000001';
    const ownerBId = '00000000-0000-0000-0000-000000000002';

    await client.query(
      `INSERT INTO users (id, tenant_id, email, role, name) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
      [ownerAId, TENANT_A_ID, 'owner@dealershipa.com', 'owner', 'Owner A']
    );
    await client.query(
      `INSERT INTO users (id, tenant_id, email, role, name) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
      [ownerBId, TENANT_B_ID, 'owner@dealershipb.com', 'owner', 'Owner B']
    );
    console.log('✓ Users inserted (bypassing RLS - no transaction context)\n');

    // 3. Query without RLS context (should fail with FORCE RLS)
    console.log('=== Step 3: Query without RLS context ===');
    try {
      const result = await client.query('SELECT id, email, role, tenant_id FROM users');
      console.log('Result:', result.rows);
      console.log('Rows returned:', result.rows.length);
    } catch (err) {
      console.log('Error (expected):', err.message);
    }
    console.log();

    // 4. Start transaction and set RLS context for Tenant A owner
    console.log('=== Step 4: Simulate TenantContextInterceptor for Tenant A owner ===');
    await client.query('BEGIN');
    await client.query(`SET LOCAL app.current_user_id = '${ownerAId}'`);
    await client.query(`SET LOCAL app.current_tenant_id = '${TENANT_A_ID}'`);
    await client.query(`SET LOCAL app.current_user_role = 'owner'`);

    // Verify session variables
    const sessionVars = await client.query(`
      SELECT
        current_setting('app.current_user_id', true) as user_id,
        current_setting('app.current_tenant_id', true) as tenant_id,
        current_setting('app.current_user_role', true) as role
    `);
    console.log('Session variables set:');
    console.table(sessionVars.rows);

    // Query users (should only see Tenant A users)
    const tenantAUsers = await client.query('SELECT id, email, role, tenant_id FROM users ORDER BY created_at');
    console.log('\nUsers visible to Tenant A owner:');
    console.table(tenantAUsers.rows);
    console.log('Expected: 1 user (Owner A from Tenant A)');
    console.log('Actual:', tenantAUsers.rows.length, 'users');

    // Check tenant_ids
    const wrongTenant = tenantAUsers.rows.filter(u => u.tenant_id !== TENANT_A_ID);
    if (wrongTenant.length > 0) {
      console.log('\n❌ PROBLEM: Found users from wrong tenant!');
      console.table(wrongTenant);
    } else {
      console.log('\n✓ All users belong to Tenant A');
    }

    await client.query('COMMIT');
    console.log();

    // 5. Test with Tenant B owner
    console.log('=== Step 5: Simulate TenantContextInterceptor for Tenant B owner ===');
    await client.query('BEGIN');
    await client.query(`SET LOCAL app.current_user_id = '${ownerBId}'`);
    await client.query(`SET LOCAL app.current_tenant_id = '${TENANT_B_ID}'`);
    await client.query(`SET LOCAL app.current_user_role = 'owner'`);

    const tenantBUsers = await client.query('SELECT id, email, role, tenant_id FROM users ORDER BY created_at');
    console.log('Users visible to Tenant B owner:');
    console.table(tenantBUsers.rows);
    console.log('Expected: 1 user (Owner B from Tenant B)');
    console.log('Actual:', tenantBUsers.rows.length, 'users');

    const wrongTenantB = tenantBUsers.rows.filter(u => u.tenant_id !== TENANT_B_ID);
    if (wrongTenantB.length > 0) {
      console.log('\n❌ PROBLEM: Found users from wrong tenant!');
      console.table(wrongTenantB);
    } else {
      console.log('\n✓ All users belong to Tenant B');
    }

    await client.query('COMMIT');

    // Cleanup
    console.log('\n=== Cleanup ===');
    await client.query('DELETE FROM users WHERE id IN ($1, $2)', [ownerAId, ownerBId]);
    await client.query('DELETE FROM tenants WHERE id = $1', [TENANT_B_ID]);
    console.log('✓ Cleanup complete');

  } catch (err) {
    console.error('Error:', err);
    await client.query('ROLLBACK');
  } finally {
    await client.end();
  }
}

testRLS();
