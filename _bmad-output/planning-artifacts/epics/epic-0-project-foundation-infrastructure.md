# Epic 0: Project Foundation & Infrastructure

The development team can run the full stack locally in one command and deploy to production. All foundational tooling, CI/CD, and observability are in place before any feature work begins.

## Story 0.1: Turborepo Monorepo Initialisation

As a developer,
I want a Turborepo monorepo with `apps/web`, `apps/api`, `apps/admin`, and shared `packages/` already scaffolded,
So that all team members can clone the repo and have the correct project structure immediately.

**Acceptance Criteria:**

**Given** a fresh clone of the repository
**When** I run `pnpm install` at the root
**Then** all workspace dependencies are installed without errors
**And** `turbo build` succeeds across all apps and packages

**Given** the monorepo is initialized
**When** I inspect the folder structure
**Then** `apps/web` contains a Next.js 15 App Router project with TypeScript, Tailwind CSS, and Shadcn/UI initialized (New York style, CSS variables)
**And** `apps/api` contains a NestJS project with TypeScript in strict mode
**And** `apps/admin` contains a Next.js 15 project with TypeScript and Tailwind CSS
**And** `packages/database` exports Supabase client initialization and type stubs
**And** `packages/types` exports shared TypeScript interfaces and Zod schemas
**And** `packages/config` exports shared ESLint and TypeScript configurations

**Given** the monorepo structure exists
**When** I run `pnpm add jotai` in `apps/web`
**Then** Jotai is installed only in the web workspace (not globally)

---

## Story 0.2: Local Development Environment (Docker Compose)

As a developer,
I want `docker-compose up` to start all services with hot-reload,
So that I can develop locally without manually managing service processes.

**Acceptance Criteria:**

**Given** Docker Desktop is running
**When** I run `docker-compose up` at the project root
**Then** the following services start and become healthy:
- Next.js web app at `localhost:3000` with HMR enabled
- NestJS API at `localhost:3001` with watch mode enabled
- Next.js admin app at `localhost:3002` with HMR enabled
- Supabase local stack (PostgreSQL at `localhost:54322`, Studio at `localhost:54323`, Auth at `localhost:54321`)
- n8n at `localhost:5678`

**Given** I edit a file in `apps/api/src`
**When** I save the file
**Then** NestJS recompiles and restarts within 5 seconds without manually restarting the container

**Given** the Supabase local stack is running
**When** I run `supabase db push`
**Then** all migration files in `supabase/migrations/` are applied to the local database

**Given** the environment is running
**When** I navigate to `localhost:3000/api/health`
**Then** the Next.js proxy correctly forwards the request to the NestJS API and returns `{ status: "ok" }`

---

## Story 0.3: CI/CD Pipeline (GitHub Actions)

As a developer,
I want every push to `main` to automatically test, build, and deploy to Hostinger,
So that releases are consistent, auditable, and require no manual steps.

**Acceptance Criteria:**

**Given** a pull request is opened against `main`
**When** the GitHub Actions workflow triggers
**Then** `pnpm test` runs across all workspaces and must pass before merge is allowed
**And** `pnpm build` must succeed for all apps

**Given** a commit is merged to `main`
**When** the deploy job runs
**Then** Docker images are built for `apps/api`, `apps/web`, and `apps/admin` tagged with the Git SHA
**And** images are pushed to the container registry
**And** the Hostinger VPS is updated via SSH + `docker compose pull && docker compose up -d`
**And** deployment completes within 10 minutes end-to-end

**Given** the production deploy uses Docker Secrets
**When** the API container starts
**Then** `DB_PASSWORD`, `JWT_SECRET`, and `OPENAI_API_KEY` are read from `/run/secrets/` and not from environment variables directly

**Given** a test fails in CI
**When** the workflow completes
**Then** the deploy job is skipped and a failing status check is shown on the PR

---

## Story 0.4: Monitoring & Observability Setup

As a developer,
I want structured logs shipping to Grafana Cloud Loki and Prometheus metrics pushing to Grafana Cloud,
So that I can debug production issues and track system health from day one.

**Acceptance Criteria:**

**Given** the NestJS API is running in production
**When** any log statement is emitted (e.g., `logger.info('Lead created', { tenant_id, lead_id })`)
**Then** the log appears in Grafana Cloud Loki within 30 seconds with `app`, `environment`, and `tenant_id` labels

**Given** the API is running
**When** 15 seconds elapse
**Then** Prometheus metrics (HTTP request duration, request totals, conversation totals, LLM cost totals) are pushed to Grafana Cloud

**Given** Grafana Cloud is configured
**When** the error rate exceeds 10 errors/second for 5 minutes
**Then** a Grafana alert fires to the configured Slack channel `#alerts`

**Given** the API receives a request
**When** the request completes
**Then** `http_request_duration_seconds` histogram is incremented with `method`, `route`, `status_code`, and `tenant_id` labels
**And** the Swagger documentation is accessible at `/api/docs` in development

---
