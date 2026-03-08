-- Migration: Fix UUID Casting in Write Policies
-- Story: 1-2-tenant-user-authentication-login-session
-- Issue: Write policies with "FOR ALL" apply to SELECT and cause UUID casting errors
--
-- Problem:
--   users_owner_manager_write policy uses "FOR ALL" which includes SELECT operations.
--   When login queries run, this policy is evaluated and tries to cast empty string to UUID.
--   Error: invalid input syntax for type uuid: ""
--
-- Solution:
--   Change "FOR ALL" to specific commands (INSERT, UPDATE, DELETE) to exclude SELECT.
--   This ensures write policies don't interfere with login SELECT queries.
--

-- Drop and recreate users_owner_manager_write without FOR ALL
DROP POLICY IF EXISTS users_owner_manager_write ON users;

CREATE POLICY users_owner_manager_write_insert ON users
  FOR INSERT
  WITH CHECK (
    current_setting('app.current_user_role', true) IN ('owner', 'manager')
    AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
  );

CREATE POLICY users_owner_manager_write_update ON users
  FOR UPDATE
  USING (
    current_setting('app.current_user_role', true) IN ('owner', 'manager')
    AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
  );

CREATE POLICY users_owner_manager_write_delete ON users
  FOR DELETE
  USING (
    current_setting('app.current_user_role', true) IN ('owner', 'manager')
    AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
  );

-- Similarly fix agent_profiles policies
DROP POLICY IF EXISTS agent_profiles_owner_manager_write ON agent_profiles;

CREATE POLICY agent_profiles_owner_manager_write_insert ON agent_profiles
  FOR INSERT
  WITH CHECK (
    current_setting('app.current_user_role', true) IN ('owner', 'manager')
    AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
  );

CREATE POLICY agent_profiles_owner_manager_write_update ON agent_profiles
  FOR UPDATE
  USING (
    current_setting('app.current_user_role', true) IN ('owner', 'manager')
    AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
  );

CREATE POLICY agent_profiles_owner_manager_write_delete ON agent_profiles
  FOR DELETE
  USING (
    current_setting('app.current_user_role', true) IN ('owner', 'manager')
    AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
  );

COMMENT ON POLICY users_owner_manager_write_insert ON users IS
  'Only owner/manager can INSERT users. Separated from SELECT to avoid UUID casting errors during login.';

COMMENT ON POLICY users_owner_manager_write_update ON users IS
  'Only owner/manager can UPDATE users. Separated from SELECT to avoid UUID casting errors during login.';

COMMENT ON POLICY users_owner_manager_write_delete ON users IS
  'Only owner/manager can DELETE users. Separated from SELECT to avoid UUID casting errors during login.';
