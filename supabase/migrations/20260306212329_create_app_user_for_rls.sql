-- Migration: Create Dedicated Application User with RLS Enforcement
-- Story: 1-3-role-based-access-control-owner-manager-agent
-- Issue: RLS-BYPASSRLS-ISSUE.md
--
-- Purpose: Create a dedicated database user for application queries that respects RLS policies.
--
-- Problem:
--   The 'postgres' user has BYPASSRLS=true, which causes ALL RLS policies to be ignored.
--   This breaks multi-tenant isolation and is a critical security vulnerability.
--
-- Solution:
--   Create 'app_user' role with NOBYPASSRLS that the application will use for all queries.
--   This ensures RLS policies are enforced and tenant isolation is maintained.
--
-- Security Impact:
--   BEFORE: All users can see data from all tenants (CRITICAL vulnerability)
--   AFTER:  Users only see data from their own tenant (RLS enforced)
--
-- See: docs/RLS-BYPASSRLS-ISSUE.md for complete analysis
--

-- ========================================
-- 1. Create Application User Role
-- ========================================

-- Check if app_user already exists (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
    -- Create user with NOBYPASSRLS (critical for RLS enforcement)
    CREATE ROLE app_user WITH
      LOGIN                    -- Allow login to database
      PASSWORD 'app_user_dev'  -- Default password (CHANGE IN PRODUCTION!)
      NOBYPASSRLS              -- MUST respect RLS policies
      NOCREATEDB               -- Cannot create databases
      NOCREATEROLE             -- Cannot create other roles
      NOINHERIT;               -- Does not inherit privileges

    RAISE NOTICE 'Created app_user role with NOBYPASSRLS';
  ELSE
    RAISE NOTICE 'app_user role already exists, skipping creation';

    -- Ensure NOBYPASSRLS is set (in case it was created differently)
    ALTER ROLE app_user NOBYPASSRLS;
    RAISE NOTICE 'Ensured app_user has NOBYPASSRLS';
  END IF;
END
$$;

-- ========================================
-- 2. Grant Schema Access
-- ========================================

-- Grant usage on public schema (required to access objects in schema)
GRANT USAGE ON SCHEMA public TO app_user;

-- ========================================
-- 3. Grant Table Permissions (CRUD)
-- ========================================

-- Grant CRUD permissions on all existing tables
GRANT SELECT, INSERT, UPDATE, DELETE
ON ALL TABLES IN SCHEMA public
TO app_user;

-- ========================================
-- 4. Grant Sequence Permissions
-- ========================================

-- Grant permissions on sequences (for auto-increment IDs, serial columns)
GRANT USAGE, SELECT
ON ALL SEQUENCES IN SCHEMA public
TO app_user;

-- ========================================
-- 5. Grant Future Object Permissions
-- ========================================

-- Grant permissions on tables created in the future
-- This ensures new tables are automatically accessible to app_user
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;

-- Grant permissions on sequences created in the future
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_user;

-- ========================================
-- 6. Document the Role
-- ========================================

COMMENT ON ROLE app_user IS
  'Application user for NestJS/TypeORM queries with RLS enforcement.

   Security: Has NOBYPASSRLS to enforce Row Level Security policies.
   Purpose: All application queries must use this user (not postgres).
   Permissions: CRUD on all tables, respects RLS tenant isolation.

   See: docs/RLS-BYPASSRLS-ISSUE.md for implementation details.
   Related: TenantContextInterceptor sets session variables for RLS.';

-- ========================================
-- 7. Verification
-- ========================================

-- Verify app_user configuration
DO $$
DECLARE
  v_bypass_rls boolean;
BEGIN
  SELECT rolbypassrls INTO v_bypass_rls
  FROM pg_roles
  WHERE rolname = 'app_user';

  IF v_bypass_rls THEN
    RAISE EXCEPTION 'CRITICAL: app_user has BYPASSRLS enabled! RLS will not work.';
  ELSE
    RAISE NOTICE 'VERIFIED: app_user has NOBYPASSRLS - RLS will be enforced ✓';
  END IF;
END
$$;

-- ========================================
-- 8. Security Notes
-- ========================================

-- IMPORTANT: After applying this migration:
--
-- 1. Update .env file:
--    DB_USER=app_user
--    DB_PASSWORD=app_user_dev  (for development)
--
-- 2. For PRODUCTION, change password:
--    ALTER ROLE app_user WITH PASSWORD '<strong-random-password>';
--
-- 3. Store production password in secrets manager (not in .env):
--    - AWS Secrets Manager
--    - GCP Secret Manager
--    - Azure Key Vault
--    - HashiCorp Vault
--
-- 4. Verify RLS is working:
--    cd apps/api
--    pnpm exec dotenv -e ../../.env -- node test-rls.js
--
-- 5. Run integration tests:
--    pnpm test src/__tests__/auth/auth.integration.spec.ts
--
-- DO NOT use 'postgres' user for application queries!
-- The 'postgres' user should ONLY be used for:
--   - Database migrations
--   - Schema changes
--   - Emergency admin access
--   - Database backups

-- ========================================
-- Migration Complete
-- ========================================
