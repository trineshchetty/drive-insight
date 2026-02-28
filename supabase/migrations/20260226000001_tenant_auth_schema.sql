-- Migration: Tenant Authentication & Multi-Tenancy Foundation
-- Story 1.1: Tenant Database Schema & RLS Policies
-- Created: 2026-02-26
-- Description: Core tenant, user, and agent_profile tables with RLS policies and audit logging

-- ============================================================================
-- TABLE: tenants
-- Root of tenant hierarchy - NO RLS (needs to be queryable by all tenants)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  branch VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'suspended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);

COMMENT ON TABLE tenants IS 'Root tenant table - no RLS policy (must be queryable)';
COMMENT ON COLUMN tenants.status IS 'Tenant status: active, paused, or suspended';

-- ============================================================================
-- TABLE: users
-- User accounts scoped to tenants with role-based access
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'manager', 'agent')),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_tenant_email UNIQUE(tenant_id, email)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(tenant_id, role);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Tenant isolation using session variable
-- Note: Role-based access policy will be added in Story 1.2 when role management is implemented
CREATE POLICY users_tenant_isolation ON users
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

COMMENT ON TABLE users IS 'User accounts with tenant isolation via RLS';
COMMENT ON COLUMN users.role IS 'User role: owner, manager, or agent';

-- ============================================================================
-- TABLE: agent_profiles
-- Agent-specific profile data (working hours, availability)
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  working_hours JSONB DEFAULT '{}',
  availability BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_tenant_user UNIQUE(tenant_id, user_id)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_agent_profiles_tenant ON agent_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_profiles_user ON agent_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_profiles_availability ON agent_profiles(tenant_id, availability);

-- Enable RLS
ALTER TABLE agent_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Tenant isolation using session variable
-- Note: Role-based access policy will be added in Story 1.2 when role management is implemented
CREATE POLICY agent_profiles_tenant_isolation ON agent_profiles
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

COMMENT ON TABLE agent_profiles IS 'Agent profile data with tenant isolation via RLS';
COMMENT ON COLUMN agent_profiles.working_hours IS 'JSONB object storing agent working hours schedule';
COMMENT ON COLUMN agent_profiles.availability IS 'Whether agent is currently available for assignment';

-- ============================================================================
-- TABLE: audit_log
-- Audit trail for all tenant-scoped mutations (INSERT/UPDATE/DELETE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  actor_user_id UUID,
  action VARCHAR(50) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID NOT NULL,
  before JSONB,
  after JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes for audit queries
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant ON audit_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_user_id, created_at DESC);

-- Enable RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Tenant isolation using session variable
-- Note: Role-based access policy will be added in Story 1.2 when role management is implemented
CREATE POLICY audit_log_tenant_isolation ON audit_log
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

COMMENT ON TABLE audit_log IS 'Audit trail for all mutations on tenant-scoped tables';
COMMENT ON COLUMN audit_log.action IS 'Type of mutation: INSERT, UPDATE, or DELETE';
COMMENT ON COLUMN audit_log.entity_type IS 'Table name of the entity being audited';
COMMENT ON COLUMN audit_log.before IS 'JSONB snapshot of entity state before mutation (NULL for INSERT)';
COMMENT ON COLUMN audit_log.after IS 'JSONB snapshot of entity state after mutation (NULL for DELETE)';

-- ============================================================================
-- AUDIT TRIGGER FUNCTION
-- Generic trigger function to automatically log all mutations
-- ============================================================================

CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  current_tenant_id UUID;
  current_user_id UUID;
BEGIN
  -- Safely retrieve session variables with NULL handling
  BEGIN
    current_tenant_id := current_setting('app.current_tenant_id', true)::uuid;
  EXCEPTION WHEN OTHERS THEN
    current_tenant_id := NULL;
  END;

  BEGIN
    current_user_id := current_setting('app.current_user_id', true)::uuid;
  EXCEPTION WHEN OTHERS THEN
    current_user_id := NULL;
  END;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (
      tenant_id,
      actor_user_id,
      action,
      entity_type,
      entity_id,
      before,
      after
    ) VALUES (
      OLD.tenant_id,
      current_user_id,
      'DELETE',
      TG_TABLE_NAME,
      OLD.id,
      row_to_json(OLD),
      NULL
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (
      tenant_id,
      actor_user_id,
      action,
      entity_type,
      entity_id,
      before,
      after
    ) VALUES (
      NEW.tenant_id,
      current_user_id,
      'UPDATE',
      TG_TABLE_NAME,
      NEW.id,
      row_to_json(OLD),
      row_to_json(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (
      tenant_id,
      actor_user_id,
      action,
      entity_type,
      entity_id,
      before,
      after
    ) VALUES (
      NEW.tenant_id,
      current_user_id,
      'INSERT',
      TG_TABLE_NAME,
      NEW.id,
      NULL,
      row_to_json(NEW)
    );
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION audit_trigger_func IS 'Generic audit trigger capturing all mutations with before/after state';

-- ============================================================================
-- APPLY AUDIT TRIGGERS TO TENANT-SCOPED TABLES
-- ============================================================================

-- Drop triggers if they exist (for migration re-application)
DROP TRIGGER IF EXISTS audit_users ON users;
DROP TRIGGER IF EXISTS audit_agent_profiles ON agent_profiles;

-- Create audit triggers
CREATE TRIGGER audit_users
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_agent_profiles
  AFTER INSERT OR UPDATE OR DELETE ON agent_profiles
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- Automatically update updated_at timestamp on row updates
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop triggers if they exist
DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_agent_profiles_updated_at ON agent_profiles;

-- Apply updated_at triggers
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_profiles_updated_at
  BEFORE UPDATE ON agent_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify tables were created
DO $$
BEGIN
  ASSERT (SELECT COUNT(*) FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name IN ('tenants', 'users', 'agent_profiles', 'audit_log')) = 4,
         'Migration failed: Not all tables were created';

  RAISE NOTICE 'Migration 20260226000001_tenant_auth_schema.sql completed successfully';
  RAISE NOTICE '✓ Tables created: tenants, users, agent_profiles, audit_log';
  RAISE NOTICE '✓ RLS enabled on: users, agent_profiles, audit_log';
  RAISE NOTICE '✓ Audit triggers installed: users, agent_profiles';
  RAISE NOTICE '✓ Indexes created for query performance';
END $$;
