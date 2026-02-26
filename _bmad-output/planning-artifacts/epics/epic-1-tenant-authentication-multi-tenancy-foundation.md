# Epic 1: Tenant Authentication & Multi-Tenancy Foundation

Dealership staff can securely log in to their branch's isolated workspace. Owners can invite managers and agents. No tenant can see another tenant's data.

## Story 1.1: Tenant Database Schema & RLS Policies

As a platform engineer,
I want the core tenant, user, and agent_profile tables created with RLS policies enforcing tenant isolation,
So that every subsequent feature is built on a foundation that makes cross-tenant data leakage architecturally impossible.

**Acceptance Criteria:**

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

---

## Story 1.2: Tenant User Authentication (Login / Session)

As a dealership staff member (owner, manager, or agent),
I want to log in with my email and password and receive a session,
So that I can access my dealership's Drive Insight workspace.

**Acceptance Criteria:**

**Given** a user with valid credentials exists in Supabase Auth
**When** they POST to `/api/auth/login` with correct email and password
**Then** they receive a Supabase JWT containing `tenant_id`, `role`, and `user_id` as custom claims
**And** the JWT is valid for 1 hour

**Given** a user submits incorrect credentials
**When** they POST to `/api/auth/login`
**Then** the API returns HTTP 401 with message "Invalid credentials"
**And** no JWT is issued

**Given** a valid JWT is presented to any protected API endpoint
**When** the NestJS `SupabaseAuthGuard` processes the request
**Then** `request.user` is populated with `{ id, tenant_id, role, email }`
**And** the `TenantContextInterceptor` sets `SET LOCAL app.current_tenant_id` and `app.current_user_role` for the request's database transaction

**Given** a JWT from tenant A is used to request data
**When** the request reaches the database
**Then** RLS policies ensure only tenant A data is returned, regardless of query parameters

---

## Story 1.3: Role-Based Access Control (Owner / Manager / Agent)

As a dealership owner,
I want to control what managers and agents can access,
So that agents cannot change routing rules or view analytics they shouldn't see.

**Acceptance Criteria:**

**Given** a user with role `agent` is authenticated
**When** they attempt to POST `/api/users` (create user — owner/manager only)
**Then** the API returns HTTP 403 Forbidden

**Given** a user with role `owner` or `manager` is authenticated
**When** they POST `/api/users` with valid data
**Then** the user is created and HTTP 201 is returned

**Given** a user with role `agent` is authenticated
**When** they GET `/api/leads?assigned_to=me`
**Then** they receive only leads assigned to their user ID
**And** they cannot see leads assigned to other agents

**Given** the `@Roles('owner', 'manager')` decorator is applied to a controller method
**When** an `agent` role user calls that endpoint
**Then** the `RolesGuard` returns HTTP 403 before the handler executes

---

## Story 1.4: User Invitation & Profile Management

As a dealership owner or manager,
I want to invite new staff members by email and manage their profiles,
So that my team can access the system with the correct roles and availability settings.

**Acceptance Criteria:**

**Given** an owner is authenticated
**When** they POST `/api/users/invite` with `{ email, role: 'agent', name }`
**Then** Supabase Auth creates the user with a temporary password
**And** a welcome email is sent via Resend with login credentials
**And** the user record is created in the `users` table with the correct `tenant_id` and `role`

**Given** a new user logs in for the first time
**When** they complete the forced password change
**Then** their account status updates to `active`

**Given** an owner is authenticated
**When** they PATCH `/api/users/:id` with `{ working_hours, availability }`
**Then** the `agent_profiles` record is updated for that user
**And** the updated working hours are available for routing rule evaluation

**Given** an owner is authenticated
**When** they DELETE `/api/users/:id`
**Then** the user's Supabase Auth account is disabled (not deleted)
**And** the user's leads are unassigned (not deleted)

---
