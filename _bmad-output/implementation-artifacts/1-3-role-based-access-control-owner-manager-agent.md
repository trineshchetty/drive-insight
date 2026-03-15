# Story 1.3: Role-Based Access Control (Owner / Manager / Agent)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a dealership owner,
I want to control what managers and agents can access,
So that agents cannot change routing rules or view analytics they shouldn't see.

## Acceptance Criteria

**Given** a user with role `agent` is authenticated
**When** they attempt to POST `/api/users` (create user — owner/manager only)
**Then** the API returns HTTP 403 Forbidden

**Given** a user with role `owner` or `manager` is authenticated
**When** they POST `/api/users` with valid data
**Then** the user is created and HTTP 201 is returned

**Given** a user with role `agent` is authenticated
**When** they GET `/api/users`
**Then** they receive only their own user record
**And** they cannot see other users in the same tenant

**Given** the `@Roles('owner', 'manager')` decorator is applied to a controller method
**When** an `agent` role user calls that endpoint
**Then** the `RolesGuard` returns HTTP 403 before the handler executes

## Tasks / Subtasks

- [x] Create RolesGuard for RBAC enforcement (AC: 1, 2, 4)
  - [x] Create guard in apps/api/src/common/guards/roles.guard.ts
  - [x] Inject Reflector to read @Roles() metadata
  - [x] Extract user.role from request.user (set by SupabaseAuthGuard)
  - [x] Compare user.role against required roles from decorator
  - [x] Return true if role matches, throw ForbiddenException if not
  - [x] Handle case where no roles required (allow all authenticated users)

- [x] Create @Roles() decorator for role restrictions (AC: 1, 2, 4)
  - [x] Create decorator in apps/api/src/common/decorators/roles.decorator.ts
  - [x] Use SetMetadata to attach roles array to route handler
  - [x] Export ROLES_KEY constant for RolesGuard
  - [x] Support multiple roles: @Roles('owner', 'manager')

- [x] Register RolesGuard globally after SupabaseAuthGuard (AC: All)
  - [x] Add RolesGuard as second APP_GUARD in app.module.ts
  - [x] Ensure execution order: SupabaseAuthGuard → RolesGuard
  - [x] RolesGuard should run after authentication guard
  - [x] Verify guards don't conflict with @Public() decorator

- [x] Create AsyncLocalStorage context for request-scoped data (AC: 3)
  - [x] Create RequestContext class in apps/api/src/common/context/request-context.ts
  - [x] Use Node.js AsyncLocalStorage to store request-scoped user data
  - [x] Set context in TenantContextInterceptor (already exists from Story 1.2)
  - [x] Store: userId, tenantId, role for downstream data-access layers
  - [x] Provide getters: getCurrentUserId(), getCurrentRole(), getCurrentTenantId()

- [x] Apply @Roles() decorator to protected endpoints (AC: 1, 2)
  - [x] Add @Roles('owner', 'manager') to POST /api/users (user creation)
  - [x] Add @Roles('owner') to DELETE /api/users/:id (user deletion)
  - [x] Add @Roles('owner', 'manager') to PATCH /api/users/:id (profile updates)
  - [x] Document which endpoints require which roles in Swagger
  - [x] Test that agents get 403 when accessing owner/manager-only endpoints

- [x] Fix tenant-scoped user creation and validation (AC: 2)
  - [x] Add DTO validation for create/update user payloads
  - [x] Set `tenant_id` server-side from authenticated request context
  - [x] Keep all writes on the interceptor-managed QueryRunner

- [x] Add RLS policies for role-based data access on existing Story 1.3 tables (AC: 3)
  - [x] Create migration: supabase/migrations/[timestamp]_role_based_rls_policies.sql
  - [x] Add RLS policy for users: agents cannot read other users' profiles
  - [x] Add RLS policy for agent_profiles: agents can only read their own profile
  - [x] Policy should check app.current_user_role and app.current_user_id
  - [x] Owner/manager roles bypass agent restrictions (see all tenant data)
  - [x] Scope future leads/conversations/bookings policies to the migrations that introduce those tables

- [x] Create real endpoint and database tests for RBAC/RLS (AC: All)
  - [x] Test: Agent cannot POST /api/users (403 Forbidden)
  - [x] Test: Owner can POST /api/users (201 Created)
  - [x] Test: Manager can POST /api/users (201 Created)
  - [x] Test: Agent GET /api/users returns only the authenticated agent
  - [x] Test: Owner/manager GET /api/users returns same-tenant users only
  - [x] Test: RolesGuard throws 403 when required role not met
  - [x] Test: Invalid auth context without a role claim returns 401
  - [x] Test: Database RLS restricts `users` and `agent_profiles` by role

- [x] Update TenantContextInterceptor to set role in AsyncLocalStorage (AC: 3)
  - [x] Modify existing TenantContextInterceptor from Story 1.2
  - [x] After setting PostgreSQL session variables, also set AsyncLocalStorage context
  - [x] Use parameterized `set_config` calls for PostgreSQL session variables
  - [x] Ensure context is cleared after request completes (in finally block)
  - [x] Add error handling for missing user.role

## Dev Notes

### Epic Context

Story 1.3 is now explicitly scoped to the RBAC and role-based RLS work that can be delivered against the tables and endpoints already present in Epic 1.

Delivered in this story:

1. Endpoint-level role enforcement for `/api/users`
2. Tenant-scoped user creation, update, delete, and list behavior
3. Request-scoped role context via `RequestContext`
4. Role-based RLS for existing tables: `users` and `agent_profiles`
5. Real HTTP and database verification for the behavior above

Deferred to later stories:

1. `leads`, `conversations`, and `bookings` role-based access rules
2. Any ORM subscriber or global query-filter activation tied to those later entities
3. `/api/leads` acceptance criteria and endpoint behavior

### Implementation Notes

1. `RolesGuard` remains the enforcement mechanism for controller-level access checks, with `SupabaseAuthGuard` executing first and populating `request.user`.
2. `TenantContextInterceptor` now validates `user.id`, `user.tenant_id`, and `user.role` before setting PostgreSQL session variables and request context.
3. `UsersController` and `UsersService` now use DTO validation and assign `tenant_id` server-side from the authenticated request context.
4. Story 1.3 role-based RLS is intentionally limited to `users` and `agent_profiles`; future entity policies must be created alongside those schema migrations.
5. `RequestContext` stays in place as future infrastructure for downstream data-access layers, but Story 1.3 no longer claims active ORM subscriber filtering.

### Verification

- `pnpm --filter @drive-insight/api build`
- `pnpm --filter @drive-insight/api test -- --runInBand __tests__/rbac`
- `pnpm --filter @drive-insight/database test -- --runInBand role-based-rls.test.ts`

### References

- Epic source: `_bmad-output/planning-artifacts/epics/epic-1-tenant-authentication-multi-tenancy-foundation.md`
- Review trail: `docs/code-reviews/1-3-role-based-access-control-owner-manager-agent-review.md`
- Related stories:
  - `_bmad-output/implementation-artifacts/1-1-tenant-database-schema-rls-policies.md`
  - `_bmad-output/implementation-artifacts/1-2-tenant-user-authentication-login-session.md`

## Dev Agent Record

### Agent Model Used

Codex (GPT-5)

### Debug Log References

- Review trail: `docs/code-reviews/1-3-role-based-access-control-owner-manager-agent-review.md`

### Completion Notes List

1. Review findings from `2026-03-08` were addressed before closing the story.
2. `POST /api/users` now uses validated DTOs and assigns `tenant_id` from authenticated request context instead of trusting caller input.
3. `TenantContextInterceptor` now rejects malformed auth context with `401 Unauthorized` and uses parameterized `set_config` calls when preparing RLS session state.
4. Placeholder RBAC tests were replaced with real Supertest coverage for agent, owner, and manager behavior on `/api/users`.
5. Database-level verification was added for role-based RLS on `users` and `agent_profiles`.
6. Story 1.3 is formally re-scoped away from leads/conversations/bookings. Those access rules must be implemented in the stories that introduce those tables and endpoints.
7. Focused verification passed:
   - `pnpm --filter @drive-insight/api build`
   - `pnpm --filter @drive-insight/api test -- --runInBand __tests__/rbac`
   - `pnpm --filter @drive-insight/database test -- --runInBand role-based-rls.test.ts`

### File List

**Created:**
- `apps/api/src/common/guards/roles.guard.ts`
- `apps/api/src/common/decorators/roles.decorator.ts`
- `apps/api/src/common/context/request-context.ts`
- `apps/api/src/modules/users/dto/create-user.dto.ts`
- `apps/api/src/modules/users/dto/update-user.dto.ts`
- `supabase/migrations/20260303000001_role_based_rls_policies.sql`
- `apps/api/src/__tests__/rbac/roles-guard.spec.ts`
- `apps/api/src/__tests__/rbac/request-context.spec.ts`
- `apps/api/src/__tests__/rbac/rbac-test.utils.ts`
- `apps/api/src/__tests__/rbac/agent-access.spec.ts`
- `apps/api/src/__tests__/rbac/owner-manager-access.spec.ts`
- `packages/database/src/__tests__/role-based-rls.test.ts`

**Modified:**
- `apps/api/src/app.module.ts` - Registered RolesGuard globally
- `apps/api/src/common/interceptors/tenant-context.interceptor.ts` - Added auth-context validation and parameterized RLS session setup
- `apps/api/src/modules/users/users.controller.ts` - Added DTO-backed user endpoints with role enforcement
- `apps/api/src/modules/users/users.service.ts` - Set tenant scope server-side for user writes
- `packages/database/src/data-source.ts` - Removed inactive subscriber registration from the shared data source
- `docs/code-reviews/1-3-role-based-access-control-owner-manager-agent-review.md` - Review trail and resolution notes
- `_bmad-output/planning-artifacts/epics/epic-1-tenant-authentication-multi-tenancy-foundation.md` - Re-scoped Story 1.3 acceptance criteria to existing Epic 1 entities
- `_bmad-output/implementation-artifacts/sprint-status.yaml` - Marked Story 1.3 done after verification

**Test Results:**
- API build passed
- RBAC test suites passed
- Database role-based RLS tests passed
