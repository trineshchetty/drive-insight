-- Migration: Force RLS for all users including superuser (postgres)
-- Required for testing RLS policies with postgres user
--
-- By default, PostgreSQL RLS policies don't apply to:
-- 1. Table owners
-- 2. Superusers (like 'postgres')
--
-- FORCE ROW LEVEL SECURITY makes RLS apply to ALL users, even superusers
-- This is essential for testing RLS policies in development/test environments

-- Force RLS on users table (tenant + role-based isolation)
ALTER TABLE users FORCE ROW LEVEL SECURITY;

-- Force RLS on agent_profiles table (tenant + role-based isolation)
ALTER TABLE agent_profiles FORCE ROW LEVEL SECURITY;

-- Force RLS on audit_log table (tenant isolation)
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;

-- Force RLS on tenants table (if RLS is enabled)
-- Note: Tenants table typically doesn't have RLS in multi-tenant systems
-- But we'll add it for consistency if it's already enabled
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables t
    JOIN pg_class c ON t.tablename = c.relname
    WHERE t.tablename = 'tenants'
    AND c.relrowsecurity = true
  ) THEN
    EXECUTE 'ALTER TABLE tenants FORCE ROW LEVEL SECURITY';
  END IF;
END $$;
