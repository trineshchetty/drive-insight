# Requirements Inventory

## Functional Requirements

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

## Non-Functional Requirements

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

## Additional Requirements

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

## FR Coverage Map

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
