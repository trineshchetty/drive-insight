# Code Review: Story 1.3 Role-Based Access Control (Owner / Manager / Agent)

- Review date: 2026-03-08
- Reviewer: Codex
- Story file: `_bmad-output/implementation-artifacts/1-3-role-based-access-control-owner-manager-agent.md`
- Outcome at review time: Changes requested
- Review scope: Current `HEAD`

## Review Context

This review was run against the current committed codebase state.

At review time there were no uncommitted source changes under `apps/`, `packages/`, or `supabase/`, so the review was performed against the repository's current implementation rather than a pending worktree diff.

## Artifacts Reviewed

- `_bmad-output/implementation-artifacts/1-3-role-based-access-control-owner-manager-agent.md`
- `_bmad-output/planning-artifacts/epics/epic-1-tenant-authentication-multi-tenancy-foundation.md`
- `_bmad-output/planning-artifacts/architecture/*.md`
- `_bmad-output/planning-artifacts/ux-design-specification/*.md`
- `apps/api/src/common/guards/roles.guard.ts`
- `apps/api/src/common/decorators/roles.decorator.ts`
- `apps/api/src/common/context/request-context.ts`
- `apps/api/src/common/interceptors/tenant-context.interceptor.ts`
- `apps/api/src/app.module.ts`
- `apps/api/src/modules/users/users.controller.ts`
- `apps/api/src/modules/users/users.service.ts`
- `apps/api/src/common/guards/supabase-auth.guard.ts`
- `apps/api/src/common/decorators/public.decorator.ts`
- `packages/database/src/subscribers/tenant.subscriber.ts`
- `packages/database/src/subscribers/role-filter.subscriber.ts`
- `packages/database/src/subscribers/index.ts`
- `packages/database/src/data-source.ts`
- `packages/database/src/entities/user.entity.ts`
- `packages/database/src/entities/agent-profile.entity.ts`
- `supabase/migrations/20260226000001_tenant_auth_schema.sql`
- `supabase/migrations/20260303000001_role_based_rls_policies.sql`
- `supabase/migrations/20260306220000_fix_write_policies_uuid_casting.sql`
- `apps/api/src/__tests__/rbac/roles-guard.spec.ts`
- `apps/api/src/__tests__/rbac/request-context.spec.ts`
- `apps/api/src/__tests__/rbac/agent-access.spec.ts`
- `apps/api/src/__tests__/rbac/owner-manager-access.spec.ts`

## Verification Performed

- Command run: `pnpm --filter @drive-insight/api test -- --runInBand __tests__/rbac`
- Result: 4 test suites passed, 27 tests passed
- Important note: the passing result does not clear the story because several tests are placeholders or direct controller invocations with mocked services.

## Review Summary

Story 1.3 cannot be considered complete in its current state.

- AC1 and AC4 are partially implemented at the guard/decorator layer.
- AC2 has a broken create-user happy path.
- AC3 is not implemented in the running application.
- The story overstates the scope and quality of its automated test coverage.

## Findings

### 1. Critical: AC3 is still missing while the story marks it complete

The story marks the lead-access acceptance criterion, the TypeORM filters, the role-based RLS policies, and the lead-specific integration tests as complete:

- Story task block: `1-3-role-based-access-control-owner-manager-agent.md:54-61`
- Story task block: `1-3-role-based-access-control-owner-manager-agent.md:77-93`
- Story AC mapping: `1-3-role-based-access-control-owner-manager-agent.md:603-607`

The implementation does not support that claim:

- `packages/database/src/subscribers/role-filter.subscriber.ts:23-31` explicitly states the role filter subscriber is disabled.
- `packages/database/src/subscribers/role-filter.subscriber.ts:46-94` contains only commented-out logic.
- `apps/api/src/app.module.ts:19-35` configures TypeORM inline and does not register any subscribers.
- `packages/database/src/data-source.ts:5-13` declares subscribers, but that data source is not what the Nest app boots with.
- Repository search under `apps/api/src` found `@Controller('users')` and `@Controller('auth')`, but no `@Controller('leads')`.

Impact:

- `GET /api/leads?assigned_to=me` cannot currently satisfy AC3.
- The story marks multiple completed tasks that are not actually active in production code.
- This is a story-completeness blocker, not a polish item.

### 2. High: `POST /api/users` does not implement the happy path promised by AC2

The controller forwards the raw body directly to the service:

- `apps/api/src/modules/users/users.controller.ts:55-56`

The service saves the DTO unchanged and assumes RLS will populate `tenant_id`:

- `apps/api/src/modules/users/users.service.ts:39-41`

But the `users` table requires a non-null `tenant_id` and does not define a default:

- `supabase/migrations/20260226000001_tenant_auth_schema.sql:31-40`

Impact:

- Owner/manager user creation only succeeds if the caller manually supplies `tenant_id`.
- That is not the contract described by the story.
- AC2 should not be treated as done until the server sets tenant scope explicitly and the endpoint is verified end-to-end.

### 3. High: The passing RBAC test suite gives false confidence

The story says the RBAC integration coverage is complete:

- `1-3-role-based-access-control-owner-manager-agent.md:85-93`
- `1-3-role-based-access-control-owner-manager-agent.md:591-613`

But several tests are placeholders:

- `apps/api/src/__tests__/rbac/agent-access.spec.ts:57-62`
- `apps/api/src/__tests__/rbac/agent-access.spec.ts:92-104`
- `apps/api/src/__tests__/rbac/owner-manager-access.spec.ts:159-165`

The non-placeholder tests do not issue HTTP requests. They call controller methods directly with mocked services:

- `apps/api/src/__tests__/rbac/agent-access.spec.ts:84-87`
- `apps/api/src/__tests__/rbac/owner-manager-access.spec.ts:82-91`
- `apps/api/src/__tests__/rbac/owner-manager-access.spec.ts:121-130`

There is also no story-specific RLS verification suite for the new role-based policies. The repo contains:

- `apps/api/src/__tests__/rbac/agent-access.spec.ts`
- `apps/api/src/__tests__/rbac/owner-manager-access.spec.ts`
- `apps/api/src/__tests__/rbac/request-context.spec.ts`
- `apps/api/src/__tests__/rbac/roles-guard.spec.ts`

But there is no `rls-policies` story 1.3 test file validating the new role-based policies.

Impact:

- The reported "27 passing tests" do not prove the API returns 403/201 for real requests.
- They do not prove AC3 works.
- They do not prove the handler is blocked before execution.

### 4. Medium: Missing `user.role` error handling was marked done but is not implemented

The story marks "Add error handling for missing user.role" as complete:

- `1-3-role-based-access-control-owner-manager-agent.md:95-99`

The interceptor still dereferences auth fields directly:

- `apps/api/src/common/interceptors/tenant-context.interceptor.ts:50`
- `apps/api/src/common/interceptors/tenant-context.interceptor.ts:53`
- `apps/api/src/common/interceptors/tenant-context.interceptor.ts:56`

Impact:

- If auth context is malformed or partially populated, the request will fail with a `TypeError` and 500.
- The implementation does not meet the task that was checked off in the story.

### 5. Medium: The proactive future-table RLS policies repeat a pattern the repo already had to repair

The story migration creates write policies for future tables using patterns such as:

- `supabase/migrations/20260303000001_role_based_rls_policies.sql:122-128`
- `supabase/migrations/20260303000001_role_based_rls_policies.sql:177-183`
- `supabase/migrations/20260303000001_role_based_rls_policies.sql:232-238`

Later, the repo adds a corrective migration for users and agent profiles that switches to a different structure:

- `supabase/migrations/20260306220000_fix_write_policies_uuid_casting.sql:18-37`
- `supabase/migrations/20260306220000_fix_write_policies_uuid_casting.sql:42-61`

Impact:

- The project already proved the original write-policy structure was unsafe/problematic enough to require correction.
- Fresh environments that eventually create `leads`, `conversations`, or `bookings` can inherit the same class of breakage unless these proactive policies are corrected before those stories land.

## Action Items Required Before Story 1.3 Can Be Marked Complete

- [ ] Resolve the AC3 scope mismatch.
  Either implement the minimal `leads` read path required by AC3 now, or formally re-scope AC3 out of Story 1.3 and move it to the story that introduces leads. Story 1.3 cannot honestly be marked done while AC3 remains present and unimplemented.

- [ ] Fix the create-user happy path.
  Set `tenant_id` server-side from authenticated request context instead of assuming RLS will populate it. Add a proper DTO for create/update user payloads and remove reliance on `any`.

- [ ] Replace placeholder RBAC tests with real endpoint-level tests.
  Add Supertest-based coverage for:
  - agent `POST /api/users` -> `403`
  - owner `POST /api/users` -> `201`
  - manager `POST /api/users` -> `201`
  - endpoints without `@Roles()` remaining accessible to authenticated users
  - handler non-execution when role guard denies access

- [ ] Add real AC3 verification.
  If AC3 stays in this story, add:
  - a minimal `leads` endpoint or equivalent executable path
  - role-based data filtering validation for agent vs owner/manager
  - direct RLS verification tests for the role-based policies

- [ ] Wire or remove the claimed ORM filter layer.
  If TypeORM query filters are part of the story's definition of done, export the required request context, register the subscribers in the running Nest app, and validate them end-to-end. If not, remove the claim from the story and completion notes.

- [ ] Add defensive auth-context validation in the interceptor.
  Validate `user.id`, `user.tenant_id`, and `user.role` before using them, and fail with a controlled auth/authorization error instead of an unhandled runtime exception.

- [ ] Repair the proactive RLS policies for future tables.
  Align `leads`, `conversations`, and `bookings` write policies with the corrected structure already used in `20260306220000_fix_write_policies_uuid_casting.sql`.

- [ ] Re-run verification after fixes.
  Minimum verification should include:
  - `pnpm --filter @drive-insight/api test -- --runInBand __tests__/rbac`
  - any new lead/RLS tests added for AC3
  - a fresh database reset or migration apply check if the proactive RLS policies are changed

- [ ] Update story metadata after fixes.
  Once the implementation and tests truly satisfy the acceptance criteria:
  - update the story's completion notes
  - correct the file list
  - append a review resolution entry
  - move the story status out of `review` only when the blockers above are closed

## Suggested Commit Sequence

1. `Fix story 1.3 user creation tenant scoping and auth-context validation`
2. `Implement or re-scope story 1.3 lead access acceptance criterion`
3. `Replace placeholder RBAC tests with real endpoint and RLS coverage`
4. `Correct proactive role-based RLS policies for future tables`

## Definition of Done for This Review

This review can be considered resolved when all of the following are true:

- Every remaining acceptance criterion in Story 1.3 is demonstrably implemented.
- No placeholder tests remain for the reviewed RBAC behavior.
- The create-user path works without caller-supplied tenant data.
- The story no longer claims disabled or non-existent lead access protections as complete.
- The story file and sprint tracking reflect reality.

## Resolution Update

- Resolution date: 2026-03-08
- Current status: Resolved in working tree, pending commit

The review blockers identified above were addressed in the working tree:

- The story and epic artifacts were re-scoped so Story 1.3 no longer claims `/api/leads` or ORM subscriber behavior that does not exist in Epic 1.
- `POST /api/users` now sets `tenant_id` server-side from authenticated request context and uses DTO validation.
- `TenantContextInterceptor` now validates `user.id`, `user.tenant_id`, and `user.role` before setting request/database context.
- Placeholder RBAC tests were replaced with real HTTP-level coverage for agent, owner, and manager flows.
- Database-level role-based RLS tests were added for `users` and `agent_profiles`.
- The Story 1.3 RLS migration was narrowed to existing tables, and future `leads` / `conversations` / `bookings` policy work was deferred to the stories that introduce those tables.
- Story status was moved from `review` to `done` after focused verification.

Verification rerun for the fix set:

- `pnpm --filter @drive-insight/api build`
- `pnpm --filter @drive-insight/api test -- --runInBand __tests__/rbac`
- `pnpm --filter @drive-insight/database test -- --runInBand role-based-rls.test.ts`
