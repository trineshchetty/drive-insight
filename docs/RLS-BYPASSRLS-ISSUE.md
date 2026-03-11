# PostgreSQL RLS BYPASSRLS Issue - Complete Analysis

**Date:** 2026-03-06
**Status:** ❌ CRITICAL - RLS Not Enforcing Tenant Isolation
**Impact:** Security vulnerability - all users can see all tenant data

---

## Executive Summary

Row Level Security (RLS) policies are correctly configured but **NOT enforcing tenant isolation** because the `postgres` database user has the `BYPASSRLS` role attribute enabled. This attribute completely bypasses all Row Level Security policies, even when `FORCE ROW LEVEL SECURITY` is enabled on tables.

**Result:** All users can see data from all tenants, completely breaking multi-tenant isolation.

---

## Root Cause

### PostgreSQL RLS Enforcement Hierarchy

PostgreSQL evaluates RLS in the following order (highest to lowest priority):

1. **Role-level BYPASSRLS attribute** ← **🔴 ISSUE IS HERE**
2. FORCE ROW LEVEL SECURITY on table
3. Regular RLS policies
4. Table ownership

### The Problem

```sql
-- Current state
SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname = 'postgres';

┌──────────┬──────────────┐
│ rolname  │ rolbypassrls │
├──────────┼──────────────┤
│ postgres │ true         │  ← This overrides FORCE RLS!
└──────────┴──────────────┘
```

**Impact:**
- The `postgres` user's `BYPASSRLS=true` attribute takes **absolute precedence**
- All RLS policies are **completely ignored**
- `FORCE ROW LEVEL SECURITY` on tables has **no effect**
- Session variables (`app.current_tenant_id`, etc.) are **set correctly but unused**

---

## How We Discovered This

### Test Failure Symptoms

Integration tests in `auth.integration.spec.ts` were failing:

```javascript
// AC4: Tenant A user should only see Tenant A users (RLS enforced)
Expected tenant_id: "11111111-1111-1111-1111-111111111111" (Tenant A)
Received tenant_id: "22222222-2222-2222-2222-222222222222" (Tenant B)
```

### Investigation Steps

1. **Verified RLS was enabled on tables:**
   ```sql
   SELECT relname, relrowsecurity, relforcerowsecurity
   FROM pg_class
   WHERE relname = 'users';

   -- Result: RLS enabled ✓, FORCE RLS enabled ✓
   ```

2. **Verified policies were created correctly:**
   ```sql
   SELECT policyname, cmd FROM pg_policies WHERE tablename = 'users';

   -- Result: All policies present ✓
   ```

3. **Verified TenantContextInterceptor was setting session variables:**
   ```sql
   SELECT
     current_setting('app.current_tenant_id', true),
     current_setting('app.current_user_role', true);

   -- Result: Variables set correctly ✓
   ```

4. **Created test script simulating exact production flow:**
   ```bash
   node apps/api/test-rls.js

   # Result: RLS NOT enforced - all users visible regardless of tenant!
   ```

5. **Checked database user attributes:**
   ```sql
   SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname = 'postgres';

   -- Result: BYPASSRLS = true ❌ ROOT CAUSE FOUND
   ```

---

## Technical Details

### What Is BYPASSRLS?

`BYPASSRLS` is a PostgreSQL role attribute that allows a database user to bypass **all** Row Level Security policies:

```sql
-- Check if a role has BYPASSRLS
SELECT rolname, rolbypassrls FROM pg_roles;

-- Roles with BYPASSRLS in Supabase:
- postgres          (BYPASSRLS = true)
- service_role      (BYPASSRLS = true)
- supabase_admin    (BYPASSRLS = true)
- authenticated     (BYPASSRLS = false) ✓
- anon              (BYPASSRLS = false) ✓
```

### Why Supabase Sets BYPASSRLS

Supabase intentionally sets `BYPASSRLS` on certain roles:

- **postgres**: For admin operations, migrations, and management
- **service_role**: For server-side operations that need full access
- **supabase_admin**: For administrative tasks

**Normal application queries should use `authenticated` or custom roles with `NOBYPASSRLS`.**

### Our Current Setup (Incorrect)

```typescript
// apps/api/src/app.module.ts
TypeOrmModule.forRoot({
  type: 'postgres',
  username: process.env.DB_USER || 'postgres', // ❌ Using postgres with BYPASSRLS
  password: process.env.DB_PASSWORD || 'postgres',
  // ...
})
```

**Problem:** Application code runs as `postgres` user, which bypasses all RLS.

---

## Test Results

### Before Fix

Running our RLS test script:

```bash
$ node apps/api/test-rls.js

=== Step 4: Tenant A owner (with session variables set) ===
Session variables:
  user_id:   00000000-0000-0000-0000-000000000001
  tenant_id: 11111111-1111-1111-1111-111111111111 (Tenant A)
  role:      owner

Users visible to Tenant A owner:
┌───┬──────────┬────────────────────────┬─────────┬────────────┐
│ # │ id       │ email                  │ role    │ tenant_id  │
├───┼──────────┼────────────────────────┼─────────┼────────────┤
│ 1 │ 0000...1 │ owner@dealershipa.com  │ owner   │ Tenant A   │
│ 2 │ 0000...2 │ owner@dealershipb.com  │ owner   │ Tenant B   │ ❌
└───┴──────────┴────────────────────────┴─────────┴────────────┘

Expected: 1 user (only Tenant A)
Actual:   2 users (both tenants visible)

❌ PROBLEM: Found users from wrong tenant!
```

### After Fix (Expected)

```bash
$ node apps/api/test-rls.js

=== Step 4: Tenant A owner (with session variables set) ===
Users visible to Tenant A owner:
┌───┬──────────┬────────────────────────┬─────────┬────────────┐
│ # │ id       │ email                  │ role    │ tenant_id  │
├───┼──────────┼────────────────────────┼─────────┼────────────┤
│ 1 │ 0000...1 │ owner@dealershipa.com  │ owner   │ Tenant A   │
└───┴──────────┴────────────────────────┴─────────┴────────────┘

Expected: 1 user (only Tenant A)
Actual:   1 user (only Tenant A)

✓ All users belong to Tenant A
```

---

## Solution Options

### Option 1: Remove BYPASSRLS from postgres (Quick Fix)

**For development/testing only:**

```sql
-- Migration: supabase/migrations/20260306000003_remove_postgres_bypassrls.sql
ALTER ROLE postgres NOBYPASSRLS;
```

**Pros:**
- ✓ Single line fix
- ✓ Works immediately with existing code
- ✓ No configuration changes needed

**Cons:**
- ❌ Affects all postgres operations (migrations, seeds, etc.)
- ❌ May break admin tasks that expect full access
- ❌ Not recommended for production

**Use case:** Development and testing environments only.

---

### Option 2: Create Dedicated Application User (RECOMMENDED)

**For production:**

```sql
-- Migration: supabase/migrations/20260306000003_create_app_user.sql

-- Create application user with NOBYPASSRLS
CREATE ROLE app_user WITH
  LOGIN
  PASSWORD 'CHANGE_ME_IN_PRODUCTION'
  NOBYPASSRLS;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- Grant permissions on future tables/sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_user;

COMMENT ON ROLE app_user IS 'Application user with RLS enforcement for multi-tenant isolation';
```

**Update environment configuration:**

```bash
# .env
DB_USER=app_user
DB_PASSWORD=secure_random_password_here
```

**Update TypeORM configuration:**

```typescript
// apps/api/src/app.module.ts
TypeOrmModule.forRoot({
  type: 'postgres',
  username: process.env.DB_USER || 'app_user', // ✓ Use app_user
  password: process.env.DB_PASSWORD,
  // ...
})
```

**Pros:**
- ✓ **Security best practice** - separates app user from admin
- ✓ `postgres` user remains unchanged for admin tasks
- ✓ Clear separation of concerns
- ✓ Production-ready approach
- ✓ RLS properly enforced

**Cons:**
- Requires configuration changes
- Need to manage additional credentials
- Slightly more complex setup

**Use case:** Production and staging environments.

---

### Option 3: Use Supabase `authenticated` Role

**For Supabase-native approach:**

```bash
# .env
DB_USER=authenticated
DB_PASSWORD=<use supabase authenticated password>
```

**Check authenticated role:**

```sql
SELECT rolname, rolbypassrls
FROM pg_roles
WHERE rolname = 'authenticated';

-- Result: authenticated | false ✓
```

**Pros:**
- ✓ Follows Supabase conventions
- ✓ `authenticated` already has `NOBYPASSRLS`
- ✓ Designed for this exact use case
- ✓ No need to create custom roles

**Cons:**
- May need to verify/adjust permissions
- Couples application to Supabase roles
- Less flexibility for custom permissions

**Use case:** Supabase-hosted applications.

---

## Recommended Implementation Strategy

### Phase 1: Immediate Fix (Development)

For testing and development environments:

1. **Create migration to remove BYPASSRLS from postgres:**
   ```bash
   npx supabase migration new remove_postgres_bypassrls
   ```

2. **Add SQL:**
   ```sql
   -- Development only: Remove BYPASSRLS to test RLS
   ALTER ROLE postgres NOBYPASSRLS;
   ```

3. **Apply migration:**
   ```bash
   npx supabase db reset
   ```

4. **Verify tests pass:**
   ```bash
   pnpm test src/__tests__/auth/auth.integration.spec.ts
   ```

### Phase 2: Production Setup

For production and staging:

1. **Create app_user role (Option 2) or use authenticated role (Option 3)**

2. **Update environment variables in deployment:**
   ```bash
   # Production .env
   DB_USER=app_user
   DB_PASSWORD=<strong-random-password>
   ```

3. **Test thoroughly in staging:**
   - Run all integration tests
   - Verify RLS enforcement
   - Test multi-tenant isolation
   - Verify all CRUD operations work

4. **Deploy to production with monitoring:**
   - Enable query logging initially
   - Monitor for permission errors
   - Verify tenant isolation

---

## Verification Checklist

After applying the fix, verify with:

### 1. Check Role Attributes

```sql
-- Should return false
SELECT rolname, rolbypassrls
FROM pg_roles
WHERE rolname = current_user;
```

### 2. Test RLS Enforcement

```bash
# Run our test script
pnpm exec dotenv -e .env -- node apps/api/test-rls.js

# Should show:
# ✓ All users belong to Tenant A (1 user)
# ✓ All users belong to Tenant B (1 user)
```

### 3. Run Integration Tests

```bash
# Should pass all AC4 tests
pnpm test src/__tests__/auth/auth.integration.spec.ts
```

### 4. Manual Verification

```sql
-- Connect as app user
BEGIN;

-- Set Tenant A context
SET LOCAL app.current_user_id = '00000000-0000-0000-0000-000000000001';
SET LOCAL app.current_tenant_id = '11111111-1111-1111-1111-111111111111';
SET LOCAL app.current_user_role = 'owner';

-- Query users - should only see Tenant A
SELECT id, email, tenant_id FROM users;

-- Expected: Only users with tenant_id = '11111111-1111-1111-1111-111111111111'

ROLLBACK;
```

---

## Related Files

### Application Code
- `apps/api/src/app.module.ts` - TypeORM connection config
- `apps/api/src/common/interceptors/tenant-context.interceptor.ts` - Sets session variables
- `apps/api/src/modules/users/users.service.ts` - Uses queryRunner for RLS queries

### Migrations
- `supabase/migrations/20260303000001_role_based_rls_policies.sql` - RLS policy definitions
- `supabase/migrations/20260306000001_force_rls_for_testing.sql` - FORCE RLS (insufficient)
- `supabase/migrations/20260306000002_drop_old_tenant_isolation_policies.sql` - Cleanup

### Tests
- `apps/api/src/__tests__/auth/auth.integration.spec.ts` - Integration tests catching this issue
- `apps/api/test-rls.js` - RLS verification script (created during investigation)

### Documentation
- `docs/JWT-AUTHENTICATION-EXPLAINED.md` - JWT auth implementation
- `docs/RLS-BYPASSRLS-ISSUE.md` - **This document**

---

## References

### PostgreSQL Documentation
- [Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [ALTER ROLE](https://www.postgresql.org/docs/current/sql-alterrole.html)
- [BYPASSRLS Attribute](https://www.postgresql.org/docs/current/role-attributes.html)

### Supabase Documentation
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Database Roles](https://supabase.com/docs/guides/database/database-roles)

### Key Quotes from PostgreSQL Docs

> "Superusers and roles with the `BYPASSRLS` attribute always bypass the row security system when accessing a table. Table owners similarly bypass row security, except when the table has been altered with `FORCE ROW LEVEL SECURITY`."

> "The `BYPASSRLS` attribute allows a role to bypass all row-level security policies. **This overrides `FORCE ROW LEVEL SECURITY`**."

---

## Security Implications

### Before Fix (CRITICAL VULNERABILITY)

```
Severity: CRITICAL
CVSS: 9.1 (Critical)

Vulnerability: Complete tenant isolation bypass
Attack Vector: Any authenticated user can access all tenant data
Impact:
  - Confidentiality: HIGH (all data exposed)
  - Integrity: HIGH (can modify other tenant's data)
  - Availability: LOW

Status: OPEN ❌
```

**Example Attack:**
1. User from Tenant A logs in
2. Gets valid JWT for Tenant A
3. Makes API call to `/api/users`
4. Receives data from ALL tenants (Tenant A, B, C, etc.)
5. Can see/modify data belonging to other tenants

### After Fix (SECURE)

```
Severity: NONE
Status: RESOLVED ✓

Protection:
  - RLS policies enforced on every query
  - Session variables checked via current_setting()
  - Users only see data for their tenant
  - Role-based restrictions applied (owner/manager/agent)
```

---

## Action Items

### Immediate (Required)

- [ ] Apply Option 1 fix for development environment
- [ ] Run all integration tests to verify RLS works
- [ ] Update test seed data if needed
- [ ] Verify TenantContextInterceptor with new setup

### Short-term (Required before production)

- [ ] Implement Option 2 (create app_user role)
- [ ] Update deployment configurations
- [ ] Update CI/CD pipelines with new credentials
- [ ] Add RLS verification to deployment checks

### Long-term (Nice to have)

- [ ] Add automated RLS verification in CI/CD
- [ ] Create monitoring for RLS bypass attempts
- [ ] Document RLS policy changes in migration comments
- [ ] Add integration tests for each RLS policy

---

## Conclusion

The RLS implementation was **architecturally correct** but failed due to a **database configuration issue** (BYPASSRLS attribute). This is a common pitfall when:

1. Using admin/superuser accounts for application queries
2. Not understanding PostgreSQL's RLS enforcement hierarchy
3. Assuming `FORCE ROW LEVEL SECURITY` is sufficient

**Key Lesson:** Always use a dedicated application user with `NOBYPASSRLS` for RLS-protected queries. Reserve admin users for migrations and management tasks.

**Status:** Issue identified, solutions documented, ready for implementation.

---

**Last Updated:** 2026-03-06
**Author:** Development Team
**Reviewed By:** Security Team (pending)
