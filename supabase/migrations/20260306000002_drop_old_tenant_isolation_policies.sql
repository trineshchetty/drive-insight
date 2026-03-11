-- Migration: Drop old tenant-only isolation policies
-- Replaces simple tenant isolation with role-based policies from 20260303000001
--
-- Why: The old `users_tenant_isolation` policy allowed ANY user in a tenant
-- to see ALL users in that tenant. We need role-based restrictions where:
-- - Agents only see their own profile
-- - Owners/Managers see all tenant users
--
-- The role-based policies in 20260303000001_role_based_rls_policies.sql
-- already include tenant isolation, so the old policies are redundant and
-- actually conflict (making security weaker due to OR logic)

-- Drop old tenant-only policy on users table
DROP POLICY IF EXISTS users_tenant_isolation ON users;

-- Drop old tenant-only policy on agent_profiles table (if it exists)
DROP POLICY IF EXISTS agent_profiles_tenant_isolation ON agent_profiles;

-- Note: audit_log keeps its simple tenant isolation policy
-- because all users in a tenant can read audit logs (no role restrictions needed)
