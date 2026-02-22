---
stepsCompleted: [1, 2, 3, 4]
workflowStatus: complete
inputDocuments:
  - drive-insight-prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
---

# trinstel-auto-ai - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Drive Insight, decomposing the requirements from the PRD, Architecture, and UX Design Specification into implementable stories.

---

## Requirements Inventory

### Functional Requirements

**Tenant Application**

FR-001: Tenant = dealership branch; strict tenant isolation using Supabase RLS.
FR-002: Tenant roles: `owner`, `manager`, `agent`.
FR-003: Permission model — owner/manager: manage users, routing rules, integrations, reporting; agent: manage assigned leads, add notes, update stages, create bookings, mark won/lost.
FR-010: Ingest inbound + outbound messages from ManyChat (AI + human).
FR-011: Ingest Meta Lead Ads payloads (lead form fields + campaign metadata).
FR-012: Ingest SMS messages via provider webhook (Twilio first; Clickatell optional).
FR-013: Normalize all inbound events into canonical entities: contacts, conversations, messages, leads.
FR-014: Ensure idempotency using `external_message_id` / event IDs per source.
FR-020: Conversation statuses: `active`, `completed`, `abandoned`, `human_active`.
FR-021: Store agent node/persona per AI message (e.g., "Master", "Car Fit").
FR-022: Transcript shows all messages: customer + AI + human.
FR-023: Conversation view supports search/filter by channel, status, assigned agent, date.
FR-030: Lead created when: qualification threshold met, OR CRM lead imported, OR manual "convert to lead".
FR-031: Lead stages (MVP): `new`, `qualified`, `booking_created`, `in_follow_up`, `won`, `lost`.
FR-032: Auto-assignment based on: agent working hours + availability (preferred), OR round-robin.
FR-033: Manual assignment override.
FR-034: Lead temperature via rules engine: HOT/WARM/COOL/COLD.
FR-040: Booking types: `test_drive`, `service`.
FR-041: Booking statuses: `requested`, `confirmed`, `rescheduled`, `cancelled`, `no_show`, `completed`.
FR-042: Booking can be created by AI flow or human action.
FR-043: Compute show-up rate per booking type.
FR-050: Manual confirmation for `won`/`lost`.
FR-051: Deal value entered manually (currency + optional metadata).
FR-052: ROI reporting uses deal value + booking conversion + SLA.
FR-060: Automation rate = conversations with no human messages.
FR-061: Sentiment analysis: store per-conversation sentiment; trend chart + negative sentiment queue.
FR-062: Drop-off reason classification (rules or model-based).
FR-063: Lead temperature distribution chart.
FR-070: Internal notes on leads/conversations.
FR-071: `@mentions` notify users in-app within tenant.
FR-080: Persist all integration events with status + retries.
FR-081: Provide health view: failures, latency, delivery status per integration.
FR-082: Retry + dead-letter handling for failed events.

**Admin Application**

FR-100: Admin users stored in separate `admin_users` table (no `tenant_id`).
FR-101: Simple password-based authentication with bcrypt hashing.
FR-102: Separate JWT secret for admin sessions.
FR-103: Admin actions logged in `admin_audit_log` table.
FR-104: Rate limiting and optional IP allowlisting for admin endpoints.
FR-110: Five-step onboarding wizard (dealership info, owner account, config, integrations, activation).
FR-111: Auto-generate unique webhook endpoint URL per tenant.
FR-112: Auto-generate initial password for owner account.
FR-113: Send welcome email with credentials and login instructions.
FR-114: Create default routing rules and availability settings.
FR-115: Set tenant status to `active` upon completion.
FR-120: Aggregate metrics across all tenants (conversations, leads, bookings, automation rate).
FR-121: Tenant performance comparison (automation rate, conversion rate, SLA compliance).
FR-122: Platform-wide charts (conversation volume, tenant activity heatmap, channel distribution).
FR-123: Drill-down capability to view tenant-specific analytics.
FR-124: Read-only tenant dashboard impersonation for support.
FR-130: Searchable/filterable tenant list view.
FR-131: Tenant detail view showing configuration, usage statistics, integration status.
FR-132: Pause tenant (disable access, queue webhooks).
FR-133: Suspend tenant (fully disable, reject webhooks).
FR-134: Reactivate tenant (restore access, process queued webhooks).
FR-135: Hard delete tenant with confirmation and backup (GDPR compliance).
FR-140: Integration health overview (webhook status, failed events, retry queue).
FR-141: Performance metrics dashboard (API response times, DB query performance, n8n execution times).
FR-142: Error monitoring (recent errors by tenant, error rate trends, categorized error types).
FR-143: Infrastructure status indicators (Supabase, n8n, ManyChat, external services).
FR-150: Per-tenant cost breakdown (storage, row counts, workflow executions, API costs).
FR-151: Platform-wide cost summary (total costs, cost per tenant, cost per conversation).
FR-152: Alerts for tenants exceeding thresholds or unusual usage patterns.
FR-160: Tenant impersonation in read-only mode with visual indicator.
FR-161: Cross-tenant conversation replay (access any conversation transcript).
FR-162: Manual data correction capabilities (lead stages, conversation reassignment, booking status).

---

### Non-Functional Requirements

NFR-001: Multi-tenant data isolation via RLS policies; no data leakage between tenants.
NFR-002: Sub-minute response times for lead ingestion; P50 <500ms, P95 <2s, P99 <5s for AI responses.
NFR-003: At-least-once event processing with idempotency; retry logic with exponential backoff.
NFR-004: Support thousands of conversations per day per tenant; horizontal scaling of webhook ingestion.
NFR-005: 12-month data retention policy per tenant.
NFR-006: Audit logging on all data mutations (audit_log table).
NFR-007: Webhook signature verification for all inbound integration events.
NFR-008: WCAG 2.1 Level AA accessibility compliance across all UI.
NFR-009: Responsive design — desktop-primary; mobile quick-check surface (bottom tab bar).
NFR-010: Token usage monitoring and budget alerts at 50%/75%/90% of monthly threshold.
NFR-011: LLM cost tracking per conversation, per tenant; model right-sizing strategy.
NFR-012: GitHub Actions CI/CD pipeline; tests must pass before merge to main.
NFR-013: Docker containerized deployment on Hostinger VPS; docker-compose for local dev.
NFR-014: Grafana Cloud monitoring (Loki logs + Prometheus metrics) with alerting.
NFR-015: Connection pooling: max 25 DB connections, min 5 always open.
NFR-016: Rate limiting: 100 req/min (general); 500 req/min (webhook endpoints).
NFR-017: Admin session timeout after 30 minutes of inactivity.
NFR-018: Booking atomicity via SELECT FOR UPDATE within transactions (no double-booking).

---

### Additional Requirements

**From Architecture — Starter Template (impacts Epic 0 Story 1):**
- Turborepo monorepo initialized with pnpm workspaces
- Apps: `apps/web` (Next.js 15), `apps/api` (NestJS), `apps/admin` (Next.js)
- Packages: `packages/database` (Supabase types), `packages/types` (shared DTOs), `packages/config` (ESLint/TS configs)
- Docker Compose: Local dev starts all services (Supabase, API, Web, Admin, n8n)
- Supabase CLI initialized for local database + Studio

**From Architecture — Infrastructure:**
- TypeORM as ORM with PostgreSQL RLS via session variables (SET LOCAL app.current_tenant_id)
- Zod schemas shared between frontend (Next.js) and backend (NestJS) via `packages/types`
- Server-Sent Events (SSE) for real-time dashboard updates (not WebSockets)
- NestJS SSE endpoints: `/api/sse/dashboard`, `/api/sse/notifications`
- GitHub Actions workflow: test → build → deploy to Hostinger VPS via SSH + docker compose
- Secrets management via Docker Secrets in production
- Supabase pgcrypto for encrypting tenant integration credentials
- Winston → Grafana Cloud Loki for structured logs
- Prometheus client → Grafana Cloud for metrics (push every 15s)
- Webhook signature verification (HMAC-SHA256) for all ManyChat inbound events
- Next.js proxy rewrites `/api/*` to NestJS API (CORS strategy)
- LangGraph embedded in NestJS (StateGraph with classifier → qualifier → booking_agent nodes)
- Sequence numbers on messages table for deterministic ordering (idempotency)
- Database indexes: tenant_id + created_at compound indexes on all major tables

**From UX Design Specification:**
- Command Blue (#1D6AE5) as primary brand colour; Inter typeface; 4px spacing grid
- Shadcn/UI component library (copy-paste, not npm dependency)
- 7 custom components required: MorningBriefingCard, LeadTemperatureBadge, LeadDetailPanel, ConversationTranscript, MetricCard, AgentAssignDropdown, AIPerformanceFunnel
- Three-workflow triage model: AI Successes / Needs Attention / Future Follow-ups
- ManyChat deep-links open in new tab with 3-stage feedback (named lead in toast, fallback prompt, instructive error)
- Presence indicator in LeadDetailPanel when concurrent users viewing same lead
- Queue overflow: auto-filter HOT first when >20 needs-attention leads
- Stale data indicator when API offline (cached data with timestamp badge)
- Conflict-aware optimistic updates with 3-second undo on "Mark Resolved"
- Dark mode support via CSS variables + Tailwind `dark:` prefix
- Bottom tab bar (4 tabs) on mobile; fixed 240px white sidebar on desktop (lg: 1024px+)
- WCAG AA colour contrast verified; shape + icon differentiation for colour blindness safety
- Axe DevTools automated a11y scan on every PR; Lighthouse score target ≥ 95

---

### FR Coverage Map

| FR | Epic | Brief description |
|---|---|---|
| FR-001 | Epic 1 | Tenant isolation via RLS |
| FR-002 | Epic 1 | Role definitions |
| FR-003 | Epic 1 | Permission model per role |
| FR-010 | Epic 2 | ManyChat message ingestion |
| FR-011 | Epic 2 | Meta Lead Ads ingestion |
| FR-012 | Epic 2 | SMS ingestion (Twilio) |
| FR-013 | Epic 2 | Canonical data model normalisation |
| FR-014 | Epic 2 | Idempotency via external_message_id |
| FR-020 | Epic 2 | Conversation status machine |
| FR-021 | Epic 2 | AI agent node/persona per message |
| FR-022 | Epic 2 | Full transcript display |
| FR-023 | Epic 3 | Conversation search/filter |
| FR-030 | Epic 3 | Lead creation triggers |
| FR-031 | Epic 3 | Lead stage lifecycle |
| FR-032 | Epic 3 | Auto-assignment rules |
| FR-033 | Epic 3 | Manual assignment override |
| FR-034 | Epic 3 | Lead temperature rules engine |
| FR-040 | Epic 4 | Booking types |
| FR-041 | Epic 4 | Booking status lifecycle |
| FR-042 | Epic 4 | AI + human booking creation |
| FR-043 | Epic 4 | Show-up rate computation |
| FR-050 | Epic 5 | Won/lost manual confirmation |
| FR-051 | Epic 5 | Deal value entry |
| FR-052 | Epic 5 | ROI reporting |
| FR-060 | Epic 5 | Automation rate calculation |
| FR-061 | Epic 5 | Sentiment analysis + trend |
| FR-062 | Epic 5 | Drop-off reason classification |
| FR-063 | Epic 5 | Lead temperature distribution chart |
| FR-070 | Epic 3 | Internal notes |
| FR-071 | Epic 3 | @mentions in-app |
| FR-080 | Epic 6 | Integration event persistence |
| FR-081 | Epic 6 | Health view |
| FR-082 | Epic 6 | Retry + dead-letter handling |
| FR-100–FR-104 | Epic 7 | Admin auth |
| FR-110–FR-115 | Epic 7 | Tenant onboarding wizard |
| FR-120–FR-124 | Epic 7 | Cross-tenant analytics |
| FR-130–FR-135 | Epic 7 | Tenant management |
| FR-140–FR-143 | Epic 7 | System health monitoring |
| FR-150–FR-152 | Epic 7 | Cost tracking |
| FR-160–FR-162 | Epic 7 | Support & debugging |

---

## Epic List

### Epic 0: Project Foundation & Infrastructure
The development team can run the full stack locally in one command and deploy to production. All foundational tooling, CI/CD, and observability are in place before any feature work begins.
**FRs covered:** NFR-012, NFR-013, NFR-014 (architecture-derived infrastructure)

### Epic 1: Tenant Authentication & Multi-Tenancy Foundation
Dealership staff can securely log in to their branch's isolated workspace. Owners can invite managers and agents. No tenant can see another tenant's data.
**FRs covered:** FR-001, FR-002, FR-003

### Epic 2: Multi-Channel Lead Ingestion & Conversation Capture
Every conversation from WhatsApp, Messenger, Meta Lead Ads, and SMS automatically appears in Drive Insight with full transcript, correctly attributed to the right contact and channel. Human ManyChat replies are also captured.
**FRs covered:** FR-010, FR-011, FR-012, FR-013, FR-014, FR-020, FR-021, FR-022

### Epic 3: Lead Pipeline & Triage Dashboard
Managers see a real-time triage dashboard with their three workflow queues (AI Successes, Needs Attention, Future Follow-ups). They can assign leads, update stages, add notes with @mentions, and jump to ManyChat for human intervention — all from one screen.
**FRs covered:** FR-023, FR-030, FR-031, FR-032, FR-033, FR-034, FR-070, FR-071

### Epic 4: Bookings Management
Agents can confirm test drives and service appointments booked by AI or manually. They can track booking status through its full lifecycle and the system computes show-up rates automatically.
**FRs covered:** FR-040, FR-041, FR-042, FR-043

### Epic 5: Deals, ROI & Analytics
Owners and managers can see the full AI ROI picture: automation rate, booking conversion funnel, sentiment trends, drop-off reasons, won/lost deals with deal values, and SLA compliance — all in one analytics view.
**FRs covered:** FR-050, FR-051, FR-052, FR-060, FR-061, FR-062, FR-063

### Epic 6: System Health & Integration Reliability
Managers can see the real-time health of all integrations (ManyChat, Meta, SMS). Failed events are visible, retryable, and dead-lettered — the system never silently loses a lead.
**FRs covered:** FR-080, FR-081, FR-082

### Epic 7: Admin Application — Tenant Operations
Platform administrators can onboard new dealerships end-to-end in minutes, manage tenant status, view cross-tenant analytics, monitor system health, track costs, and support tenants via conversation replay and read-only impersonation.
**FRs covered:** FR-100, FR-101, FR-102, FR-103, FR-104, FR-110, FR-111, FR-112, FR-113, FR-114, FR-115, FR-120, FR-121, FR-122, FR-123, FR-124, FR-130, FR-131, FR-132, FR-133, FR-134, FR-135, FR-140, FR-141, FR-142, FR-143, FR-150, FR-151, FR-152, FR-160, FR-161, FR-162

---

## Epic 0: Project Foundation & Infrastructure

The development team can run the full stack locally in one command and deploy to production. All foundational tooling, CI/CD, and observability are in place before any feature work begins.

### Story 0.1: Turborepo Monorepo Initialisation

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

### Story 0.2: Local Development Environment (Docker Compose)

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

### Story 0.3: CI/CD Pipeline (GitHub Actions)

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

### Story 0.4: Monitoring & Observability Setup

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

## Epic 1: Tenant Authentication & Multi-Tenancy Foundation

Dealership staff can securely log in to their branch's isolated workspace. Owners can invite managers and agents. No tenant can see another tenant's data.

### Story 1.1: Tenant Database Schema & RLS Policies

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

### Story 1.2: Tenant User Authentication (Login / Session)

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

### Story 1.3: Role-Based Access Control (Owner / Manager / Agent)

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

### Story 1.4: User Invitation & Profile Management

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

## Epic 2: Multi-Channel Lead Ingestion & Conversation Capture

Every conversation from WhatsApp, Messenger, Meta Lead Ads, and SMS automatically appears in Drive Insight with full transcript, correctly attributed to the right contact and channel.

### Story 2.1: Core Data Schema — Contacts, Conversations, Messages

As a platform engineer,
I want the contacts, conversations, messages, and integration_events tables created with correct indexes and RLS,
So that all channel ingestion stories have a ready data foundation to write into.

**Acceptance Criteria:**

**Given** migrations are applied
**When** I inspect the schema
**Then** tables exist: `contacts`, `conversations`, `messages`, `integration_events`
**And** `messages.sequence_number` (INT) exists for deterministic ordering
**And** `messages.external_message_id` (VARCHAR, UNIQUE per tenant) exists for idempotency
**And** all compound indexes from the architecture doc are present (e.g., `idx_conversations_tenant_created`, `idx_messages_conversation_sequence`)

**Given** a message is inserted with a duplicate `external_message_id` for the same tenant
**When** the INSERT is attempted
**Then** the database rejects it with a unique constraint violation (idempotency enforced at DB level)

**Given** a conversation is created
**When** I query `messages` ordered by `sequence_number`
**Then** messages are returned in chronological send order regardless of ingestion order

---

### Story 2.2: ManyChat Webhook Ingestion (WhatsApp / Messenger)

As a dealership manager,
I want every WhatsApp and Messenger message handled by ManyChat to appear in Drive Insight automatically,
So that I have a complete record of all AI and human conversations without any manual effort.

**Acceptance Criteria:**

**Given** ManyChat sends a webhook event to `/api/webhooks/manychat/:tenantId`
**When** the HMAC-SHA256 signature in `x-manychat-signature` is valid
**Then** the raw event is persisted to `integration_events` with `status: 'received'` before any processing
**And** HTTP 200 is returned to ManyChat immediately (async processing)

**Given** the event is persisted to `integration_events`
**When** the event processor runs
**Then** a `Contact` record is created or updated (upsert by `external_id`)
**And** a `Conversation` record is created or updated
**And** each message is inserted into `messages` with correct `sender_type` (`customer`, `ai`, `human`), `sequence_number`, and `ai_agent_node` (for AI messages)
**And** `integration_events.status` is updated to `processed`

**Given** a webhook arrives with an `external_message_id` already in the database
**When** the event processor runs
**Then** the duplicate message is not inserted (idempotency)
**And** `integration_events.status` is set to `duplicate` with no error

**Given** an invalid or missing signature
**When** the webhook handler processes the request
**Then** HTTP 401 is returned and the event is NOT persisted

---

### Story 2.3: Meta Lead Ads Ingestion

As a dealership manager,
I want leads submitted via Meta Lead Ads to automatically appear in Drive Insight as contacts and leads,
So that online advertising leads are captured in the same pipeline as conversational leads.

**Acceptance Criteria:**

**Given** Meta sends a Lead Ads webhook to `/api/webhooks/meta-lead-ads/:tenantId`
**When** the payload contains lead form fields (name, phone, vehicle interest, etc.)
**Then** a `Contact` is created or updated with the submitted fields
**And** a `Lead` is created with `source_channel: 'meta_lead_ads'`, `stage: 'new'`, and `external_payload` containing the raw form data
**And** the lead's `temperature` is set by the rules engine based on configured thresholds

**Given** a Meta Lead Ads lead is created
**When** I view the leads list in the UI
**Then** the lead displays with a "Meta Lead Ads" channel badge and all form fields visible in the lead detail

**Given** the same Meta lead form submission arrives twice (duplicate `leadgen_id`)
**When** the second webhook is processed
**Then** no duplicate contact or lead is created (idempotency via `external_message_id`)

---

### Story 2.4: SMS Ingestion (Twilio)

As a dealership manager,
I want inbound SMS messages via Twilio to appear in Drive Insight as conversations,
So that SMS leads are handled in the same triage workflow as WhatsApp leads.

**Acceptance Criteria:**

**Given** Twilio sends an inbound SMS webhook to `/api/webhooks/sms/twilio/:tenantId`
**When** the Twilio webhook signature is verified
**Then** the SMS message is persisted as a `Message` with `sender_type: 'customer'` and `source_channel: 'sms'`
**And** a `Contact` is created or updated using the sender's phone number as the unique identifier
**And** a `Conversation` is created or updated for that contact

**Given** an SMS conversation is active
**When** a human agent replies via ManyChat (SMS channel)
**Then** the reply is synced back to Drive Insight as a `Message` with `sender_type: 'human'`

**Given** Twilio webhook signature verification fails
**When** the request is processed
**Then** HTTP 403 is returned and the message is not stored

---

### Story 2.5: Conversation View with Full Transcript

As a dealership agent,
I want to open any conversation and see the complete message thread with clear sender labels,
So that I have full context before deciding how to respond.

**Acceptance Criteria:**

**Given** a conversation exists with messages from multiple sender types
**When** I navigate to `/conversations/:id`
**Then** all messages are displayed in chronological order (by `sequence_number`)
**And** each message shows the sender label: "Customer", the AI agent node name (e.g., "AI — Car Fit"), or the human agent's name
**And** the `ConversationTranscript` component renders with correct sender-type colour and alignment per the UX spec (customer left/`#F1F5F9`, AI right/`#EFF6FF`, human right/`#F0FDF4`, system centre/`#FEF9C3`)

**Given** a transcript has more than 5 messages
**When** the panel first opens
**Then** only the last 5 messages are visible (preview mode) with a "Load full transcript" button
**And** clicking "Load full transcript" loads all messages within the same panel (no page navigation)

**Given** a conversation is loading
**When** the API response is pending
**Then** skeleton rows matching the transcript layout are displayed (section-labelled, not anonymous grey bars)

---

## Epic 3: Lead Pipeline & Triage Dashboard

Managers see a real-time triage dashboard with three workflow queues. They can assign leads, update stages, add notes, and jump to ManyChat.

### Story 3.1: Lead Creation & Temperature Scoring

As a dealership manager,
I want leads to be automatically created and temperature-scored when a conversation crosses a qualification threshold,
So that the pipeline populates without manual data entry.

**Acceptance Criteria:**

**Given** a conversation's AI structured output indicates a qualification threshold is met
**When** the event processor runs
**Then** a `Lead` record is created with `stage: 'new'`, `source_channel` set to the conversation channel, and `contact_id` linked

**Given** a lead is created or updated
**When** the temperature rules engine evaluates it
**Then** temperature is set to `HOT`, `WARM`, `COOL`, or `COLD` based on tenant-configured thresholds (e.g., recency of last message, qualification fields completed, response/no-response)

**Given** a manager views the leads list
**When** the page loads
**Then** each lead row displays the `LeadTemperatureBadge` with correct colour, shape (●◑○—), and icon (🔥⚡💬❄️) per the UX spec
**And** colour is never the sole differentiator (shape + icon + label always present)

**Given** a lead is imported from an external CRM source
**When** it is created
**Then** `leads.external_source`, `leads.external_lead_id`, and `leads.external_payload` are populated correctly

---

### Story 3.2: Overview Dashboard — Morning Briefing & Three-Queue Triage

As a dealership manager,
I want to open Drive Insight and immediately see my three workflow queues (AI Successes, Needs Attention, Future Follow-ups) and a morning briefing card,
So that I know exactly where to focus without reading through every lead individually.

**Acceptance Criteria:**

**Given** a manager logs in
**When** the dashboard loads
**Then** the `MorningBriefingCard` displays: total conversations since midnight, count of AI-automated outcomes (breakdown: bookings + qualified leads), count of leads needing attention, and count of future follow-ups
**And** the card shows AI success rate % with delta vs last week

**Given** the dashboard is loaded
**When** leads exist across temperature tiers
**Then** the "Needs Attention" queue displays HOT leads first; if count > 20, COOL/COLD leads are collapsed with "Show N lower-priority leads ▼"
**And** the "AI Successes" queue shows leads automatically handled (qualified/booked) awaiting human follow-up
**And** the "Future Follow-ups" queue shows leads with scheduled next contact dates

**Given** real-time SSE connection is active
**When** a lead's status changes (e.g., resolved by a colleague)
**Then** the count in the relevant queue decrements in real-time via `aria-live="polite"` announcement
**And** the `MorningBriefingCard` count animates with a brief green flash

**Given** the API is offline or returning stale data
**When** the dashboard renders
**Then** a "Using cached data — last updated X min ago" badge appears with a manual Refresh button

---

### Story 3.3: Lead Detail Panel & ManyChat Deep-Link

As a dealership manager,
I want to click a lead and see full context (transcript, timeline, notes) before taking action, with one-click access to the exact ManyChat conversation thread,
So that I can triage leads in under 30 seconds without switching between multiple tabs.

**Acceptance Criteria:**

**Given** a manager clicks a lead row
**When** the `LeadDetailPanel` opens
**Then** it slides in from the right (480px on desktop, full-screen on mobile) without replacing the lead list
**And** the panel header shows: lead name, `LeadTemperatureBadge`, phone number, and "Dropped off X min ago" timestamp
**And** the Transcript tab is active by default, showing the `ConversationTranscript` component in preview mode
**And** action buttons are visible in the panel footer: "Open in ManyChat", "Copy Phone", "Assign to Agent", "Mark Resolved"

**Given** a manager clicks "Open in ManyChat"
**When** the button is activated
**Then** the button label changes to "Opening [Lead Name] in ManyChat…" with a spinner
**And** the ManyChat conversation opens in a **new tab** (not replacing Drive Insight)
**And** a toast fires: "Sipho Nkosi opened in ManyChat →"
**And** if the tab switch returns to Drive Insight within 3 seconds, a follow-up prompt appears: "Did ManyChat open correctly? [Copy phone] [Try again]"

**Given** the ManyChat deep-link fails
**When** the error is detected
**Then** the error state shows: "Could not open automatically — Conversation #12345. [Copy ID] to paste in ManyChat search"

**Given** two managers have the same lead panel open simultaneously
**When** the second manager opens the panel
**Then** a chip appears in the panel header: "👤 [Name] is also viewing this lead"

---

### Story 3.4: Lead Assignment (Manual & Auto)

As a dealership manager,
I want to assign leads to agents with visibility of each agent's availability and workload,
So that I make informed assignments rather than overloading busy agents.

**Acceptance Criteria:**

**Given** a manager opens the `AgentAssignDropdown` in the LeadDetailPanel
**When** the dropdown opens
**Then** all agents are listed with their status (Available/Busy/Off-duty), active lead count, and avatar
**And** off-duty agents are shown but `aria-disabled` (not selectable)
**And** agents at or near max capacity show a workload warning colour

**Given** a manager selects an available agent
**When** they confirm the assignment
**Then** the lead's `assigned_agent_id` is updated via POST `/api/leads/:id/assign`
**And** the `AgentAssignDropdown` trigger updates to show the assigned agent's name and avatar
**And** an optimistic update decrements the unassigned count immediately

**Given** a manager selects a busy agent (at capacity)
**When** they attempt the assignment
**Then** a confirmation dialog appears: "[Agent] has [N] active leads (max). Assign anyway?"
**And** only after confirmation does the assignment proceed

**Given** auto-assignment is configured (round-robin or by working hours)
**When** a new lead is created
**Then** the system assigns it to the available agent with the lowest active lead count within working hours
**And** if no agent is available, the lead remains unassigned with `temperature` set to `HOT`

---

### Story 3.5: Lead Stage Management & Notes

As a dealership agent,
I want to update a lead's pipeline stage and add internal notes with @mentions,
So that my team stays informed without needing to check in manually.

**Acceptance Criteria:**

**Given** an agent has a lead open
**When** they select a new stage from the stage dropdown (new → qualified → booking_created → in_follow_up → won/lost)
**Then** PATCH `/api/leads/:id` updates the `stage` field
**And** an `audit_log` entry is created recording the stage transition
**And** the lead moves to the correct queue section in real-time via SSE

**Given** an agent types a note with `@james` in the notes field
**When** they save the note
**Then** the note is persisted to the `notes` table with `entity_type: 'lead'` and `mentions: ['james_user_id']`
**And** James receives an in-app notification

**Given** a manager clicks "Mark Resolved" on a lead
**When** the action fires
**Then** the lead fades and moves to the bottom of its queue with an "Resolved ✓ — Undo (3s)" toast
**And** after 3 seconds the lead is removed from the queue permanently
**And** if another user resolves the same lead within those 3 seconds, the conflict toast shows: "[Name] just resolved this lead — view their notes?"

---

## Epic 4: Bookings Management

Agents can confirm test drives and service appointments, track booking status, and the system computes show-up rates.

### Story 4.1: Bookings Data Schema & Availability Engine

As a platform engineer,
I want the bookings table and internal availability engine created,
So that bookings can be created and slot conflicts are prevented at the database level.

**Acceptance Criteria:**

**Given** migrations are applied
**When** I inspect the schema
**Then** the `bookings` table exists with all status enum values: `requested`, `confirmed`, `rescheduled`, `cancelled`, `no_show`, `completed`
**And** `booking_type` column supports `test_drive` and `service`
**And** an index `idx_bookings_slot_time` exists for availability queries

**Given** two concurrent booking attempts for the same slot
**When** both transactions execute simultaneously
**Then** only one booking succeeds (via `SELECT FOR UPDATE` locking within a transaction)
**And** the second attempt receives HTTP 409 Conflict with message "Slot no longer available"

**Given** a tenant's availability config (operating hours, slot duration, capacity)
**When** `/api/bookings/available-slots?type=test_drive&date=2026-02-20` is called
**Then** the API returns only slots within operating hours that have remaining capacity
**And** slots already at capacity are not returned

---

### Story 4.2: Booking Creation (AI-triggered & Manual)

As a dealership agent,
I want to create a booking for a lead from the Lead Detail Panel, and for AI-created bookings to appear automatically,
So that all bookings are tracked in one place regardless of how they were initiated.

**Acceptance Criteria:**

**Given** an agent has a lead open in the LeadDetailPanel
**When** they click "Create Booking" and select type, date, and slot
**Then** POST `/api/bookings` creates the booking with `status: 'requested'` and links it to the lead and contact
**And** the booking appears in the Bookings module immediately

**Given** the AI flow books a test drive (via n8n → API)
**When** the booking creation event is processed
**Then** a booking is created with `status: 'requested'`, `booking_type: 'test_drive'`, and `created_by: 'ai'`
**And** the lead stage is automatically updated to `booking_created`
**And** the booking appears in the "AI Successes" queue on the dashboard

**Given** a booking is created
**When** I view the booking detail
**Then** I can see: contact name, booking type, slot date/time, current status, and linked lead

---

### Story 4.3: Booking Lifecycle Management & Show-Up Tracking

As a dealership agent,
I want to confirm, reschedule, cancel, or mark bookings as no-show/completed,
So that the system accurately reflects what happened and computes show-up rates.

**Acceptance Criteria:**

**Given** an agent views a `requested` booking
**When** they click "Confirm"
**Then** POST `/api/bookings/:id/confirm` transitions `status` to `confirmed`
**And** a Resend transactional email/notification is sent to the contact (if email is available)

**Given** an agent marks a booking as `no_show`
**When** POST `/api/bookings/:id/mark-no-show` is called
**Then** the booking `status` updates to `no_show`
**And** the show-up rate metric is recalculated for that booking type

**Given** a tenant has 20 bookings (15 completed, 3 no_show, 2 cancelled)
**When** the analytics endpoint `/api/analytics/bookings/show-up-rate` is called
**Then** it returns `{ test_drive: { completed: 15, no_show: 3, rate: 0.833 }, service: { ... } }`

**Given** an agent reschedules a booking
**When** they select a new slot and confirm
**Then** the original booking status becomes `rescheduled`
**And** a new booking is created for the new slot linked to the same lead

---

## Epic 5: Deals, ROI & Analytics

Owners and managers can see automation rate, booking conversion funnel, sentiment trends, drop-off reasons, won/lost deals, and SLA compliance.

### Story 5.1: AI Metrics Schema & Automation Rate Calculation

As a platform engineer,
I want the ai_metrics table created and the automation rate correctly computed per the PRD definition,
So that all analytics stories have accurate underlying data.

**Acceptance Criteria:**

**Given** migrations are applied
**When** I inspect the schema
**Then** the `ai_metrics` table exists with: `conversation_id`, `sentiment`, `dropoff_reason`, `temperature`, `automation_flag` (BOOLEAN), `prompt_version`, `flow_version`
**And** `cost_tracking` table exists with: `tenant_id`, `service`, `operation`, `model`, `tokens_used`, `cost_usd`
**And** all indexes from the architecture document are present

**Given** a conversation completes with zero human messages sent
**When** the automation flag is computed
**Then** `conversations.automation_flag = true` and `ai_metrics.automation_flag = true`

**Given** a conversation has at least one human message
**When** the automation flag is computed
**Then** `automation_flag = false` regardless of how many AI messages there are

**Given** the analytics API is called
**When** `/api/analytics/automation-rate?period=30d` is called
**Then** it returns `{ rate: 0.33, automated: 8, total: 24, period: '30d' }` computed from `automation_flag`

---

### Story 5.2: Won/Lost Deal Capture & ROI Reporting

As a dealership owner,
I want to manually mark leads as won or lost with deal value,
So that I can measure the true revenue impact of the AI system.

**Acceptance Criteria:**

**Given** an agent has a lead at any stage
**When** they POST `/api/leads/:id/qualify` with `{ outcome: 'won', deal_value: 250000, currency: 'ZAR' }`
**Then** the lead `stage` is updated to `won`, `deal_value` and `currency` are stored in the `deals` table
**And** an `audit_log` entry records the won/lost event with the actor's user ID

**Given** deals are captured over 30 days
**When** the owner views the ROI analytics widget
**Then** it displays: total deal value (ZAR), average deal value, won vs lost ratio, and total bookings that converted to won

**Given** the ROI reporting endpoint is called
**When** `/api/analytics/roi?period=30d` is called
**Then** it returns booking conversion rate, automation rate, average deal value, and total attributed revenue

---

### Story 5.3: Sentiment Analysis & Drop-Off Classification

As a dealership manager,
I want to see sentiment trends and understand why leads drop off,
So that I can improve AI prompts and human handoff strategies.

**Acceptance Criteria:**

**Given** a conversation is processed by LangGraph
**When** the structured output includes a `sentiment` value (`positive`, `neutral`, `negative`)
**Then** it is stored in `ai_metrics.sentiment` for that conversation

**Given** a conversation ends without a booking or qualification
**When** LangGraph classifies the drop-off
**Then** `ai_metrics.dropoff_reason` is populated with one of: `price`, `stock_unavailable`, `finance_fail`, `unresponsive`, `not_interested`

**Given** the analytics page loads
**When** I view the Sentiment section
**Then** a line chart displays sentiment trend (positive/neutral/negative counts) over time
**And** a "Negative Sentiment Queue" list shows the 10 most recent conversations with negative sentiment, each linkable to the conversation detail

**Given** the analytics page loads
**When** I view the Drop-off Reasons section
**Then** a bar chart shows the distribution of `dropoff_reason` values for the selected period

---

### Story 5.4: Overview Analytics Dashboard & SLA Metrics

As a dealership owner or manager,
I want a dashboard showing the full conversion funnel, SLA compliance (P50/P95), and lead temperature distribution,
So that I can monitor business health at a glance.

**Acceptance Criteria:**

**Given** the analytics dashboard loads
**When** the Overview section renders
**Then** four `MetricCard` components display: Total Conversations (+ delta), Leads Generated (+ conversion rate), Test Drives Booked (+ show-up rate), AI Automation Rate (+ delta vs last week)
**And** each MetricCard shows threshold-based colour coding (green/amber/red left-border accent) per the UX spec

**Given** the dashboard loads
**When** I view the Conversion Funnel chart
**Then** the `AIPerformanceFunnel` component renders with stages: Conversation Started → First AI Response → Lead Qualification → Quote/Test Drive Offer → Booking/Outcome
**And** each stage shows count and % conversion from the previous stage
**And** drop-off reasons are annotated below each bar
**And** a "Flag for Improvement" action button is available

**Given** the analytics dashboard loads
**When** I view the SLA section
**Then** P50 and P95 first-response times are displayed (time from inbound message to first AI response)
**And** an SLA breach alert fires if P95 > configurable threshold (default 2 minutes)

**Given** the Lead Temperature Distribution chart renders
**When** I view it
**Then** a bar chart shows HOT/WARM/COOL/COLD counts for the selected period with Command Blue styling

---

## Epic 6: System Health & Integration Reliability

Managers can see real-time integration health. Failed events are visible, retryable, and dead-lettered.

### Story 6.1: Integration Event Persistence & Retry Engine

As a platform engineer,
I want all integration events persisted with status tracking, and failed events retried with exponential backoff,
So that no lead is ever silently lost due to a transient failure.

**Acceptance Criteria:**

**Given** any inbound webhook event is received
**When** it is processed
**Then** an `integration_events` record is created with `source`, `event_type`, `payload_json`, `status`, `retries`, and `error` fields
**And** `status` transitions: `received` → `processed` (success) or `received` → `failed` (after all retries exhausted)

**Given** event processing fails (e.g., database write error)
**When** the retry engine runs
**Then** the event is retried up to 3 times with exponential backoff (1s, 2s, 4s delays)
**And** after all retries fail, `status` is set to `dead_letter`
**And** a Grafana alert fires if dead letter queue depth exceeds 10 events

**Given** an event has `status: 'dead_letter'`
**When** an admin or manager triggers a manual replay via the UI
**Then** the event `status` resets to `received` and is reprocessed from the beginning

---

### Story 6.2: System Health Dashboard (Tenant View)

As a dealership manager,
I want a System Health page showing the status of all integrations with failure rates and latency,
So that I know immediately when a channel goes down and can act before leads are lost.

**Acceptance Criteria:**

**Given** the System Health page loads
**When** I view the Integration Health section
**Then** each integration (ManyChat, Meta Lead Ads, SMS/Twilio) shows a status indicator: green (>99% success), yellow (95–99%), red (<95%)
**And** failed event count (last 24 hours), dead letter queue size, and average processing latency are displayed per integration

**Given** an integration has failed events
**When** I click on that integration row
**Then** a detail panel shows the last 10 failed events with: event type, error message, retry count, and timestamp
**And** each event has a "Replay" button

**Given** the System Health page is loading
**When** SSE updates arrive
**Then** the status indicators update in real-time without a page refresh

---

## Epic 7: Admin Application — Tenant Operations

Platform administrators can onboard dealerships, manage tenant status, view cross-tenant analytics, monitor system health, track costs, and support tenants.

### Story 7.1: Admin Authentication

As a platform administrator,
I want to log in to the Admin application with a separate email and password,
So that admin access is completely decoupled from tenant user accounts.

**Acceptance Criteria:**

**Given** an `admin_users` record exists in the database
**When** the admin POSTs to `/admin/api/auth/login` with correct credentials
**Then** a JWT is issued signed with `ADMIN_JWT_SECRET` (different from tenant JWT secret) with `role: 'superuser'`
**And** the JWT expires in 8 hours

**Given** the admin is inactive for 30 minutes
**When** they attempt any action
**Then** the session expires and they are redirected to the admin login page

**Given** an admin action is performed (create tenant, pause tenant, etc.)
**When** the action completes
**Then** an `admin_audit_log` entry is created with `admin_user_id`, `action`, `entity_type`, `entity_id`, `tenant_id`, and timestamp

**Given** invalid admin credentials are submitted
**When** login is attempted
**Then** HTTP 401 is returned with no information about whether the email exists (enumeration prevention)

---

### Story 7.2: Tenant Onboarding Wizard

As a platform administrator,
I want to onboard a new dealership through a five-step wizard,
So that new tenants are fully configured and ready to use Drive Insight in under 5 minutes.

**Acceptance Criteria:**

**Given** the admin navigates to "Onboard New Tenant"
**When** the wizard loads
**Then** a 5-step form is displayed with a progress indicator showing: Dealership Info → Owner Account → Default Config → Integration Setup → Verification

**Given** the admin completes all 5 steps and clicks "Activate"
**When** the wizard finalizes
**Then** a `tenants` record is created with `status: 'active'`
**And** an owner Supabase Auth user is created with an auto-generated password and `role: 'owner'`
**And** a welcome email is sent via Resend with login credentials and instructions
**And** default routing rules and availability settings are created for the tenant
**And** a unique webhook endpoint URL is generated: `https://api.driveinsight.com/webhooks/manychat/{tenant_id}`
**And** the tenant appears immediately in the admin tenant list

**Given** the admin leaves a required field empty
**When** they attempt to proceed to the next step
**Then** clear inline validation errors appear below the relevant fields and the step does not advance

---

### Story 7.3: Tenant Management (List, Pause, Suspend, Reactivate)

As a platform administrator,
I want to view all tenants and manage their operational status,
So that I can respond to billing issues, violations, or support requests without touching the database directly.

**Acceptance Criteria:**

**Given** the admin navigates to the Tenant List
**When** the page loads
**Then** a searchable, filterable table shows all tenants with columns: Name, Branch, Status badge (green/yellow/red), Created Date, Last Activity, Total Conversations
**And** a search input filters the list by name or branch in real-time

**Given** the admin clicks "Pause" on an active tenant
**When** they confirm the action
**Then** `tenants.status` is set to `paused`
**And** tenant users cannot log in (Supabase Auth returns 403)
**And** inbound webhooks are accepted but queued (not processed)
**And** an `admin_audit_log` entry is created

**Given** the admin clicks "Reactivate" on a paused tenant
**When** they confirm
**Then** `tenants.status` is set to `active`
**And** queued webhooks are processed in order
**And** tenant users can log in again

**Given** the admin initiates a hard delete
**When** they type the tenant name for confirmation and confirm
**Then** all tenant data (conversations, leads, bookings, messages) is permanently deleted
**And** a backup is created before deletion
**And** the action is logged with `action: 'HARD_DELETE'` in `admin_audit_log`

---

### Story 7.4: Cross-Tenant Analytics & Tenant Impersonation

As a platform administrator,
I want to see aggregate metrics across all dealerships and drill into any tenant's dashboard in read-only mode,
So that I can identify underperforming tenants and support them proactively.

**Acceptance Criteria:**

**Given** the admin navigates to the Analytics page
**When** it loads
**Then** aggregate metric cards display: Total Conversations (all tenants, last 30 days), Total Leads, Total Bookings, Average Automation Rate
**And** a tenant performance comparison table shows automation rate, booking conversion rate, and SLA compliance ranked by tenant

**Given** the admin clicks a tenant name in the comparison table
**When** the drill-down loads
**Then** the tenant's own analytics dashboard is displayed in read-only mode
**And** a persistent banner shows: "Admin View — Read Only — [Tenant Name]"
**And** no edit, delete, or assign actions are available

**Given** the admin views cross-tenant analytics
**When** they click "Export to CSV"
**Then** a CSV file downloads with all tenant metrics for the selected period

---

### Story 7.5: Admin System Health & Cost Tracking

As a platform administrator,
I want to see platform-wide system health and per-tenant cost breakdowns,
So that I can proactively identify infrastructure issues and manage cost anomalies before they escalate.

**Acceptance Criteria:**

**Given** the admin navigates to System Health
**When** the page loads
**Then** status indicators show: Supabase database status, n8n uptime, ManyChat API connectivity, Twilio/Meta API status
**And** recent errors are listed by tenant with severity badges and error type categorisation
**And** API response time charts (P50, P95, P99) are displayed for the last 24 hours

**Given** the admin navigates to Cost Tracking
**When** the page loads
**Then** a per-tenant cost breakdown table shows: Supabase storage, DB row counts, n8n executions, LLM token usage, external API costs
**And** a platform-wide cost summary shows total costs, cost per tenant (average), and cost per conversation

**Given** a tenant exceeds a configured storage threshold
**When** the cost monitoring check runs
**Then** an alert notification appears on the admin dashboard with the tenant name and usage details
