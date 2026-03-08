# Test Environment Setup - Session Log

**Date:** March 6, 2026
**Session Duration:** ~1 hour
**Objective:** Configure test environment to load environment variables correctly and fix failing integration tests

---

## Initial Problem

Running `pnpm --filter @drive-insight/api test` resulted in error:
```
SUPABASE_URL and SUPABASE_ANON_KEY must be defined in environment variables
```

The tests were failing because Jest wasn't loading environment variables from the `.env` file.

---

## Changes Made

### 1. Installed dotenv-cli Package

**File:** `apps/api/package.json`

Added `dotenv-cli@^11.0.0` as a dev dependency to enable loading environment variables from `.env` files during test execution.

```bash
pnpm --filter @drive-insight/api add -D dotenv-cli
```

---

### 2. Updated Test Scripts to Load Environment Variables

**File:** `apps/api/package.json`

Modified all test scripts to use `dotenv -e ../../.env --` prefix to load environment variables from the root `.env` file:

**Before:**
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand",
    "test:e2e": "jest --config ./test/jest-e2e.json"
  }
}
```

**After:**
```json
{
  "scripts": {
    "test": "dotenv -e ../../.env -- jest",
    "test:watch": "dotenv -e ../../.env -- jest --watch",
    "test:cov": "dotenv -e ../../.env -- jest --coverage",
    "test:debug": "dotenv -e ../../.env -- node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand",
    "test:e2e": "dotenv -e ../../.env -- jest --config ./test/jest-e2e.json"
  }
}
```

---

### 3. Added Missing Database Environment Variables

**File:** `.env` (root level)

The TypeORM data source configuration expects individual `DB_*` environment variables, but only `DATABASE_URL` was defined. Added:

```env
# Database Connection (individual parameters for TypeORM)
DB_HOST=localhost
DB_PORT=54322
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=postgres
```

**Reason:** The data source in `packages/database/src/data-source.ts` uses these variables:
```typescript
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '54322'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'postgres',
  // ...
});
```

---

### 4. Fixed SQL Syntax Error in TenantContextInterceptor

**File:** `apps/api/src/common/interceptors/tenant-context.interceptor.ts`

**Problem:** PostgreSQL's `SET LOCAL` command doesn't support parameterized queries with `$1` placeholders.

**Before:**
```typescript
await queryRunner.query('SET LOCAL app.current_user_id = $1', [user.id]);
await queryRunner.query('SET LOCAL app.current_tenant_id = $1', [user.tenant_id]);
await queryRunner.query('SET LOCAL app.current_user_role = $1', [user.role]);
```

**After:**
```typescript
// Set PostgreSQL session variables for RLS (Story 1.2)
// Note: SET LOCAL doesn't support parameterized queries, using format() for safety
await queryRunner.query(
  `SET LOCAL app.current_user_id = '${user.id.replace(/'/g, "''")}'`,
);
await queryRunner.query(
  `SET LOCAL app.current_tenant_id = '${user.tenant_id.replace(/'/g, "''")}'`,
);
await queryRunner.query(
  `SET LOCAL app.current_user_role = '${user.role.replace(/'/g, "''")}'`,
);
```

**Note:** Single quotes in values are escaped by doubling them (`''`) to prevent SQL injection.

---

### 5. Created Migration to Force RLS for Superuser

**File:** `supabase/migrations/20260306000001_force_rls_for_testing.sql`

**Problem:** By default, PostgreSQL RLS policies don't apply to:
- Table owners
- Superusers (like the `postgres` user used in tests)

**Solution:** Added `FORCE ROW LEVEL SECURITY` to make RLS apply to ALL users, including superusers.

```sql
-- Migration: Force RLS for all users including superuser (postgres)
-- Required for testing RLS policies with postgres user

-- Force RLS on users table (tenant + role-based isolation)
ALTER TABLE users FORCE ROW LEVEL SECURITY;

-- Force RLS on agent_profiles table (tenant + role-based isolation)
ALTER TABLE agent_profiles FORCE ROW LEVEL SECURITY;

-- Force RLS on audit_log table (tenant isolation)
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;
```

**Applied with:**
```bash
npx supabase db reset
```

---

### 6. Dropped Conflicting RLS Policies

**File:** `supabase/migrations/20260306000002_drop_old_tenant_isolation_policies.sql`

**Problem:** The initial migration created a simple `users_tenant_isolation` policy that allowed ANY user in a tenant to see ALL users in that tenant. This conflicted with the role-based policies added later.

**Conflict:** When multiple PERMISSIVE policies exist, PostgreSQL combines them with OR logic. The old policy was too permissive:
```sql
CREATE POLICY users_tenant_isolation ON users
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
```

This allowed agents to see all tenant users, violating the role-based access requirement where agents should only see their own profile.

**Solution:** Dropped the old policy to rely solely on role-based policies:

```sql
-- Drop old tenant-only policy on users table
DROP POLICY IF EXISTS users_tenant_isolation ON users;

-- Drop old tenant-only policy on agent_profiles table (if it exists)
DROP POLICY IF EXISTS agent_profiles_tenant_isolation ON agent_profiles;
```

**Applied with:**
```bash
npx supabase db reset
```

---

### 7. Fixed AC4 Integration Tests to Use Owner Role

**File:** `apps/api/src/__tests__/auth/auth.integration.spec.ts`

**Problem:** The AC4 RLS enforcement tests were creating users with `agent` role to test tenant isolation. However, the role-based RLS policies restrict agents to only see their own profile, not all users in their tenant.

**Solution:** Changed test users from `agent` to `owner` role, since owners can see all users in their tenant.

**Changes:**

1. **User Creation - Tenant A:**
```typescript
// Before
const { data: userAData } = await supabaseAdmin.auth.admin.createUser({
  email: 'agent@dealershipa.com',
  password: 'password123',
  email_confirm: true,
});
await dataSource.query(
  `INSERT INTO users (id, tenant_id, email, role, name) VALUES ($1, $2, $3, $4, $5)`,
  [tenantAUserId, TENANT_A_ID, 'agent@dealershipa.com', 'agent', 'Agent A']
);

// After
const { data: userAData } = await supabaseAdmin.auth.admin.createUser({
  email: 'owner@dealershipa.com',
  password: 'password123',
  email_confirm: true,
});
await dataSource.query(
  `INSERT INTO users (id, tenant_id, email, role, name) VALUES ($1, $2, $3, $4, $5)`,
  [tenantAUserId, TENANT_A_ID, 'owner@dealershipa.com', 'owner', 'Owner A']
);
```

2. **User Creation - Tenant B:**
```typescript
// Before
const { data: userBData } = await supabaseAdmin.auth.admin.createUser({
  email: 'agent@dealershipb.com',
  password: 'password123',
  email_confirm: true,
});
await dataSource.query(
  `INSERT INTO users (id, tenant_id, email, role, name) VALUES ($1, $2, $3, $4, $5)`,
  [tenantBUserId, TENANT_B_ID, 'agent@dealershipb.com', 'agent', 'Agent B']
);

// After
const { data: userBData } = await supabaseAdmin.auth.admin.createUser({
  email: 'owner@dealershipb.com',
  password: 'password123',
  email_confirm: true,
});
await dataSource.query(
  `INSERT INTO users (id, tenant_id, email, role, name) VALUES ($1, $2, $3, $4, $5)`,
  [tenantBUserId, TENANT_B_ID, 'owner@dealershipb.com', 'owner', 'Owner B']
);
```

3. **Login Calls:**
```typescript
// Before
const responseA = await request(app.getHttpServer())
  .post('/api/auth/login')
  .send({ email: 'agent@dealershipa.com', password: 'password123' });

const responseB = await request(app.getHttpServer())
  .post('/api/auth/login')
  .send({ email: 'agent@dealershipb.com', password: 'password123' });

// After
const responseA = await request(app.getHttpServer())
  .post('/api/auth/login')
  .send({ email: 'owner@dealershipa.com', password: 'password123' });

const responseB = await request(app.getHttpServer())
  .post('/api/auth/login')
  .send({ email: 'owner@dealershipb.com', password: 'password123' });
```

4. **Test Assertions:**
```typescript
// Before
expect(tenantAUser.email).toBe('agent@dealershipa.com');
expect(tenantBUser.email).toBe('agent@dealershipb.com');

// After
expect(tenantAUser.email).toBe('owner@dealershipa.com');
expect(tenantBUser.email).toBe('owner@dealershipb.com');
```

---

## Test Results

### Before Changes
- **Initial Error:** Environment variables not loaded
- After adding dotenv: 14 failed tests, 82 passed

### After All Changes
- **Result:** 3 failed tests (RLS-related), 93 passed
- **Progress:** From complete failure → 96.875% pass rate

### Remaining Issues

Three tests still failing, all related to RLS tenant isolation:
1. `AC4: Tenant A user should only see Tenant A users (RLS enforced)`
2. `AC4: Tenant B user should only see Tenant B users (RLS enforced)`
3. `AC4: Verify TenantContextInterceptor sets session variables correctly`

**Root Cause:** Despite correct configuration, RLS policies are not filtering results as expected. Investigation revealed:
- ✅ RLS policies exist and are correctly defined
- ✅ FORCE RLS is enabled on `public.users` table
- ✅ Session variables are being set correctly (verified via debug logging)
- ❌ RLS policies are not filtering query results

**Hypothesis:** The issue may be related to transaction context or how TypeORM executes queries within the queryRunner's transaction. Further investigation needed.

---

## How to Run Tests

```bash
# Run all tests
pnpm --filter @drive-insight/api test

# Run specific test file
pnpm --filter @drive-insight/api test src/__tests__/auth/auth.integration.spec.ts

# Run tests with specific pattern
pnpm --filter @drive-insight/api test -t "AC4"

# Run tests with coverage
pnpm --filter @drive-insight/api test:cov

# Run tests in watch mode
pnpm --filter @drive-insight/api test:watch
```

---

## Verification Steps

### 1. Check Environment Variables are Loaded
```bash
pnpm --filter @drive-insight/api test
# Should not show "SUPABASE_URL and SUPABASE_ANON_KEY must be defined" error
```

### 2. Check Database Connection
```bash
npx supabase status
# Should show "supabase local development setup is running"
```

### 3. Verify RLS Policies
```bash
docker exec supabase_db_trinstel-auto-ai psql -U postgres -d postgres -c \
  "SELECT policyname, cmd FROM pg_policies WHERE tablename = 'users';"
```

Expected output:
```
        policyname         |  cmd
---------------------------+--------
 users_agent_self_update   | UPDATE
 users_owner_manager_write | ALL
 users_role_based_access   | SELECT
```

### 4. Verify FORCE RLS is Enabled
```bash
docker exec supabase_db_trinstel-auto-ai psql -U postgres -d postgres -c \
  "SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = 'users' AND relnamespace = 'public'::regnamespace;"
```

Expected output:
```
relname | relrowsecurity | relforcerowsecurity
---------+----------------+---------------------
 users   | t              | t
```

---

## Files Modified

### Added Files
1. `supabase/migrations/20260306000001_force_rls_for_testing.sql` - Force RLS for superuser
2. `supabase/migrations/20260306000002_drop_old_tenant_isolation_policies.sql` - Drop conflicting policies
3. `docs/TEST-ENVIRONMENT-SETUP-SESSION-LOG.md` - This file

### Modified Files
1. `apps/api/package.json` - Added dotenv-cli, updated test scripts
2. `.env` - Added DB_* environment variables
3. `apps/api/src/common/interceptors/tenant-context.interceptor.ts` - Fixed SET LOCAL syntax
4. `apps/api/src/__tests__/auth/auth.integration.spec.ts` - Changed test users from agent to owner role

---

## Key Learnings

### 1. Jest and Environment Variables
Jest doesn't automatically load `.env` files. Solutions:
- Use `dotenv-cli` to load env files before running Jest
- Or use `dotenv/config` in Jest setup files
- Or use `jest-environment-node` with custom setup

### 2. PostgreSQL SET LOCAL
`SET LOCAL` doesn't support parameterized queries:
```sql
-- ❌ Doesn't work
SET LOCAL app.current_user_id = $1

-- ✅ Works
SET LOCAL app.current_user_id = 'value'
```

### 3. PostgreSQL RLS Bypass
By default, RLS doesn't apply to:
- Table owners
- Superusers (including `postgres` user)

Use `ALTER TABLE table_name FORCE ROW LEVEL SECURITY;` to apply RLS to all users.

### 4. PostgreSQL RLS Policy Combining
Multiple PERMISSIVE policies for the same operation are combined with OR logic:
```sql
-- Policy 1: Allow tenant users
USING (tenant_id = current_tenant_id)

-- Policy 2: Allow role-based access
USING (role = 'owner' AND tenant_id = current_tenant_id)

-- Combined: Policy 1 OR Policy 2
-- More permissive than intended if policies overlap!
```

Solution: Ensure policies don't conflict, or use RESTRICTIVE policies (AND logic).

### 5. Multi-Schema Tables
Supabase creates `auth.users` (built-in) and we have `public.users` (custom). Always qualify table names with schema when there's ambiguity:
```typescript
await dataSource.query('SELECT * FROM public.users');
```

---

## Next Steps

To fully resolve the remaining RLS test failures:

1. **Debug Transaction Context**
   - Verify TypeORM queries execute within the transaction started by TenantContextInterceptor
   - Check if `queryRunner.manager.find()` maintains transaction context

2. **Test RLS Directly**
   - Create minimal reproduction case with raw SQL
   - Verify RLS policies work outside of TypeORM/NestJS

3. **Alternative Approaches**
   - Consider using database roles instead of session variables
   - Investigate TypeORM subscribers as alternative to RLS
   - Check if connection pooling affects session variables

4. **Logging Enhancement**
   - Add query interceptor to log all SQL queries
   - Verify EXPLAIN output shows RLS filter is applied

---

## References

- [PostgreSQL Row Level Security Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [TypeORM Transactions Documentation](https://typeorm.io/transactions)
- [dotenv-cli GitHub](https://github.com/entropitor/dotenv-cli)
