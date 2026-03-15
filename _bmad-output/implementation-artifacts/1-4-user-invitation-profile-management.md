# Story 1.4: User Invitation & Profile Management

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a dealership owner or manager,
I want to invite new staff members by email and manage their profiles,
so that my team can access the system with the correct roles and availability settings.

## Acceptance Criteria

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

## Tasks / Subtasks

- [x] Extend the tenant user lifecycle model for invitations, activation, and disablement (AC: 2, 4)
  - [x] Add a Supabase migration for `users` lifecycle fields needed by this story, at minimum a persisted account status and first-login/password-change state
  - [x] Update the shared `User` entity and any exported DTO/types that surface user state
  - [x] Preserve the corrected RLS policy shape from the latest UUID-casting fixes; do not reintroduce `FOR ALL` write policies or raw `current_setting(... )::uuid` casts

- [x] Add a dedicated invite flow on top of the existing users module (AC: 1)
  - [x] Add `POST /api/users/invite` in `apps/api/src/modules/users/users.controller.ts` rather than overloading the existing `POST /api/users` path
  - [x] Create an invite DTO that validates `email`, `name`, and `role`
  - [x] Keep tenant scoping server-side from `req.user.tenant_id`; never accept `tenant_id` from the request body
  - [x] Reuse the existing RBAC pattern (`@Roles(...)` + global guards) and make the invite permission explicit instead of burying it inside service code
  - [x] Handle duplicate invite attempts deterministically for existing same-tenant users and existing Supabase Auth accounts; do not leave the conflict path undefined

- [x] Introduce a server-only Supabase admin path and Resend-backed invite delivery (AC: 1)
  - [x] Add a dedicated Supabase admin client/service that uses `SUPABASE_SERVICE_ROLE_KEY`; do not reuse the anon login client for admin actions
  - [x] Generate temporary credentials or an invite-compatible first-login payload that matches the acceptance criteria
  - [x] Create the Supabase Auth user, persist the matching `users` row inside the request-scoped `QueryRunner`, and avoid leaving orphaned auth users or DB rows on failure
  - [x] Add a transactional email service/provider abstraction for Resend and send the welcome email only after the invite flow has enough state to recover safely from downstream errors
  - [x] Never persist or log raw temporary passwords in the local database, audit trail, or application logs

- [x] Implement first-login password change completion and activation update (AC: 2)
  - [x] Add an authenticated auth endpoint for completing the required password change
  - [x] Update login responses and/or user payloads so clients can detect `must_change_password` / invited state
  - [x] On successful password change, clear the forced-change state and move the persisted account status to `active`
  - [x] Keep the design compatible with the current custom-JWT architecture, which does not expose a raw Supabase session token to backend handlers

- [x] Extend profile management to update `agent_profiles` in a routing-safe shape (AC: 3)
  - [x] Expand the update DTO so `PATCH /api/users/:id` can validate `working_hours` and `availability`
  - [x] Upsert the user’s `agent_profiles` row through `req.queryRunner` instead of writing outside the interceptor-managed transaction
  - [x] Define and document a canonical `working_hours` JSON shape that future routing stories can consume without reinterpretation
  - [x] Keep agent profile writes tenant-scoped and role-aware; do not create ad hoc tables or side stores for availability

- [x] Replace hard delete semantics with deactivation semantics (AC: 4)
  - [x] Change `DELETE /api/users/:id` from TypeORM hard delete to a disable flow that preserves auditability
  - [x] Disable the Supabase Auth account instead of deleting it
  - [x] Persist the local user state as disabled/deactivated instead of removing the `users` row
  - [x] Do not invent an early `leads` schema in this story; if lead entities still do not exist at implementation time, surface the dependency explicitly instead of falsely claiming unassignment is complete

- [x] Add regression coverage for invitation, profile updates, and deactivation (AC: 1, 2, 3, 4)
  - [x] Add Supertest integration coverage using the existing RBAC/auth test harness
  - [x] Test owner/manager/agent permissions for invite, update, and deactivate flows according to the final RBAC decision used in this story
  - [x] Test first-login password-change completion and account activation state transitions
  - [x] Test cross-tenant isolation and any new `agent_profiles` access behavior under RLS
  - [x] Mock or stub outbound email delivery cleanly while still verifying the invite flow reaches the mail provider boundary

## Dev Notes

### Epic Context

Story 1.4 is the final Epic 1 story that turns the existing tenant/auth/RBAC foundation into a usable staff-management flow. It must extend the security model delivered in Stories 1.1 to 1.3 instead of bypassing it: tenant isolation remains enforced by PostgreSQL RLS, NestJS guards, and the request-scoped tenant context interceptor. [Source: _bmad-output/planning-artifacts/epics/epic-1-tenant-authentication-multi-tenancy-foundation.md]

This story depends directly on the schema from Story 1.1 (`users`, `agent_profiles`), the login and JWT claim flow from Story 1.2, and the role enforcement and request context patterns from Story 1.3. Reuse those foundations rather than introducing parallel auth or user-management flows. [Source: _bmad-output/implementation-artifacts/1-1-tenant-database-schema-rls-policies.md] [Source: _bmad-output/implementation-artifacts/1-2-tenant-user-authentication-login-session.md] [Source: _bmad-output/implementation-artifacts/1-3-role-based-access-control-owner-manager-agent.md]

### Current Codebase Baseline

The current `users` module only supports tenant-scoped row CRUD in the application database. `POST /api/users` inserts a DB row, `PATCH /api/users/:id` updates the `users` row only, and `DELETE /api/users/:id` hard deletes the local record. There is no invite endpoint, no activation lifecycle, no Supabase admin client, and no email provider integration yet. [Source: apps/api/src/modules/users/users.controller.ts] [Source: apps/api/src/modules/users/users.service.ts] [Source: apps/api/src/modules/auth/supabase.service.ts]

The current auth surface only exposes `POST /api/auth/login`. Story 1.4 therefore requires net-new authenticated behavior for completing first-login password change and for surfacing user lifecycle state back to clients. [Source: apps/api/src/modules/auth/auth.controller.ts] [Source: apps/api/src/modules/auth/auth.service.ts]

The existing schema is missing lifecycle fields required by this story. `users` currently stores `tenant_id`, `email`, `role`, `name`, and timestamps only; `agent_profiles` already stores `working_hours` and `availability`. Invitation state, activation state, and disablement must be introduced with a migration and then reflected in shared entities/types. [Source: packages/database/src/entities/user.entity.ts] [Source: packages/database/src/entities/agent-profile.entity.ts]

### Scope Guardrails

Implement this story on the tenant application path only: `apps/api` plus `apps/web`. Do not route this through `apps/admin`, which is reserved for cross-tenant superuser operations and uses a different trust model. [Source: _bmad-output/planning-artifacts/architecture/core-architectural-decisions.md#Superuser Administration Layer]

Do not fabricate missing Epic 2 or Epic 3 infrastructure just to satisfy future-facing acceptance language. The codebase currently has no `leads` entity, lead assignment module, or lead table, so the "unassign leads" requirement must be treated as a dependency to stage explicitly unless those artifacts are introduced during implementation. [Source: _bmad-output/planning-artifacts/epics/requirements-inventory.md] [Source: apps/api/src/modules] [Source: packages/database/src/entities]

The acceptance criteria are stricter than the story summary: the summary says "owner or manager," but each acceptance criterion is written for an authenticated owner. Unless product direction is clarified during implementation, prefer the stricter AC wording for invite, profile update, and deactivate operations and document the decision in code/tests. [Source: _bmad-output/planning-artifacts/epics/epic-1-tenant-authentication-multi-tenancy-foundation.md]

### Technical Requirements

1. Add a dedicated action endpoint for invitation: `POST /api/users/invite`. Keep the existing resource-style `POST /api/users` behavior separate; invitation now has external side effects and lifecycle semantics that exceed simple row creation. [Source: apps/api/src/modules/users/users.controller.ts] [Source: _bmad-output/planning-artifacts/architecture/core-architectural-decisions.md]

2. Add an authenticated first-login completion path under the existing auth module. The repo currently has login only, so story completion requires a new endpoint and service flow for password-change completion plus lifecycle-state activation. [Source: apps/api/src/modules/auth/auth.controller.ts] [Source: apps/api/src/modules/auth/auth.service.ts]

3. Introduce persisted lifecycle fields on `users` before implementing invite and disable behavior. At minimum, the story needs a durable account status and an explicit invited/forced-password-change signal that can survive logout/login and be returned to clients. This is an implementation requirement, not an optional refactor. [Source: packages/database/src/entities/user.entity.ts]

4. All tenant-scoped database writes must continue to run through `req.queryRunner` from `TenantContextInterceptor`. Do not create repositories or service-role database writes that bypass the request transaction, RLS session variables, or audit triggers. [Source: apps/api/src/common/interceptors/tenant-context.interceptor.ts] [Source: apps/api/src/modules/users/users.service.ts]

5. Use a separate Supabase admin client only for Auth admin operations such as creating or disabling auth users. Do not reuse the existing anon-key login client for invite/deactivate workflows, and do not use the service-role client for tenant-scoped application data queries. [Source: apps/api/src/modules/auth/supabase.service.ts] [Source: apps/api/src/__tests__/auth/auth.integration.spec.ts]

6. Keep `tenant_id` fully server-derived. Invite, update, and deactivate handlers must derive tenant scope from authenticated request context and ignore any caller-provided tenant identifier. That was a deliberate Story 1.3 correction and must remain true here. [Source: apps/api/src/modules/users/users.controller.ts] [Source: _bmad-output/implementation-artifacts/1-3-role-based-access-control-owner-manager-agent.md]

7. Extend `PATCH /api/users/:id` to manage both the `users` row and `agent_profiles` row. `working_hours` and `availability` belong in `agent_profiles`; do not push those fields into the `users` table. Upsert the profile record when absent. [Source: packages/database/src/entities/agent-profile.entity.ts] [Source: apps/api/src/modules/users/dto/update-user.dto.ts]

8. Define a canonical `working_hours` payload and share it through code, not prose alone. The architecture direction is shared validation/types across frontend and backend; add the shape to `packages/types` and validate it in the API instead of accepting arbitrary JSON blobs. This requirement is an implementation inference from the architecture and current placeholder types. [Source: packages/types/src/index.ts] [Source: packages/types/src/schemas/index.ts] [Source: _bmad-output/planning-artifacts/architecture/core-architectural-decisions.md]

9. Replace hard delete semantics with deactivation semantics. `DELETE /api/users/:id` must stop removing the local record and instead:
   - disable the Supabase Auth account,
   - persist the local lifecycle state as disabled/deactivated,
   - preserve auditability and tenant ownership,
   - avoid claiming lead unassignment unless lead infrastructure exists by implementation time.
   [Source: apps/api/src/modules/users/users.service.ts] [Source: _bmad-output/planning-artifacts/epics/epic-1-tenant-authentication-multi-tenancy-foundation.md]

10. Treat invite flow failures as a consistency problem, not a happy-path CRUD issue. The implementation must prevent or reconcile split-brain states such as:
   - auth user created but DB row missing,
   - DB row inserted but welcome email failed,
   - user disabled in DB but still active in Supabase Auth.
   Compensating actions or explicit recovery logging are required. [Source: _bmad-output/planning-artifacts/architecture/project-context-analysis.md]

11. `AuthService.login()` must become lifecycle-aware once Story 1.4 fields exist. At minimum, it should:
   - refuse disabled users,
   - return invited / password-change-required state for first-login users,
   - avoid issuing a normal "active" experience for accounts that have not completed the required password change.
   [Source: apps/api/src/modules/auth/auth.service.ts]

12. Treat environment/config updates as part of the implementation, not as tribal knowledge. Story 1.4 will require:
   - documenting any new Resend environment variables in `.env.example`,
   - keeping `SUPABASE_SERVICE_ROLE_KEY` server-only,
   - updating any module bootstrap/config code needed for mail provider initialization.
   [Source: .env.example] [Source: apps/api/src/modules/auth/supabase.service.ts]

13. Prevent tenant lockout during deactivate flows. Story 1.4 should not allow the last active owner in a tenant to be disabled without an explicit replacement/transfer path, and should also guard against self-deactivation edge cases that would strand the current session. This is an implementation safety requirement inferred from the role model and tenant-scoped auth design. [Source: _bmad-output/planning-artifacts/epics/requirements-inventory.md] [Source: apps/api/src/modules/users/users.service.ts]

### Architecture Compliance

1. Preserve the current execution pipeline for protected tenant routes:
   - `SupabaseAuthGuard` authenticates and sets `request.user`
   - `RolesGuard` enforces `@Roles(...)`
   - `TenantContextInterceptor` opens the request transaction, sets PostgreSQL session variables, and attaches `req.queryRunner`
   Story 1.4 handlers must plug into that pipeline rather than adding bespoke middleware or request context. [Source: apps/api/src/common/guards/supabase-auth.guard.ts] [Source: apps/api/src/common/guards/roles.guard.ts] [Source: apps/api/src/common/interceptors/tenant-context.interceptor.ts]

2. Continue using the existing NestJS module boundaries:
   - tenant auth logic in `apps/api/src/modules/auth`
   - tenant user/profile lifecycle in `apps/api/src/modules/users`
   - shared entities in `packages/database`
   - shared DTO/schema types in `packages/types`
   Do not introduce cross-cutting invite logic in unrelated modules or in `apps/admin`. [Source: apps/api/src/modules] [Source: packages/database/src/entities] [Source: packages/types/src]

3. Follow the architecture preference for resource endpoints plus action endpoints. `invite` and first-login completion are stateful operations, so dedicated endpoints are the compliant shape. Do not overload simple CRUD semantics and then hide side effects in generic method names. [Source: _bmad-output/planning-artifacts/architecture/core-architectural-decisions.md]

4. Keep defense-in-depth tenancy intact:
   - RLS remains the database guarantee
   - application handlers must still operate with tenant-scoped request transactions
   - no code path may rely on caller-provided tenant identifiers
   - no tenant data query should run through a Supabase service-role client
   [Source: _bmad-output/planning-artifacts/architecture/project-context-analysis.md] [Source: apps/api/src/common/interceptors/tenant-context.interceptor.ts]

5. Do not rely on TypeORM subscribers to rescue incorrect filtering. The repository still documents subscriber-based filtering as disabled/not fully integrated, so Story 1.4 must be correct with RLS plus request-scoped query runner alone. [Source: packages/database/src/subscribers/role-filter.subscriber.ts]

6. New migrations must follow the corrected RLS policy patterns already established in the repo:
   - avoid `FOR ALL` write policies that interfere with `SELECT`
   - avoid raw `current_setting(... )::uuid` casts
   - use the guarded `NULLIF(...)::uuid` / `CASE` style from the latest fix migrations
   - split write policies by `INSERT`, `UPDATE`, and `DELETE` when needed
   [Source: supabase/migrations/20260306220000_fix_write_policies_uuid_casting.sql] [Source: supabase/migrations/20260306215500_fix_uuid_casting_in_rls.sql]

7. Keep API contracts and validation aligned with the repo’s stated architecture direction:
   - shared validation/types should live in `packages/types`
   - NestJS endpoints should continue to expose Swagger-documented DTOs
   - JSON error responses should stay in the existing standard shape
   [Source: _bmad-output/planning-artifacts/architecture/core-architectural-decisions.md] [Source: apps/api/src/modules/users/dto/create-user.dto.ts]

8. Respect the current connection-management constraints. The architecture and data-source config both assume pooled PostgreSQL access with bounded connections; do not add long-lived per-user connections or background request leakage in invite/email flows. Always release `QueryRunner`s through the interceptor-managed lifecycle. [Source: packages/database/src/data-source.ts] [Source: apps/api/src/common/interceptors/tenant-context.interceptor.ts]

### Library / Framework Requirements

1. Backend HTTP/API work must stay within the current NestJS 11 stack in `apps/api`. Add DTOs, services, and controllers in the established Nest style; do not introduce Express-only route files, ad hoc handlers, or a second backend framework. [Source: apps/api/package.json]

2. Persistence must remain TypeORM-based against the shared entities in `@drive-insight/database`. Do not mix in Prisma, direct SQL-only repository layers for normal request flow, or Supabase client reads for tenant data that already belongs behind RLS. [Source: apps/api/package.json] [Source: packages/database/package.json]

3. Supabase integration must continue through `@supabase/supabase-js` v2.x. Use it for:
   - password sign-in on the existing anon client,
   - admin user creation / disablement on a separate service-role client.
   Do not invent custom REST wrappers or rely on frontend-only Supabase usage for server-side admin actions. [Source: apps/api/package.json] [Source: packages/database/package.json]

4. Request payload validation in the API should continue using `class-validator` / `class-transformer` DTOs because that is the current controller convention. If you add shared shapes such as `working_hours`, define them once in `packages/types` with Zod and adapt them cleanly into DTO validation rather than maintaining two unrelated contract definitions. [Source: apps/api/package.json] [Source: apps/api/src/modules/users/dto/create-user.dto.ts] [Source: packages/types/package.json]

5. JWT handling should remain consistent with the existing `jsonwebtoken`-based custom claim flow. Do not switch Story 1.4 to a different token model unless the entire auth module is being intentionally refactored as part of the story. [Source: apps/api/package.json] [Source: apps/api/src/modules/auth/auth.service.ts]

6. Email delivery is the only justified net-new external integration in this story. Add a narrow email provider abstraction and wire Resend behind it; do not add a heavyweight generic mailer stack unless it is required to support Resend cleanly. Keep the provider mockable for tests. [Source: _bmad-output/planning-artifacts/epics/epic-1-tenant-authentication-multi-tenancy-foundation.md]

7. Frontend work, if included in the story implementation, must stay on the current Next.js 15 / React 19 / Jotai tenant-dashboard stack. Reuse the existing UI composition approach (`apps/web/src/components/ui`, Radix primitives, utility-first Tailwind classes) rather than importing a separate component library. [Source: apps/web/package.json] [Source: apps/web/src/components/ui/button.tsx]

8. The UX specification assumes Shadcn-style component composition, not modal-heavy CRUD scaffolding. For any UI added in Story 1.4, prefer:
   - `Table` for team listing
   - `Sheet` for invite/edit forms
   - `Dialog` only for destructive confirmations
   - accessible button hierarchy and inline validation patterns
   [Source: _bmad-output/planning-artifacts/ux-design-specification/ux-consistency-patterns.md]

### Testing Requirements

1. Keep API verification in the existing Jest + Supertest integration style already used for auth and RBAC. Create real users through Supabase admin APIs in test setup, log in through `/api/auth/login`, and call protected routes with real JWTs. [Source: apps/api/src/__tests__/auth/auth.integration.spec.ts] [Source: apps/api/src/__tests__/rbac/rbac-test.utils.ts]

2. Cover both permission boundaries and tenant isolation:
   - allowed owner/manager paths according to the final RBAC decision,
   - forbidden agent paths,
   - cross-tenant access attempts for invite, update, and deactivate operations.
   Do not rely on unit tests alone for these checks. [Source: apps/api/src/__tests__/rbac/owner-manager-access.spec.ts] [Source: apps/api/src/__tests__/rbac/agent-access.spec.ts]

3. Add focused tests for new lifecycle semantics:
   - invited user creation persists expected lifecycle fields,
   - login response exposes forced-password-change state,
   - password-change completion flips status to `active`,
   - deactivation keeps the local row but disables auth access.
   These are story-defining behaviors and must not be left to manual QA only.

4. If Story 1.4 changes RLS policies or adds lifecycle-driven access logic, extend the database-level test suite in `packages/database/src/__tests__/` using the same `postgres`-for-setup / `app_user`-for-verification pattern already established by the repo. [Source: packages/database/src/__tests__/role-based-rls.test.ts]

5. Email delivery must be tested at the provider boundary without sending real transactional mail in CI. Mock/stub the Resend provider behind its abstraction, but still assert that the invite flow constructs the correct outbound message payload and error path. This story is incomplete if email success/failure behavior is untested.

6. If any tenant-dashboard UI is added, it must at minimum receive component/integration coverage for:
   - invite form validation,
   - forced-password-change UX,
   - accessible destructive confirmation for deactivate,
   - focus management / keyboard navigation for sheets or dialogs.
   [Source: _bmad-output/planning-artifacts/ux-design-specification/responsive-design-accessibility.md] [Source: _bmad-output/planning-artifacts/ux-design-specification/ux-consistency-patterns.md]

7. Recommended verification commands for implementation:
   - `pnpm --filter @drive-insight/api test -- --runInBand __tests__/auth`
   - `pnpm --filter @drive-insight/api test -- --runInBand __tests__/rbac`
   - `pnpm --filter @drive-insight/database test -- --runInBand`

### Previous Story Intelligence

1. Story 1.3 established the correct controller/service contract for tenant-scoped user management:
   - keep role restrictions on controller methods with `@Roles(...)`,
   - pass `req.queryRunner` into services,
   - derive `tenant_id` from authenticated context instead of request payload.
   Story 1.4 should extend that pattern rather than replacing it. [Source: _bmad-output/implementation-artifacts/1-3-role-based-access-control-owner-manager-agent.md] [Source: apps/api/src/modules/users/users.controller.ts] [Source: apps/api/src/modules/users/users.service.ts]

2. The repo already had to fix RLS write-policy regressions after Story 1.3. The latest split write-policy migrations are now the source of truth; do not copy the original `FOR ALL` pattern from the first role-based RLS migration. [Source: supabase/migrations/20260303000001_role_based_rls_policies.sql] [Source: supabase/migrations/20260306220000_fix_write_policies_uuid_casting.sql]

3. Story 1.3 deliberately re-scoped itself away from future entities (`leads`, `conversations`, `bookings`) that were not present yet. Story 1.4 must show the same discipline with lead unassignment rather than inventing future-domain schema just to satisfy wording. [Source: _bmad-output/implementation-artifacts/1-3-role-based-access-control-owner-manager-agent.md]

4. The existing RBAC/auth test harness already creates real Supabase users, inserts local rows, logs in through the API, and verifies route behavior. Reuse it directly instead of creating a second invite-specific test bootstrap path. [Source: apps/api/src/__tests__/rbac/rbac-test.utils.ts]

5. Current hard-delete behavior in `UsersService.deleteUser()` is a known mismatch with Story 1.4 acceptance criteria. Treat it as a required behavior change, not as a reusable baseline. [Source: apps/api/src/modules/users/users.service.ts]

### Git Intelligence Summary

Recent history shows the tenant-auth/RLS area was stabilized through iterative fixes rather than a single clean implementation:
- `c4366b9` updated RLS policies and fixed build issues
- `c38e7e8` fixed tenant isolation and reviewed Story 1.3
- `04e34c5` updated documentation after those fixes

Implication for Story 1.4: trust the latest migrations, tests, and implementation artifacts over older patterns that may still appear in intermediate files or comments. In particular, use the current fixed RLS policy shape and the latest Story 1.3 artifact as the baseline. [Source: git log --oneline -5]

### Latest Tech Information

Verified against official sources on 2026-03-10:

1. `@supabase/supabase-js`
   - Repo pin: `2.47.14`
   - Current npm release observed: `2.84.0`
   - Story implication: stay on the existing v2 line unless Story 1.4 truly requires an upgrade; use documented v2 admin/auth APIs rather than inventing custom wrappers.
   [Source: https://www.npmjs.com/package/@supabase/supabase-js]

2. Supabase Auth admin APIs
   - Official docs expose `auth.admin.createUser()` for server-side user provisioning.
   - Official docs also expose invite/recovery link generation flows (`auth.admin.generateLink()`) and invite helpers (`inviteUserByEmail()`), which are the documented alternatives if the team decides not to email raw temporary passwords.
   - Story implication: if temporary-password email proves too brittle or insecure during implementation, the documented invite/recovery-link path is the safest fallback to raise with the user before changing requirements.
   [Source: https://supabase.com/docs/reference/javascript/auth-admin-createuser]
   [Source: https://supabase.com/docs/reference/javascript/auth-admin-generatelink]
   [Source: https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail]

3. Supabase password updates
   - Official docs expose `auth.updateUser()` for authenticated user profile/password updates.
   - Story implication: because the current backend returns a custom JWT rather than a raw Supabase client session, the implementation must deliberately choose between:
     - preserving a Supabase session token client-side for first-login password change, or
     - using an intentional backend/admin completion flow.
   This requirement is an inference from the current repo auth architecture plus the official API shape.
   [Source: https://supabase.com/docs/reference/javascript/auth-updateuser]

4. Resend
   - Repo status: no current dependency
   - Current npm release observed: `6.2.0`
   - Official docs use the `emails.send()` API for transactional sends.
   - Story implication: add a thin provider around the official SDK rather than building a raw HTTP integration or a generic mail abstraction first.
   [Source: https://www.npmjs.com/package/resend]
   [Source: https://resend.com/docs/send-with-nodejs]

### Project Context Reference

`_bmad-output/project-context.md` is still mostly a scaffold and does not yet contain actionable Story 1.4 implementation rules. Until it is populated, the operative context for this story is:
- `AGENTS.md` for repo layout, naming, migration, and testing conventions
- Epic 1 planning artifacts for acceptance criteria and scope
- Stories 1.1 to 1.3 implementation artifacts for proven tenant/auth/RBAC patterns
- Architecture and UX planning artifacts for stack, endpoint, and interaction guidance

This story intentionally cites concrete repo files because project-context alone is not yet sufficient to resolve implementation ambiguities. [Source: _bmad-output/project-context.md] [Source: AGENTS.md]

### Project Structure Notes

Primary implementation surface:
- `apps/api/src/modules/users/` for invite, profile update, and deactivate endpoints/service logic
- `apps/api/src/modules/auth/` for first-login completion flow and any login payload changes
- `packages/database/src/entities/` for persisted lifecycle fields and entity updates
- `packages/types/src/` for shared `working_hours` and user lifecycle contracts
- `supabase/migrations/` for schema and RLS policy changes

Primary verification surface:
- `apps/api/src/__tests__/rbac/` for HTTP auth/RBAC regression coverage
- `apps/api/src/__tests__/auth/` for login and password-change flow coverage
- `packages/database/src/__tests__/` for RLS or schema-level validation

UI surface, only if story implementation includes tenant-side screens:
- `apps/web/src/app/` for route entry points
- `apps/web/src/components/` and `apps/web/src/components/ui/` for table/sheet/form composition
- `apps/web/src/store/` for any tenant-dashboard state additions

Out of scope / do not treat as primary implementation targets:
- `apps/admin/` because Story 1.4 is tenant-side staff management, not superuser operations
- new `leads` modules, entities, or migrations unless the story is intentionally expanded beyond current Epic 1 scope
- unrelated observability or monitoring code introduced in Story 0.x and 1.3

Detected repo variances to account for:
- The architecture expects richer shared frontend patterns than the current tenant app exposes today; `apps/web` is still mostly placeholder UI, so architecture + UX artifacts are more authoritative than current page structure for any optional Story 1.4 UI work.
- The repo already has placeholder shared Zod types in `packages/types`, but most API endpoints still validate through Nest DTOs. Story 1.4 should extend that bridge rather than choosing one side and ignoring the other.

### References

- `_bmad-output/planning-artifacts/epics/epic-1-tenant-authentication-multi-tenancy-foundation.md`
- `_bmad-output/planning-artifacts/epics/requirements-inventory.md`
- `_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md`
- `_bmad-output/planning-artifacts/architecture/project-context-analysis.md`
- `_bmad-output/planning-artifacts/ux-design-specification/ux-consistency-patterns.md`
- `_bmad-output/planning-artifacts/ux-design-specification/responsive-design-accessibility.md`
- `_bmad-output/implementation-artifacts/1-1-tenant-database-schema-rls-policies.md`
- `_bmad-output/implementation-artifacts/1-2-tenant-user-authentication-login-session.md`
- `_bmad-output/implementation-artifacts/1-3-role-based-access-control-owner-manager-agent.md`
- `apps/api/src/modules/users/users.controller.ts`
- `apps/api/src/modules/users/users.service.ts`
- `apps/api/src/modules/auth/auth.controller.ts`
- `apps/api/src/modules/auth/auth.service.ts`
- `apps/api/src/modules/auth/supabase.service.ts`
- `apps/api/src/common/interceptors/tenant-context.interceptor.ts`
- `apps/api/src/__tests__/auth/auth.integration.spec.ts`
- `apps/api/src/__tests__/rbac/rbac-test.utils.ts`
- `packages/database/src/entities/user.entity.ts`
- `packages/database/src/entities/agent-profile.entity.ts`
- `packages/database/src/__tests__/role-based-rls.test.ts`
- `supabase/migrations/20260303000001_role_based_rls_policies.sql`
- `supabase/migrations/20260306215500_fix_uuid_casting_in_rls.sql`
- `supabase/migrations/20260306220000_fix_write_policies_uuid_casting.sql`
- `https://supabase.com/docs/reference/javascript/auth-admin-createuser`
- `https://supabase.com/docs/reference/javascript/auth-admin-generatelink`
- `https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail`
- `https://supabase.com/docs/reference/javascript/auth-updateuser`
- `https://www.npmjs.com/package/@supabase/supabase-js`
- `https://www.npmjs.com/package/resend`
- `https://resend.com/docs/send-with-nodejs`

## Dev Agent Record

### Agent Model Used

Codex (GPT-5)

### Debug Log References

- `git log --oneline -5`

### Completion Notes List

- Implemented owner-only invite, update, and deactivate flows on the tenant users module, following the stricter acceptance-criteria wording rather than the broader story summary.
- Added persisted user lifecycle state across the schema, entity, and shared types layers with `account_status`, `must_change_password`, `invited_at`, `activated_at`, and `disabled_at`.
- Added a server-only Supabase admin service plus post-commit transactional email delivery so auth-user creation, local persistence, and outbound invite email stay recoverable.
- Added `POST /api/auth/complete-password-change`, lifecycle-aware login responses, and guard enforcement that blocks invited users from other protected routes until the first password change is completed.
- Replaced hard deletes with deactivation semantics, including self-deactivation prevention, last-owner protection, and an explicit lead-unassignment dependency note because lead entities do not yet exist.
- Applied `supabase/migrations/20260311210000_add_user_lifecycle_fields.sql` to the local database before running integration tests because the local schema was missing the new lifecycle columns.
- Verification passed:
  - `pnpm --filter @drive-insight/api build`
  - `pnpm --filter @drive-insight/api test -- --runInBand src/__tests__/auth/auth.integration.spec.ts src/__tests__/rbac/owner-manager-access.spec.ts src/__tests__/rbac/agent-access.spec.ts src/__tests__/users/users-lifecycle.integration.spec.ts`
  - `pnpm --filter @drive-insight/database test -- --runInBand role-based-rls.test.ts`
- Additional validation note: `pnpm --filter @drive-insight/database test -- --runInBand` still fails the existing `src/__tests__/tenant-rls-audit.test.ts` expectations locally; that failure is outside the Story 1.4 lifecycle changes.
- Residual test harness note: the targeted API Jest run completes with all tests passing but still reports open handles after completion.

### File List

**Created:**
- `apps/api/src/modules/auth/dto/complete-password-change.dto.ts`
- `apps/api/src/modules/auth/supabase-admin.service.ts`
- `apps/api/src/modules/users/dto/invite-user.dto.ts`
- `apps/api/src/modules/users/transactional-email.service.ts`
- `apps/api/src/modules/users/validators/working-hours.validator.ts`
- `apps/api/src/__tests__/users/users-lifecycle.integration.spec.ts`
- `supabase/migrations/20260311210000_add_user_lifecycle_fields.sql`

**Modified:**
- `.env.example` - documented Resend configuration and reinforced server-only service-role usage
- `apps/api/package.json` - added the shared types workspace dependency
- `apps/api/src/common/guards/supabase-auth.guard.ts` - reloaded user state from the database and enforced lifecycle-aware access
- `apps/api/src/common/interceptors/tenant-context.interceptor.ts` - added post-commit action support for invite email dispatch
- `apps/api/src/modules/auth/auth.controller.ts` - added first-login password-change completion endpoint
- `apps/api/src/modules/auth/auth.module.ts` - exported the Supabase admin service to downstream modules
- `apps/api/src/modules/auth/auth.service.ts` - returned lifecycle state on login and activated users after password change
- `apps/api/src/modules/auth/supabase.service.ts` - hardened the server client auth settings
- `apps/api/src/modules/users/dto/update-user.dto.ts` - validated canonical working-hours and availability payloads
- `apps/api/src/modules/users/users.controller.ts` - added `POST /api/users/invite` and tightened management routes to owner-only
- `apps/api/src/modules/users/users.module.ts` - wired auth and transactional email providers
- `apps/api/src/modules/users/users.service.ts` - implemented invite/reinvite, profile upsert, and deactivation flows
- `apps/api/src/__tests__/auth/auth.integration.spec.ts` - covered first-login completion and disabled-user login handling
- `apps/api/src/__tests__/rbac/agent-access.spec.ts` - covered forbidden invite, update, delete, and list access for agents
- `apps/api/src/__tests__/rbac/owner-manager-access.spec.ts` - covered invite, profile update, and deactivation behavior across owner/manager roles
- `apps/api/src/__tests__/rbac/rbac-test.utils.ts` - added login retry handling for freshly seeded Supabase users
- `packages/database/src/entities/user.entity.ts` - added lifecycle columns to the shared user entity
- `packages/types/src/index.ts` - exported lifecycle and working-hours types
- `packages/types/src/schemas/index.ts` - defined canonical working-hours and user lifecycle schemas
- `pnpm-lock.yaml` - refreshed the lockfile after workspace dependency changes
- `_bmad-output/implementation-artifacts/sprint-status.yaml` - moved Story 1.4 into review

### Change Log

- 2026-03-12: Implemented Story 1.4 backend lifecycle support for user invitation, password-change activation, profile availability updates, and account deactivation.
- 2026-03-12: Added regression coverage for invite, lifecycle, RBAC, and cross-tenant isolation flows plus shared schema/entity updates and the supporting migration.
