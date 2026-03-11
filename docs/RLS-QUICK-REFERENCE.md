# RLS (Row Level Security) Quick Reference

**TL;DR:** RLS not working? Check if your database user has `BYPASSRLS` enabled. If yes, disable it or use a different user.

---

## Quick Diagnosis

### Is RLS Working?

```bash
# Run verification script
cd apps/api
pnpm exec dotenv -e ../../.env -- node test-rls.js
```

**Expected output (working):**
```
✓ Tenant A owner sees 1 user (only Tenant A)
✓ Tenant B owner sees 1 user (only Tenant B)
```

**Problem output (not working):**
```
❌ Tenant A owner sees 2 users (both tenants)
❌ WARNING: Current user has BYPASSRLS enabled!
```

---

## Quick Fixes

### Option 1: Disable BYPASSRLS (Development Only)

```sql
-- Quick fix for local development
ALTER ROLE postgres NOBYPASSRLS;
```

Then restart your app and rerun tests.

**⚠️ WARNING:** Don't use this in production! Use Option 2 instead.

---

### Option 2: Create Application User (Production)

```sql
-- Create dedicated app user
CREATE ROLE app_user WITH
  LOGIN
  PASSWORD 'secure_password'
  NOBYPASSRLS;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO app_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO app_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO app_user;
```

Update `.env`:
```bash
DB_USER=app_user
DB_PASSWORD=secure_password
```

---

## Common Issues

### Issue 1: Tests Failing with "Wrong Tenant ID"

**Symptom:**
```
Expected tenant_id: "11111111..." (Tenant A)
Received tenant_id: "22222222..." (Tenant B)
```

**Cause:** BYPASSRLS enabled on database user

**Fix:** See Option 1 or Option 2 above

---

### Issue 2: All Users See All Data

**Symptom:** API returns data from all tenants regardless of user

**Cause:** RLS policies not being enforced

**Fix:**
1. Check BYPASSRLS status:
   ```sql
   SELECT current_user, rolbypassrls FROM pg_roles WHERE rolname = current_user;
   ```
2. If true, apply Option 1 or Option 2

---

### Issue 3: "Permission Denied" Errors

**Symptom:**
```
ERROR: permission denied for table users
```

**Cause:** Application user doesn't have required permissions

**Fix:**
```sql
-- Grant all permissions to app user
GRANT ALL ON ALL TABLES IN SCHEMA public TO app_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO app_user;
```

---

## Understanding BYPASSRLS

### What is BYPASSRLS?

PostgreSQL role attribute that **completely bypasses all RLS policies**.

### Who has BYPASSRLS in Supabase?

```
postgres        → BYPASSRLS = true  (admin user)
service_role    → BYPASSRLS = true  (server admin)
authenticated   → BYPASSRLS = false (app queries) ✓
anon            → BYPASSRLS = false (public access) ✓
```

### Key Points

- `BYPASSRLS` overrides **everything**, even `FORCE ROW LEVEL SECURITY`
- Use `authenticated` or custom `app_user` for application queries
- Keep `postgres` with `BYPASSRLS` for admin tasks only
- Never use `postgres` or `service_role` for application queries

---

## Verification Commands

### Check Current User's BYPASSRLS Status

```sql
SELECT current_user, rolbypassrls
FROM pg_roles
WHERE rolname = current_user;
```

### Check RLS Is Enabled on Tables

```sql
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'users';
```

### Check FORCE RLS Status

```sql
SELECT
  relname as table_name,
  relforcerowsecurity as force_rls
FROM pg_class
WHERE relname = 'users';
```

### Check RLS Policies

```sql
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;
```

### Test RLS Enforcement Manually

```sql
-- Connect as app user (not postgres!)
BEGIN;

-- Set tenant context
SET LOCAL app.current_tenant_id = '11111111-1111-1111-1111-111111111111';
SET LOCAL app.current_user_role = 'owner';
SET LOCAL app.current_user_id = '00000000-0000-0000-0000-000000000001';

-- Query users
SELECT id, email, tenant_id FROM users;
-- Should only return users from tenant 11111111...

ROLLBACK;
```

---

## Files to Check

### Application Code
- `apps/api/src/app.module.ts` - Database connection config
- `apps/api/src/common/interceptors/tenant-context.interceptor.ts` - Sets session variables

### Database
- `supabase/migrations/*_rls_policies.sql` - RLS policy definitions
- `.env` - Database credentials (check DB_USER)

### Tests
- `apps/api/src/__tests__/auth/auth.integration.spec.ts` - Integration tests
- `apps/api/test-rls.js` - RLS verification script

### Documentation
- `docs/RLS-BYPASSRLS-ISSUE.md` - Complete analysis (READ THIS FOR DETAILS)
- `docs/RLS-QUICK-REFERENCE.md` - This document

---

## When to Use Each Fix

| Environment | Recommended Fix | Why |
|-------------|----------------|-----|
| Local Dev | Option 1 (ALTER postgres) | Quick, simple, non-critical |
| CI/CD | Option 1 or 2 | Consistent with production |
| Staging | Option 2 (app_user) | Test production config |
| Production | Option 2 (app_user) | Security best practice |

---

## Need Help?

1. **Read full documentation:** `docs/RLS-BYPASSRLS-ISSUE.md`
2. **Run verification:** `node apps/api/test-rls.js`
3. **Check test logs:** Look for "Session variables:" output
4. **Verify database user:** `SELECT current_user, rolbypassrls FROM pg_roles WHERE rolname = current_user;`

---

**Last Updated:** 2026-03-06
**Related:** RLS-BYPASSRLS-ISSUE.md (main documentation)
