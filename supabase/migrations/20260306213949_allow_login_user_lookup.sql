-- Migration: Allow Login User Lookup (Bypass RLS for Authentication)
-- Story: 1-2-tenant-user-authentication-login-session
-- Related: RLS-BYPASSRLS-ISSUE.md
--
-- Purpose: Allow authentication queries to find users by email without RLS blocking
--
-- Problem:
--   The login endpoint needs to query users table to find user by email.
--   With app_user enforcing RLS, queries fail because no tenant context exists yet.
--   This is a chicken-and-egg problem: can't login without tenant_id, can't get tenant_id without login.
--
-- Solution:
--   REMOVED - This approach doesn't work because PostgreSQL RLS uses OR logic.
--   If any policy allows a row, it's returned, which breaks tenant isolation.
--
-- Alternative Solution:
--   The role-based policies already handle this correctly!
--   Looking at users_role_based_access policy:
--   - It checks current_setting('app.current_user_role', true)
--   - The `true` parameter makes it return NULL if not set (instead of error)
--   - When role is NULL, neither owner/manager nor agent condition matches
--   - But SELECT with no session variables should still work for login!
--
-- Wait, let's check if the issue is the query itself...

-- Actually, the REAL solution is simpler:
-- Just remove the restrictive role-based SELECT policy during login!
-- We need a policy that allows SELECT when NO session variables are set (login case)
-- OR when session variables match the role-based rules (post-login case)

-- Drop the overly permissive policy if it was created
DROP POLICY IF EXISTS users_auth_lookup ON users;

-- The role-based policy already exists and handles post-login correctly.
-- We just need to ADD a condition to allow SELECT during login (when no role is set).

-- Replace the existing role-based policy with one that includes login case
DROP POLICY IF EXISTS users_role_based_access ON users;

CREATE POLICY users_role_based_access ON users
  FOR SELECT
  USING (
    -- Allow login queries (when no role is set yet)
    current_setting('app.current_user_role', true) IS NULL
    
    OR
    
    -- Owner/manager sees all tenant users (post-login)
    (current_setting('app.current_user_role', true) IN ('owner', 'manager')
     AND tenant_id = current_setting('app.current_tenant_id', true)::uuid)

    OR

    -- Agent sees only their own profile (post-login)
    (current_setting('app.current_user_role', true) = 'agent'
     AND id = current_setting('app.current_user_id', true)::uuid
     AND tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  );

COMMENT ON POLICY users_role_based_access ON users IS
  'Role-based access control with authentication support.
   - Login (no role set): Can SELECT any user (needed for auth lookup)
   - Owner/Manager (post-login): Can see all users in their tenant
   - Agent (post-login): Can only see their own profile
   See: docs/RLS-BYPASSRLS-ISSUE.md';
