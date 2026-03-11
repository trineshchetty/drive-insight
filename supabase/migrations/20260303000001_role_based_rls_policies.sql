-- Migration: Role-Based RLS Policies
-- Story: 1-3-role-based-access-control-owner-manager-agent
-- Description: Adds role-based RLS policies for existing Epic 1 tables
--
-- Policy Strategy:
-- - Agents: Only see their own user/profile rows
-- - Owners/Managers: See all tenant-scoped users and agent profiles
--
-- Defense-in-Depth Layer 1: Database RLS policies (first line of defense)
-- Layer 2: TenantContextInterceptor (PostgreSQL session variables + request context)

-- ========================================
-- USERS TABLE: Role-based access
-- ========================================

-- Agents can only read their own user profile
-- Owners/managers can read all tenant users
CREATE POLICY users_role_based_access ON users
  FOR SELECT
  USING (
    -- Owner/manager sees all tenant users
    (current_setting('app.current_user_role', true) IN ('owner', 'manager')
     AND tenant_id = current_setting('app.current_tenant_id', true)::uuid)

    OR

    -- Agent sees only their own profile
    (current_setting('app.current_user_role', true) = 'agent'
     AND id = current_setting('app.current_user_id', true)::uuid
     AND tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  );

-- Only owner/manager can INSERT/UPDATE/DELETE users
CREATE POLICY users_owner_manager_write ON users
  FOR ALL
  USING (
    current_setting('app.current_user_role', true) IN ('owner', 'manager')
    AND tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- Agents can UPDATE their own profile (name, email, etc.)
CREATE POLICY users_agent_self_update ON users
  FOR UPDATE
  USING (
    current_setting('app.current_user_role', true) = 'agent'
    AND id = current_setting('app.current_user_id', true)::uuid
    AND tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- ========================================
-- AGENT_PROFILES TABLE: Role-based access
-- ========================================

-- Agents can only read their own agent profile
-- Owners/managers can read all tenant agent profiles
CREATE POLICY agent_profiles_role_based_access ON agent_profiles
  FOR SELECT
  USING (
    -- Owner/manager sees all tenant agent profiles
    (current_setting('app.current_user_role', true) IN ('owner', 'manager')
     AND tenant_id = current_setting('app.current_tenant_id', true)::uuid)

    OR

    -- Agent sees only their own profile
    (current_setting('app.current_user_role', true) = 'agent'
     AND user_id = current_setting('app.current_user_id', true)::uuid
     AND tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  );

-- Only owner/manager can write to agent_profiles
CREATE POLICY agent_profiles_owner_manager_write ON agent_profiles
  FOR ALL
  USING (
    current_setting('app.current_user_role', true) IN ('owner', 'manager')
    AND tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- Agents can UPDATE their own agent profile
CREATE POLICY agent_profiles_agent_self_update ON agent_profiles
  FOR UPDATE
  USING (
    current_setting('app.current_user_role', true) = 'agent'
    AND user_id = current_setting('app.current_user_id', true)::uuid
    AND tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- ========================================
-- FUTURE TABLES: Role-based access
-- ========================================
-- NOTE:
-- Leads, conversations, and bookings are introduced in later stories.
-- Their role-based RLS policies must be created in the same migrations that
-- introduce those tables so fresh resets apply them in the correct order.
-- This migration intentionally scopes Story 1.3 to tables that already exist:
-- `users` and `agent_profiles`.

-- ========================================
-- AUDIT_LOGS TABLE: No role-based restrictions
-- ========================================
-- Audit logs are read-only for all users in tenant
-- Already covered by tenant isolation policies from Story 1.1
