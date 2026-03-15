# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Drive Insight (trinstel-auto-ai) — AI-powered dealership management platform. Turborepo monorepo with NestJS API, Next.js frontends, Supabase PostgreSQL, and TypeORM. Multi-tenant architecture with Row-Level Security (RLS).

## Monorepo Layout

- **apps/api** — NestJS 11 backend (REST API, JWT auth, RBAC, Swagger at `/api/docs`)
- **apps/web** — Next.js 15 tenant dashboard (React 19, Tailwind CSS 4, Shadcn/UI, Jotai)
- **apps/admin** — Next.js 15 admin dashboard
- **packages/database** — TypeORM entities, Supabase client, data-source config
- **packages/types** — Shared TypeScript types and Zod schemas
- **packages/config** — Shared ESLint and TypeScript configs
- **supabase/** — SQL migrations and RLS policies

## Commands

### Install & Build
```bash
pnpm install                    # install all workspace deps
pnpm turbo build                # build all workspaces
pnpm turbo dev                  # run all dev servers
pnpm turbo lint                 # lint all workspaces
pnpm turbo clean                # clean build artifacts
```

### API Development (from apps/api/)
```bash
pnpm start:dev                  # NestJS dev server with hot reload
pnpm build                      # compile
pnpm lint                       # ESLint with --fix
```

### Testing (from apps/api/)
```bash
pnpm test                       # run all tests (loads root .env via dotenv-cli)
pnpm test -- --watch            # watch mode
pnpm test -- path/to/file.spec.ts  # run single test file
pnpm test:cov                   # coverage report
pnpm test:e2e                   # end-to-end tests (uses test/jest-e2e.json)
```

Tests use Jest 29 + ts-jest. Test files are in `apps/api/src/__tests__/` organized by feature (auth/, rbac/, users/).

### Database
```bash
npx supabase start              # start local Supabase (PostgreSQL on port 54322, Studio on 54323)
npx supabase stop               # stop local Supabase
npx supabase db reset           # reset database and re-run all migrations
```

Migrations live in `supabase/migrations/`. The app connects as `app_user` (RLS enforced); use `postgres` role only for migrations.

### Docker
```bash
docker-compose up               # API (port 3005), Web (port 3003), Admin (port 3002)
```

## Architecture

### Authentication & Authorization Flow
1. Login via `/api/auth/login` → Supabase Auth verifies credentials → custom JWT issued (HS256, 1hr)
2. JWT claims: `sub`, `email`, `tenant_id`, `role` (owner|manager|agent), `account_status`, `must_change_password`
3. Request pipeline: `SupabaseAuthGuard` (JWT verify) → `RolesGuard` (check `@Roles()` decorator) → `TenantContextInterceptor` (sets PostgreSQL session vars for RLS)
4. `@Public()` decorator bypasses auth; `@Roles('owner','manager')` restricts by role

### Multi-Tenancy & RLS
- Tenant isolation via PostgreSQL RLS using session variables: `app.current_tenant_id`, `app.current_user_id`, `app.current_user_role`
- `TenantContextInterceptor` sets these on every authenticated request before any query runs
- All tenant-scoped entities include `tenant_id` column with RLS policies

### NestJS Module Pattern
Each feature module: `*.module.ts`, `*.controller.ts` (Swagger-decorated routes), `*.service.ts` (business logic), `dto/` (class-validator DTOs).

Key shared infrastructure in `apps/api/src/common/`:
- `guards/` — SupabaseAuthGuard, RolesGuard
- `interceptors/` — TenantContextInterceptor
- `decorators/` — @Public(), @Roles(), @CurrentUser()
- `context/` — AsyncLocalStorage for request-scoped user context

### Database Entities (packages/database)
- `Tenant` — root table (no RLS)
- `User` — tenant-scoped, roles: owner|manager|agent, statuses: invited|active|disabled
- `AgentProfile` — agent-specific data (working hours, availability)
- `AuditLog` — mutation audit trails with before/after JSON

### Shared Types (packages/types)
Exports `UserRole`, `UserAccountStatus`, `User`, `Tenant` interfaces and Zod schemas for runtime validation.

### Frontend Proxy
Next.js apps proxy `/api/*` to the NestJS backend — keeps frontend/backend on the same origin.

## Environment Setup
1. `cp .env.example .env`
2. `npx supabase start` — copy anon key, service role key, and JWT secret into `.env`
3. Generate `JWT_SECRET` and `ADMIN_JWT_SECRET` with `openssl rand -base64 32`
4. `DATABASE_URL` should use `app_user` role (not `postgres`) for RLS enforcement

## BMad Method
Project uses BMad structured development. Artifacts in `_bmad-output/`:
- `planning-artifacts/` — architecture, epics, UX specs
- `implementation-artifacts/` — story specs and `sprint-status.yaml` for progress tracking
