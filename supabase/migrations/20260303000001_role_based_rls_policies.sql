-- Migration: Role-Based RLS Policies
-- Story: 1-3-role-based-access-control-owner-manager-agent
-- Description: Adds role-based RLS policies for agent data access restrictions
--
-- Policy Strategy:
-- - Agents: Only see data assigned to them (leads, conversations, bookings, own profile)
-- - Owners/Managers: See all tenant data (existing tenant isolation policies apply)
--
-- Defense-in-Depth Layer 1: Database RLS policies (first line of defense)
-- Layer 2: TenantContextInterceptor (PostgreSQL session variables + AsyncLocalStorage)
-- Layer 3: TypeORM subscribers (disabled pending Lead/Conversation entities)

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
-- LEADS TABLE: Role-based access (Epic 2)
-- ========================================
-- NOTE: These policies are created proactively for Epic 2
-- The leads table will be created in Story 2-1
-- These policies will become active once the table exists

-- Create policies only if leads table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'leads') THEN
    -- Agents see only leads assigned to them
    -- Owners/managers see all tenant leads
    EXECUTE '
      CREATE POLICY leads_role_based_access ON leads
        FOR SELECT
        USING (
          -- Owner/manager sees all tenant leads
          (current_setting(''app.current_user_role'', true) IN (''owner'', ''manager'')
           AND tenant_id = current_setting(''app.current_tenant_id'', true)::uuid)

          OR

          -- Agent sees only their assigned leads
          (current_setting(''app.current_user_role'', true) = ''agent''
           AND assigned_agent_id = current_setting(''app.current_user_id'', true)::uuid
           AND tenant_id = current_setting(''app.current_tenant_id'', true)::uuid)
        )
    ';

    -- Only owner/manager can create/delete leads
    -- Agents can UPDATE leads assigned to them
    EXECUTE '
      CREATE POLICY leads_owner_manager_write ON leads
        FOR INSERT
        USING (
          current_setting(''app.current_user_role'', true) IN (''owner'', ''manager'')
          AND tenant_id = current_setting(''app.current_tenant_id'', true)::uuid
        )
    ';

    EXECUTE '
      CREATE POLICY leads_agent_update_assigned ON leads
        FOR UPDATE
        USING (
          (current_setting(''app.current_user_role'', true) IN (''owner'', ''manager'')
           AND tenant_id = current_setting(''app.current_tenant_id'', true)::uuid)

          OR

          (current_setting(''app.current_user_role'', true) = ''agent''
           AND assigned_agent_id = current_setting(''app.current_user_id'', true)::uuid
           AND tenant_id = current_setting(''app.current_tenant_id'', true)::uuid)
        )
    ';
  END IF;
END $$;

-- ========================================
-- CONVERSATIONS TABLE: Role-based access (Epic 2)
-- ========================================
-- NOTE: These policies are created proactively for Epic 2
-- The conversations table will be created in Story 2-1
-- These policies will become active once the table exists

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'conversations') THEN
    -- Agents see only conversations assigned to them
    -- Owners/managers see all tenant conversations
    EXECUTE '
      CREATE POLICY conversations_role_based_access ON conversations
        FOR SELECT
        USING (
          -- Owner/manager sees all tenant conversations
          (current_setting(''app.current_user_role'', true) IN (''owner'', ''manager'')
           AND tenant_id = current_setting(''app.current_tenant_id'', true)::uuid)

          OR

          -- Agent sees only their assigned conversations
          (current_setting(''app.current_user_role'', true) = ''agent''
           AND assigned_agent_id = current_setting(''app.current_user_id'', true)::uuid
           AND tenant_id = current_setting(''app.current_tenant_id'', true)::uuid)
        )
    ';

    EXECUTE '
      CREATE POLICY conversations_owner_manager_write ON conversations
        FOR ALL
        USING (
          current_setting(''app.current_user_role'', true) IN (''owner'', ''manager'')
          AND tenant_id = current_setting(''app.current_tenant_id'', true)::uuid
        )
    ';

    EXECUTE '
      CREATE POLICY conversations_agent_update_assigned ON conversations
        FOR UPDATE
        USING (
          (current_setting(''app.current_user_role'', true) IN (''owner'', ''manager'')
           AND tenant_id = current_setting(''app.current_tenant_id'', true)::uuid)

          OR

          (current_setting(''app.current_user_role'', true) = ''agent''
           AND assigned_agent_id = current_setting(''app.current_user_id'', true)::uuid
           AND tenant_id = current_setting(''app.current_tenant_id'', true)::uuid)
        )
    ';
  END IF;
END $$;

-- ========================================
-- BOOKINGS TABLE: Role-based access (Epic 4)
-- ========================================
-- NOTE: These policies are created proactively for Epic 4
-- The bookings table will be created in Story 4-1
-- These policies will become active once the table exists

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'bookings') THEN
    -- Agents see only bookings assigned to them
    -- Owners/managers see all tenant bookings
    EXECUTE '
      CREATE POLICY bookings_role_based_access ON bookings
        FOR SELECT
        USING (
          -- Owner/manager sees all tenant bookings
          (current_setting(''app.current_user_role'', true) IN (''owner'', ''manager'')
           AND tenant_id = current_setting(''app.current_tenant_id'', true)::uuid)

          OR

          -- Agent sees only their assigned bookings
          (current_setting(''app.current_user_role'', true) = ''agent''
           AND assigned_agent_id = current_setting(''app.current_user_id'', true)::uuid
           AND tenant_id = current_setting(''app.current_tenant_id'', true)::uuid)
        )
    ';

    EXECUTE '
      CREATE POLICY bookings_owner_manager_write ON bookings
        FOR INSERT
        USING (
          current_setting(''app.current_user_role'', true) IN (''owner'', ''manager'')
          AND tenant_id = current_setting(''app.current_tenant_id'', true)::uuid
        )
    ';

    EXECUTE '
      CREATE POLICY bookings_agent_update_assigned ON bookings
        FOR UPDATE
        USING (
          (current_setting(''app.current_user_role'', true) IN (''owner'', ''manager'')
           AND tenant_id = current_setting(''app.current_tenant_id'', true)::uuid)

          OR

          (current_setting(''app.current_user_role'', true) = ''agent''
           AND assigned_agent_id = current_setting(''app.current_user_id'', true)::uuid
           AND tenant_id = current_setting(''app.current_tenant_id'', true)::uuid)
        )
    ';
  END IF;
END $$;

-- ========================================
-- AUDIT_LOGS TABLE: No role-based restrictions
-- ========================================
-- Audit logs are read-only for all users in tenant
-- Already covered by tenant isolation policies from Story 1.1
