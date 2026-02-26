# Story 1.1: Tenant Database Schema & RLS Policies

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a platform engineer,
I want the core tenant, user, and agent_profile tables created with RLS policies enforcing tenant isolation,
So that every subsequent feature is built on a foundation that makes cross-tenant data leakage architecturally impossible.

## Acceptance Criteria

**Given** the database migrations run
**When** I inspect the schema
**Then** the following tables exist: `tenants`, `users`, `agent_profiles`
**And** all tables include a `tenant_id UUID` column (except `tenants` itself)
**And** RLS is enabled on all tenant-scoped tables

**Given** RLS policies are applied
**When** a database session has `SET LOCAL app.current_tenant_id = 'tenant-A'`
**Then** a `SELECT * FROM users` query returns only rows where `tenant_id = 'tenant-A'`
**And** a query attempting to read `tenant-B` data returns zero rows (not an error)

**Given** a mutation is performed (INSERT/UPDATE/DELETE)
**When** the mutation completes
**Then** an `audit_log` entry is created with `actor_user_id`, `action`, `entity_type`, `entity_id`, and `before`/`after` JSON

**Given** TypeORM entities are defined
**When** the NestJS API starts
**Then** TypeORM entities for `Tenant`, `User`, and `AgentProfile` are correctly mapped to their tables with all indexes defined per the architecture

## Tasks / Subtasks

- [ ] Create Supabase migration for tenant schema (AC: 1, 2)
  - [ ] Create migration file with tenants table (id, name, branch, status, created_at, updated_at)
  - [ ] Create migration file with users table (id, tenant_id, email, role, name, created_at, updated_at)
  - [ ] Create migration file with agent_profiles table (id, tenant_id, user_id, working_hours JSONB, availability, created_at)
  - [ ] Create audit_log table (id, tenant_id, actor_user_id, action, entity_type, entity_id, before JSONB, after JSONB, created_at)
  - [ ] Add all necessary indexes for query performance

- [ ] Implement RLS policies for tenant isolation (AC: 2)
  - [ ] Enable RLS on users, agent_profiles, and audit_log tables
  - [ ] Create RLS policy for users table using app.current_tenant_id
  - [ ] Create RLS policy for agent_profiles table using app.current_tenant_id
  - [ ] Create RLS policy for audit_log table using app.current_tenant_id
  - [ ] Test RLS policies with manual SQL queries setting app.current_tenant_id

- [ ] Create TypeORM entities (AC: 4)
  - [ ] Create Tenant entity in packages/database/src/entities/tenant.entity.ts
  - [ ] Create User entity in packages/database/src/entities/user.entity.ts
  - [ ] Create AgentProfile entity in packages/database/src/entities/agent-profile.entity.ts
  - [ ] Create AuditLog entity in packages/database/src/entities/audit-log.entity.ts
  - [ ] Export all entities from packages/database/src/entities/index.ts
  - [ ] Configure TypeORM DataSource in packages/database/src/data-source.ts

- [ ] Implement audit logging trigger (AC: 3)
  - [ ] Create PostgreSQL trigger function for INSERT/UPDATE/DELETE on all tenant-scoped tables
  - [ ] Test trigger creates audit_log entries with correct before/after JSON
  - [ ] Verify trigger captures actor_user_id from app.current_user_id session variable

- [ ] Write comprehensive integration tests (AC: All)
  - [ ] Test: tenants table exists and has correct columns
  - [ ] Test: users table has tenant_id foreign key and RLS enabled
  - [ ] Test: agent_profiles table has tenant_id and user_id foreign keys
  - [ ] Test: RLS policy prevents cross-tenant data access
  - [ ] Test: audit_log entries created on INSERT/UPDATE/DELETE
  - [ ] Test: TypeORM entities can query database correctly
  - [ ] Test: All indexes exist and improve query performance

## Dev Notes

### Epic Context

**Epic 1: Tenant Authentication & Multi-Tenancy Foundation**

This is the foundation story for the entire multi-tenant system. Every subsequent story in this epic and all future epics depend on the database schema and RLS policies created here. The architecture mandates a defense-in-depth approach with THREE security layers:

1. **PostgreSQL RLS Policies** (Database Level) ← **THIS STORY**
2. **NestJS Tenant Context Interceptor** (Application Level) ← Story 1.2
3. **TypeORM Global Query Filters** (ORM Level) ← Story 1.2

This story implements Layer 1 - the database-level guarantee that prevents cross-tenant data leakage even if application code has bugs.

### Critical Architecture Requirements

**Multi-Tenancy Security Model (Defense-in-Depth):**

From `_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md:132-148`:

```sql
-- PostgreSQL RLS Policies (Layer 1 - THIS STORY)
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON conversations
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY role_based_access ON conversations
  USING (
    current_setting('app.current_user_role', true) = 'owner'
    OR tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );
```

**Key Implementation Rules:**

1. **Session Variables for RLS**: PostgreSQL session variables are set by the NestJS Tenant Context Interceptor (Story 1.2) using:
   - `app.current_tenant_id` - Current tenant UUID
   - `app.current_user_id` - Current user UUID (for audit logs)
   - `app.current_user_role` - Current user role (owner/manager/agent)

2. **ALL Tenant-Scoped Tables MUST**:
   - Have `tenant_id UUID NOT NULL` column (except `tenants` table itself)
   - Have RLS enabled: `ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;`
   - Have tenant isolation policy using `app.current_tenant_id`
   - Have proper indexes: `CREATE INDEX idx_<table>_tenant ON <table>(tenant_id);`

3. **Audit Logging Requirements**:
   - ALL mutations (INSERT/UPDATE/DELETE) MUST create audit_log entry
   - Use PostgreSQL triggers (not application code) for guaranteed auditing
   - Capture `before` and `after` state as JSONB
   - Store `actor_user_id` from `app.current_user_id` session variable

### Database Schema Design

**Table: tenants**

```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  branch VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tenants_status ON tenants(status);
```

**NO RLS on tenants table** - it's the root of tenant hierarchy.

**Table: users**

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'manager', 'agent')),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(tenant_id, role);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_tenant_isolation ON users
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
```

**Table: agent_profiles**

```sql
CREATE TABLE agent_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  working_hours JSONB DEFAULT '{}',
  availability BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);

CREATE INDEX idx_agent_profiles_tenant ON agent_profiles(tenant_id);
CREATE INDEX idx_agent_profiles_user ON agent_profiles(user_id);
CREATE INDEX idx_agent_profiles_availability ON agent_profiles(tenant_id, availability);

ALTER TABLE agent_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY agent_profiles_tenant_isolation ON agent_profiles
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
```

**Table: audit_log**

```sql
CREATE TABLE audit_log (
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

CREATE INDEX idx_audit_log_tenant ON audit_log(tenant_id, created_at DESC);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_actor ON audit_log(actor_user_id, created_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_log_tenant_isolation ON audit_log
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
```

### Audit Logging Trigger Function

From `_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md:132-148`, implement a generic trigger function:

```sql
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
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
      current_setting('app.current_user_id', true)::uuid,
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
      current_setting('app.current_user_id', true)::uuid,
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
      current_setting('app.current_user_id', true)::uuid,
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

-- Apply to all tenant-scoped tables
CREATE TRIGGER audit_users AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_agent_profiles AFTER INSERT OR UPDATE OR DELETE ON agent_profiles
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
```

### TypeORM Entity Patterns

**Technology Stack:**
- TypeORM version: Latest stable (to be determined during implementation)
- Node.js: 20.x (from Story 0.1)
- TypeScript: Strict mode enabled
- Database: PostgreSQL via Supabase

**Entity Location:**
- Package: `packages/database/src/entities/`
- Pattern: Each entity in separate file, export from index.ts
- Shared across NestJS API and future services

**Example Entity (Tenant):**

```typescript
// packages/database/src/entities/tenant.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { AgentProfile } from './agent-profile.entity';

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  branch: string;

  @Column({ type: 'varchar', length: 50, default: 'active' })
  status: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  // Relations
  @OneToMany(() => User, user => user.tenant)
  users: User[];

  @OneToMany(() => AgentProfile, profile => profile.tenant)
  agent_profiles: AgentProfile[];
}
```

**Example Entity (User) with RLS:**

```typescript
// packages/database/src/entities/user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { Tenant } from './tenant.entity';
import { AgentProfile } from './agent-profile.entity';

@Entity('users')
@Index(['tenant_id'])
@Index(['email'])
@Index(['tenant_id', 'role'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  tenant_id: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 50 })
  role: 'owner' | 'manager' | 'agent';

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  // Relations
  @ManyToOne(() => Tenant, tenant => tenant.users)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @OneToMany(() => AgentProfile, profile => profile.user)
  agent_profiles: AgentProfile[];
}
```

### TypeORM DataSource Configuration

**File:** `packages/database/src/data-source.ts`

From `_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md:263-279`:

```typescript
import { DataSource } from 'typeorm';
import * as entities from './entities';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '54322'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'postgres',
  entities: Object.values(entities),
  synchronize: false, // NEVER true in production - use migrations
  logging: process.env.NODE_ENV === 'development',
  extra: {
    max: 25,              // Maximum connections in pool
    min: 5,               // Minimum connections always open
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
});
```

### Migration Strategy

**Hybrid Approach (from Architecture):**
- **Supabase migrations** for RLS policies (SQL files in `supabase/migrations/`)
- **TypeORM migrations** for schema changes in future stories

**For this story:**
1. Create Supabase migration file: `supabase/migrations/<timestamp>_tenant_auth_schema.sql`
2. Include ALL tables, indexes, RLS policies, and triggers in ONE migration file
3. Run with `npx supabase db push` to apply to local database
4. TypeORM entities will map to existing tables (no TypeORM migrations needed yet)

### Testing Strategy

**Integration Tests Required:**

Use Jest + Supabase local database for integration tests:

```bash
# Start Supabase local
npx supabase start

# Run integration tests
pnpm test:integration

# Stop Supabase
npx supabase stop
```

**Test Files:**
- `packages/database/src/__tests__/tenant-schema.test.ts` - Schema validation
- `packages/database/src/__tests__/rls-policies.test.ts` - RLS isolation tests
- `packages/database/src/__tests__/audit-logging.test.ts` - Trigger tests
- `packages/database/src/__tests__/typeorm-entities.test.ts` - Entity mapping tests

**Critical Test Cases:**

1. **Schema Validation:**
   - Tables exist with correct columns
   - Foreign keys enforced
   - Unique constraints work
   - Indexes exist

2. **RLS Policy Tests:**
   - Set `app.current_tenant_id = 'tenant-A'`
   - Insert data for tenant-A and tenant-B
   - Query as tenant-A → only see tenant-A data
   - Query as tenant-B → only see tenant-B data
   - Attempt UPDATE on tenant-B data as tenant-A → no effect

3. **Audit Logging Tests:**
   - INSERT a user → audit_log has entry with action='INSERT', after={...}
   - UPDATE a user → audit_log has entry with before={...}, after={...}
   - DELETE a user → audit_log has entry with before={...}
   - Verify actor_user_id captured from session variable

4. **TypeORM Entity Tests:**
   - AppDataSource.initialize() succeeds
   - Can query tenants using TypeORM repository
   - Can create user with tenant relation
   - Can query users with eager-loaded tenant relation

### Known Issues from Previous Stories

**From Story 0.2 (Docker Setup):**

1. **Supabase runs on host, not in Docker Compose**
   - Apps connect via `host.docker.internal:54322` (macOS/Windows)
   - Apps connect via `172.17.0.1:54322` (Linux)
   - Environment variable: `DATABASE_URL=postgresql://postgres:postgres@host.docker.internal:54322/postgres`

2. **Supabase local stack ports:**
   - PostgreSQL: 54322
   - Supabase Studio: 54323
   - Auth API: 54321

3. **Migration commands:**
   - `npx supabase start` - Start local Supabase stack
   - `npx supabase db push` - Apply migrations from `supabase/migrations/`
   - `npx supabase db reset` - Reset database and reapply all migrations

**From Story 0.1 (Monorepo Setup):**

1. **Package imports:**
   - Turborepo workspace: `@drive-insight/database`
   - Import entities: `import { Tenant, User } from '@drive-insight/database';`
   - Must be configured in NestJS app.module.ts imports

2. **TypeScript strict mode:**
   - All entities must have proper types
   - No `any` types allowed
   - Nullable columns must use `nullable: true` in TypeORM decorator

### Project Structure (Updated)

```
/Users/trinesh.chettyoldmutual.com/work/Project_Vault/trinstel-auto-ai/
├── supabase/
│   ├── migrations/
│   │   ├── 20260221000001_initial_tenant_schema.sql  # From Story 0.2 (outdated)
│   │   └── <timestamp>_tenant_auth_schema.sql         # ← CREATE IN THIS STORY
│   └── config.toml
├── packages/
│   └── database/
│       ├── src/
│       │   ├── entities/
│       │   │   ├── tenant.entity.ts                   # ← CREATE
│       │   │   ├── user.entity.ts                     # ← CREATE
│       │   │   ├── agent-profile.entity.ts            # ← CREATE
│       │   │   ├── audit-log.entity.ts                # ← CREATE
│       │   │   └── index.ts                           # ← CREATE (export all)
│       │   ├── __tests__/
│       │   │   ├── tenant-schema.test.ts              # ← CREATE
│       │   │   ├── rls-policies.test.ts               # ← CREATE
│       │   │   ├── audit-logging.test.ts              # ← CREATE
│       │   │   └── typeorm-entities.test.ts           # ← CREATE
│       │   ├── data-source.ts                         # ← CREATE
│       │   ├── client.ts                              # Exists (Supabase client stub)
│       │   └── index.ts                               # ← UPDATE (export entities)
│       ├── package.json                               # ← UPDATE (add typeorm, pg)
│       └── tsconfig.json
└── apps/
    └── api/
        └── src/
            └── app.module.ts                          # ← UPDATE (import TypeORM)
```

### Dependencies to Add

**Package:** `packages/database/package.json`

```json
{
  "dependencies": {
    "typeorm": "^0.3.20",
    "pg": "^8.13.1",
    "@types/pg": "^8.11.10"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "@types/jest": "^29.5.14"
  }
}
```

**NestJS API:** `apps/api/package.json` (already has @nestjs/typeorm)

From Story 0.1, NestJS package.json already includes:
- `@nestjs/typeorm: ^10.0.3`
- These are already available, no new dependencies needed for API

### Web Research - Latest TypeORM Best Practices (February 2026)

**TypeORM 0.3.x Breaking Changes:**
- `synchronize: true` is DEPRECATED in production - always use migrations
- Connection API deprecated - use DataSource API
- Eager loading requires explicit `relations` in find queries
- `@JoinColumn` required on ManyToOne owner side

**PostgreSQL UUID Generation:**
- Use `gen_random_uuid()` instead of `uuid_generate_v4()` (no extension required)
- Available by default in PostgreSQL 13+

**RLS Best Practices:**
- Always use `current_setting('var', true)::uuid` with TRUE flag to avoid errors when variable not set
- Test RLS with multiple session variables in parallel transactions
- Use `SELECT set_config('app.current_tenant_id', 'uuid-value', true)` for transaction-local variables

**Connection Pooling:**
- Default pool size: 10 connections
- Recommended for multi-tenant: 25 max, 5 min (as per architecture)
- Always set connection timeout to prevent hanging requests

### Acceptance Criteria Mapping

**AC1: Tables exist with tenant_id and RLS enabled**
- Migration creates all 4 tables ✅
- RLS enabled on users, agent_profiles, audit_log ✅
- tenant_id column on all tenant-scoped tables ✅
- Tests validate schema structure ✅

**AC2: RLS policies enforce tenant isolation**
- Policies created using app.current_tenant_id ✅
- Tests verify cross-tenant queries return zero rows ✅
- Tests verify same-tenant queries return correct data ✅

**AC3: Audit logging on mutations**
- Trigger function captures INSERT/UPDATE/DELETE ✅
- before/after JSON stored in audit_log ✅
- actor_user_id from app.current_user_id session variable ✅
- Tests verify audit_log entries created ✅

**AC4: TypeORM entities map correctly**
- Entities defined with proper decorators ✅
- DataSource configured with connection pool ✅
- NestJS API imports TypeORM module ✅
- Tests verify entities can query database ✅

### References

**Epic Source:**
- File: `_bmad-output/planning-artifacts/epics/epic-1-tenant-authentication-multi-tenancy-foundation.md`
- Story 1.1: Lines 5-31

**Architecture Source:**
- File: `_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md`
- RLS Policies: Lines 132-148
- Connection Pooling: Lines 263-279
- Database Indexes: Lines 576-607

**Project Context:**
- File: `_bmad-output/project-context.md`
- Currently empty - will be populated after this story's learnings

**Previous Story:**
- File: `_bmad-output/implementation-artifacts/0-2-local-development-environment-docker-compose.md`
- Docker setup: Lines 1-740
- Supabase configuration: Lines 86-92
- Database connection: Lines 217, 318-319

## Dev Agent Record

### Agent Model Used

_To be filled by dev agent during implementation_

### Debug Log References

_To be filled by dev agent during implementation_

### Completion Notes List

_To be filled by dev agent during implementation_

### File List

_To be filled by dev agent during implementation_
