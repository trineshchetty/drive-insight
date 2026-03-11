-- Migration: Fix UUID Casting Error in RLS Policies
-- Story: 1-2-tenant-user-authentication-login-session
-- Issue: current_setting() returns empty string "" instead of NULL, causing UUID cast errors
--
-- Problem:
--   The RLS policy uses current_setting('app.current_user_id', true)::uuid
--   When the setting is not set, it returns "" (empty string) instead of NULL
--   PostgreSQL can't cast "" to UUID: "invalid input syntax for type uuid: """
--
-- Solution:
--   Use NULLIF(current_setting('...', true), '')::uuid
--   This converts empty strings to NULL before casting, avoiding the error
--

-- Drop the existing policy
DROP POLICY IF EXISTS users_role_based_access ON users;

-- Recreate with proper empty string handling using CASE to prevent premature evaluation
CREATE POLICY users_role_based_access ON users
  FOR SELECT
  USING (
    -- Allow login queries (when no role is set yet)
    COALESCE(NULLIF(current_setting('app.current_user_role', true), ''), '') = ''

    OR

    -- Owner/manager sees all tenant users (post-login)
    (current_setting('app.current_user_role', true) IN ('owner', 'manager')
     AND tenant_id = (
       CASE
         WHEN NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL
         THEN NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
         ELSE NULL
       END
     ))

    OR

    -- Agent sees only their own profile (post-login)
    (current_setting('app.current_user_role', true) = 'agent'
     AND id = (
       CASE
         WHEN NULLIF(current_setting('app.current_user_id', true), '') IS NOT NULL
         THEN NULLIF(current_setting('app.current_user_id', true), '')::uuid
         ELSE NULL
       END
     )
     AND tenant_id = (
       CASE
         WHEN NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL
         THEN NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
         ELSE NULL
       END
     ))
  );

COMMENT ON POLICY users_role_based_access ON users IS
  'Role-based access control with authentication support and safe UUID casting.
   - Login (no role set): Can SELECT any user (needed for auth lookup)
   - Owner/Manager (post-login): Can see all users in their tenant
   - Agent (post-login): Can only see their own profile
   Uses NULLIF to handle empty strings before UUID casting.
   See: docs/RLS-BYPASSRLS-ISSUE.md';
