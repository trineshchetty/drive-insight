# PRD v0.3 — Drive Insight (Lightweight DMS Overlay + AI ROI Dashboard)
_Last updated: 2026-02-11_

## 1) Product Summary

**Drive Insight** is a lightweight “overlay” lead console for dealerships that already have a DMS/CRM. It consolidates multi-channel conversations and leads, tracks bookings (test drives + service), and quantifies **AI agent ROI** (automation rate, SLA, sentiment, conversion).  

It is intentionally **not a full DMS**. ManyChat remains the **human inbox + flow builder**; Drive Insight is the **management + ROI layer** with full transcript persistence (AI + human).

---

## 2) Locked Decisions (Confirmed)

### 2.1 Tenancy Model
- **One tenant = one dealership branch** (data fully segregated per branch).
- Example: Ford Claremont is a distinct tenant from other Ford branches.

### 2.2 Roles (MVP)
- **Tenant Roles**: `owner`, `manager`, `agent`
- **Superuser Role**: `admin` (cross-tenant access for platform management)
- Agent profiles include **working hours + availability** (routing + SLA).

### 2.3 Channels (MVP scope)
- WhatsApp + Messenger chats via ManyChat
- Meta Lead Ads ingestion
- SMS (Twilio default; Clickatell optional later)

### 2.4 CRM/DMS Overlay Approach
- Track:
  1) **AI-touched** conversations/leads (native)
  2) **CRM-originated** leads (ingested) for unified pipeline visibility

### 2.5 Automation Rate Definition
- **Automation rate = “no human message sent”** within a conversation.

### 2.6 Lead Temperature
- **Rules-based engine** (HOT/WARM/COOL/COLD) is sufficient for MVP.

### 2.7 Handover
- **ManyChat handles human takeover** (agent inbox + mobile app).
- Drive Insight does **not** perform handover; it shows transcripts + management actions.
- Requirement: **persist all ManyChat messages (AI + human) in `messages`**.

### 2.8 Data Retention
- **12 months** retention per tenant.

### 2.9 Integrations
- Target systems: **AutoHub**, SA “CMS” lead systems, generic CRMs
- MVP integration story: **CSV export + Webhooks**

---

## 3) Goals, Non-Goals, Success Metrics

### 3.1 Goals
- Unified view of conversations + leads across channels + external CRM ingestion
- Quantify AI agent ROI (automation rate, SLA, sentiment, conversion)
- Minimal dealership behavior change (continue using ManyChat inbox)
- Tuning loop to improve prompts/flows based on evidence

### 3.2 Non-Goals (MVP)
- Full DMS modules (inventory, workshop job cards, accounting, parts)
- End-to-end finance origination workflow (intent capture + route only)
- Replacement of dealership CRM/DMS

### 3.3 Success Metrics (Primary)
- **Speed-to-lead**: P50/P95 time from inbound to first response (AI vs human)
- **Automation rate**: % conversations with zero human messages
- **Booking conversion**: conversations → bookings (test drive/service)
- **Show-up rate**: confirmed bookings → completed/no-show
- **Sales attribution**: bookings → won (manual confirmation + deal value)

### 3.4 Success Metrics (Secondary)
- Lead temperature distribution
- Sentiment trends; negative sentiment queue
- Drop-off reasons + funnel abandonment
- Agent workload distribution + SLA compliance

---

## 4) Personas & Key Use Cases

### 4.1 Personas
- **Owner/Dealer Principal**: ROI + conversion + AI performance
- **Manager**: pipeline visibility, SLA, assignments, outcomes
- **Agent**: transcripts, notes, follow-up actions, lead status updates
- **Service Advisor** (role may be later): service bookings + details
- **Marketing/CRM Coordinator**: channel + campaign attribution
- **Platform Administrator (Superuser)**: tenant onboarding, cross-tenant analytics, system operations

### 4.2 Core Use Cases (MVP)
1) View unified lead + conversation inbox across channels
2) Ingest CRM leads for a single pipeline view (overlay)
3) AI books test drives/service appointments via flows; reflected in dashboard
4) Agents confirm deals won/lost and enter deal value manually
5) Review sentiment/drop-offs to tune prompts and agent design

---

## 5) Scope

### 5.1 MVP Modules
- **Overview Dashboard**
- **Conversations** (list + transcript + metadata + notes)
- **Leads** (pipeline/table + assignment + stage management)
- **Bookings** (test drive/service + status lifecycle)
- **Analytics** (ROI + funnel + SLA)
- **System Health** (integration failures + latency)

### 5.2 Phase 2 (High value, still lightweight)
- Next Best Action (agent assist for follow-ups)
- Prompt/flow versioning + A/B experiments + evaluation
- Push outcomes to CRM (webhooks, scheduled export)
- Manager QA/coaching views (conversation review workflows)
- Calendar integrations (Google/M365) if needed

### 5.3 Admin/Superuser Application (Separate Platform Management Layer)
- **Tenant Onboarding Wizard**
- **Cross-Tenant Analytics Dashboard**
- **Tenant Management & Operations**
- **System Health & Monitoring**
- **Cost Tracking Dashboard**

---

## 6) Admin Application (Superuser Layer)

### 6.1 Purpose & Scope

The Admin Application is a **separate application** from the tenant-facing Drive Insight dashboard. It provides platform-level management capabilities for onboarding dealerships, monitoring cross-tenant health, and managing operational workflows.

**Key Characteristics:**
- **Separate codebase** (`apps/admin/` in monorepo)
- **Different authentication** (simple password-based, separate from tenant auth)
- **Cross-tenant access** (uses Supabase service role key to bypass RLS)
- **Platform operations focus** (not end-user features)

### 6.2 Authentication & Access Control

**Admin User Authentication:**
- Simple password-based authentication (no social login)
- Separate JWT secret from tenant application
- Admin credentials stored in `admin_users` table (no `tenant_id`)
- Session management with secure cookies

**Security Model:**
- Admin application uses **Supabase service role key** (bypasses RLS)
- No tenant_id context required for admin operations
- Admin actions logged in separate `admin_audit_log` table
- Rate limiting and IP allowlisting recommended for production

### 6.3 Tenant Onboarding Wizard

**Five-Step Onboarding Process:**

**Step 1: Dealership Information**
- Dealership name (e.g., "Ford Claremont")
- Branch identifier
- Primary contact details
- Business hours configuration
- Geographical location

**Step 2: Owner Account Creation**
- Owner email address
- Auto-generate initial password
- Send welcome email with login credentials
- Owner forced to change password on first login

**Step 3: Default Configuration**
- Create default routing rules
- Initialize availability engine settings (operating hours, slot durations)
- Set up default lead temperature thresholds
- Configure default automation settings

**Step 4: Integration Setup**
- Generate unique webhook endpoint URL for tenant
- Provide ManyChat configuration instructions
- Create placeholder integration records (`integration_events` table)
- Generate API keys if needed

**Step 5: Verification & Activation**
- Review all configuration
- Send activation notification to owner
- Set tenant status to `active`
- Redirect to success page with next steps

**Post-Onboarding:**
- Tenant appears in Admin Dashboard tenant list
- Owner can immediately log in to their tenant dashboard
- Integration status shows as "pending" until first event received

### 6.4 Cross-Tenant Analytics Dashboard

**Aggregate Metrics (All Dealerships):**
- Total conversations across all tenants (last 30 days)
- Total leads generated (breakdown by tenant)
- Total bookings created (test drives vs service)
- Average automation rate across platform
- Average deal value (anonymized or aggregated)

**Tenant Performance Comparison:**
- Automation rate by tenant (ranking)
- Booking conversion rate by tenant
- Response time (SLA) compliance by tenant
- Active vs inactive tenants

**Charts & Visualizations:**
- Platform-wide conversation volume over time
- Tenant activity heatmap (by day/hour)
- Channel distribution (WhatsApp vs Messenger vs SMS)
- Lead temperature distribution across platform

**Drill-Down Capability:**
- Click tenant name → view tenant-specific analytics
- View tenant's Overview Dashboard (read-only mode)
- Access individual conversations (for support/debugging)

### 6.5 Tenant Management Operations

**Tenant List View:**
- Searchable/filterable table of all tenants
- Columns: Name, Branch, Status, Created Date, Last Activity, Total Conversations, Total Leads
- Status badges: `active`, `paused`, `suspended`

**Tenant Detail View:**
- Full tenant profile information
- Configuration settings (routing, availability, integrations)
- Usage statistics (storage, API calls, message volume)
- Integration status and health
- Recent activity timeline

**Tenant Status Management:**

**Pause Tenant:**
- Temporarily disable tenant access
- Tenant users cannot log in
- Webhooks still accepted but queued (not processed)
- Use case: Temporary billing issues, maintenance

**Suspend Tenant:**
- Fully disable tenant operations
- All webhooks rejected with 403
- Tenant data preserved but inaccessible
- Use case: Contract termination, violations

**Reactivate Tenant:**
- Restore access from paused/suspended state
- Process queued webhooks (if paused)
- Send reactivation notification to owner

**Delete Tenant (Hard Delete - Caution):**
- Permanent data deletion (all conversations, leads, bookings)
- Requires confirmation with tenant name entry
- Creates backup before deletion
- Use case: GDPR deletion requests only

### 6.6 System Health & Monitoring

**Integration Health Overview:**
- Status of all tenant webhooks (per tenant)
- Failed integration events (last 24 hours)
- Dead-letter queue size
- Retry queue status

**Performance Metrics:**
- API response times (P50, P95, P99)
- Database query performance
- n8n workflow execution times
- LangGraph agent response times

**Error Monitoring:**
- Recent errors by tenant
- Error rate trends
- Top error types (categorized)
- Link to detailed error logs

**Infrastructure Status:**
- Supabase database status
- n8n uptime and queue depth
- ManyChat API connectivity
- External service status (Twilio, Meta, etc.)

### 6.7 Cost Tracking Dashboard

**Per-Tenant Cost Breakdown:**
- Supabase storage usage
- Database row counts (conversations, messages, leads)
- n8n workflow execution count
- LangGraph token usage (if metered)
- External API costs (Twilio SMS, etc.)

**Platform-Wide Cost Summary:**
- Total infrastructure costs
- Cost per tenant (average)
- Cost per conversation (unit economics)
- Projected monthly costs

**Alerts & Thresholds:**
- Tenant exceeding storage limits
- Unusual API usage patterns
- Cost anomalies (spike detection)

### 6.8 Support & Debugging Features

**Tenant Impersonation (View-Only):**
- Admin can view tenant dashboard in read-only mode
- No edit/delete operations allowed
- Clear visual indicator of admin impersonation mode
- Use case: Troubleshooting, support tickets

**Conversation Replay:**
- Access any conversation transcript across all tenants
- View full message history (AI + human)
- See structured outputs (intents, sentiment, temperature)
- Use case: Quality assurance, debugging

**Manual Data Correction:**
- Update lead stages manually (edge cases)
- Reassign conversations (if routing fails)
- Mark bookings as completed/no-show (data cleanup)
- Use case: Data integrity issues, customer support

---

## 7) Functional Requirements (Tenant Application)

### 7.1 Tenancy & Access Control
- **FR-001** Tenant = dealership branch; strict tenant isolation using Supabase RLS.
- **FR-002** Tenant Roles: `owner`, `manager`, `agent`.
- **FR-003** Permission model:
  - owner/manager: manage users, routing rules, integrations, reporting
  - agent: manage assigned leads, add notes, update stages, create bookings, mark won/lost (optional gating)

### 7.2 Channel Ingestion & Normalization
- **FR-010** Ingest inbound + outbound messages from ManyChat (AI + human).
- **FR-011** Ingest Meta Lead Ads payloads (lead form fields + campaign metadata).
- **FR-012** Ingest SMS messages via provider webhook (Twilio first; Clickatell optional).
- **FR-013** Normalize all inbound events into canonical entities:
  - `contacts`, `conversations`, `messages`, `leads` (when applicable)
- **FR-014** Ensure idempotency using `external_message_id` / event IDs per source.

### 7.3 Conversations
- **FR-020** Conversation statuses: `active`, `completed`, `abandoned`, `human_active`.
- **FR-021** Store agent node/persona per AI message (e.g., “Master”, “Car Fit”).
- **FR-022** Transcript shows all messages: customer + AI + human.
- **FR-023** Conversation view supports search/filter by channel, status, assigned agent, date.

### 7.4 Leads & Pipeline
- **FR-030** Lead created when:
  - qualification threshold met, OR
  - CRM lead imported, OR
  - manual “convert to lead”
- **FR-031** Lead stages (MVP): `new`, `qualified`, `booking_created`, `in_follow_up`, `won`, `lost`.
- **FR-032** Auto-assignment based on:
  - agent working hours + availability (preferred), OR
  - round-robin
- **FR-033** Manual assignment override.
- **FR-034** Lead temperature via rules engine: HOT/WARM/COOL/COLD.

### 7.5 Bookings (Test Drive + Service)
- **FR-040** Booking types: `test_drive`, `service`.
- **FR-041** Booking statuses: `requested`, `confirmed`, `rescheduled`, `cancelled`, `no_show`, `completed`.
- **FR-042** Booking can be created by AI flow or human action.
- **FR-043** Compute show-up rate per booking type.

### 7.6 Deals Won/Lost + ROI
- **FR-050** Manual confirmation for `won`/`lost`.
- **FR-051** Deal value entered manually (currency + optional metadata).
- **FR-052** ROI reporting uses deal value + booking conversion + SLA.

### 7.7 AI ROI Instrumentation
- **FR-060** Automation rate = conversations with **no human messages**.
- **FR-061** Sentiment analysis:
  - store per-conversation sentiment
  - trend chart + negative sentiment queue
- **FR-062** Drop-off reason classification (rules or model-based):
  - e.g., price, stock unavailable, finance fail, unresponsive, not interested
- **FR-063** Lead temperature distribution chart.

### 7.8 Internal Collaboration
- **FR-070** Internal notes on leads/conversations.
- **FR-071** `@mentions` notify users in-app within tenant.

### 7.9 System Health & Reliability
- **FR-080** Persist all integration events with status + retries.
- **FR-081** Provide health view: failures, latency, delivery status per integration.
- **FR-082** Retry + dead-letter handling for failed events.

---

## 8) Functional Requirements (Admin Application)

### 8.1 Admin Authentication & Authorization
- **FR-100** Admin users stored in separate `admin_users` table (no `tenant_id`).
- **FR-101** Simple password-based authentication with bcrypt hashing.
- **FR-102** Separate JWT secret for admin sessions.
- **FR-103** Admin actions logged in `admin_audit_log` table.
- **FR-104** Rate limiting and optional IP allowlisting for admin endpoints.

### 8.2 Tenant Onboarding
- **FR-110** Five-step onboarding wizard (dealership info, owner account, config, integrations, activation).
- **FR-111** Auto-generate unique webhook endpoint URL per tenant.
- **FR-112** Auto-generate initial password for owner account.
- **FR-113** Send welcome email with credentials and login instructions.
- **FR-114** Create default routing rules and availability settings.
- **FR-115** Set tenant status to `active` upon completion.

### 8.3 Cross-Tenant Analytics
- **FR-120** Aggregate metrics across all tenants (conversations, leads, bookings, automation rate).
- **FR-121** Tenant performance comparison (automation rate, conversion rate, SLA compliance).
- **FR-122** Platform-wide charts (conversation volume, tenant activity heatmap, channel distribution).
- **FR-123** Drill-down capability to view tenant-specific analytics.
- **FR-124** Read-only tenant dashboard impersonation for support.

### 8.4 Tenant Management
- **FR-130** Searchable/filterable tenant list view.
- **FR-131** Tenant detail view showing configuration, usage statistics, integration status.
- **FR-132** Pause tenant (disable access, queue webhooks).
- **FR-133** Suspend tenant (fully disable, reject webhooks).
- **FR-134** Reactivate tenant (restore access, process queued webhooks).
- **FR-135** Hard delete tenant with confirmation and backup (GDPR compliance).

### 8.5 System Health Monitoring
- **FR-140** Integration health overview (webhook status, failed events, retry queue).
- **FR-141** Performance metrics dashboard (API response times, DB query performance, n8n execution times).
- **FR-142** Error monitoring (recent errors by tenant, error rate trends, categorized error types).
- **FR-143** Infrastructure status indicators (Supabase, n8n, ManyChat, external services).

### 8.6 Cost Tracking
- **FR-150** Per-tenant cost breakdown (storage, row counts, workflow executions, API costs).
- **FR-151** Platform-wide cost summary (total costs, cost per tenant, cost per conversation).
- **FR-152** Alerts for tenants exceeding thresholds or unusual usage patterns.

### 8.7 Support & Debugging
- **FR-160** Tenant impersonation in read-only mode with visual indicator.
- **FR-161** Cross-tenant conversation replay (access any conversation transcript).
- **FR-162** Manual data correction capabilities (lead stages, conversation reassignment, booking status).

---

## 9) Real-Time Slot Checking (Bookings)

### 9.1 MVP Availability Engine (No external calendar dependency)
- Config per tenant:
  - operating days + open/close hours
  - slot duration per booking type (test drive/service)
  - buffers (before/after)
  - capacity per slot (default 1; configurable)
- System returns next available slots to the agent flow.

### 9.2 Phase 2 Calendar Integrations (Optional)
- Google Calendar / Microsoft 365 sync
- External booking system integration if dealership already uses one

**Acceptance for MVP:** system can propose and reserve slots deterministically using internal availability rules.

---

## 10) UX Requirements (Tenant Application)

### 10.1 Overview Dashboard (MVP)
Widgets:
- Total Conversations (last 30 days + delta)
- Leads Generated (+ conversion rate)
- Test Drives Booked (+ show-up rate)
- AI Automation Rate (“No human needed”)

Charts:
- Conversations Over Time (completed / active / abandoned)
- Lead Temperature (HOT/WARM/COOL/COLD)

### 10.2 Conversations
- Left: conversation list with search + filters (status/channel/agent)
- Right: transcript with sender tags (Customer / AI node / Human)
- Profile completeness indicator
Actions:
- add note + @mention
- create booking
- mark conversation completed

### 10.3 Leads
- Pipeline/table view with filters (stage/temp/channel/agent/date)
- Lead detail: summary + transcript link + booking link
Actions:
- assign/reassign
- stage updates
- won/lost + deal value

### 10.4 Bookings
- List + filters by type/status/date
- Booking detail view
- Status lifecycle transitions + show-up tagging

### 10.5 Analytics
- Funnel: conversations → leads → bookings → wins
- SLA: response time P50/P95
- AI: automation rate, sentiment trend, drop-offs

### 10.6 System Health
- Integration failures + retries
- Channel status (ManyChat/Meta/SMS/backend)
- Latency indicators

---

## 11) UX Requirements (Admin Application)

### 11.1 Admin Login
- Simple login form (email + password)
- Session timeout after 30 minutes of inactivity
- "Remember me" option (optional for MVP)

### 11.2 Tenant Onboarding Wizard
- Multi-step form with progress indicator (5 steps)
- Form validation with clear error messages
- Summary/review page before final activation
- Success page with tenant credentials and next steps

### 11.3 Tenant List & Management
- Searchable/filterable data table (by name, status, date)
- Status badge colors (green: active, yellow: paused, red: suspended)
- Quick actions dropdown (view, pause, suspend, delete)
- Click tenant row → navigate to tenant detail page

### 11.4 Cross-Tenant Analytics Dashboard
- Grid layout with aggregate metric cards
- Interactive charts (click to drill down)
- Tenant performance comparison table
- Export to CSV functionality

### 11.5 System Health Overview
- Status indicators (green/yellow/red dots)
- Recent errors list with severity badges
- Performance metrics charts (line charts for trends)
- Integration health table with retry counts

### 11.6 Cost Tracking Dashboard
- Per-tenant cost breakdown table
- Platform-wide cost summary cards
- Cost trend charts (monthly comparison)
- Alert notifications for threshold breaches

---

## 12) Data Model (Supabase)

### 12.1 Core Tables (Tenant Data)
- `tenants`
- `users` (Supabase auth mapping)
- `agent_profiles` (working hours, availability, routing weight)
- `contacts`
- `conversations`
- `messages`
- `leads`
- `bookings`
- `deals`
- `notes` (entity_type, entity_id, body, mentions[])
- `ai_metrics` (conversation_id, sentiment, dropoff_reason, temperature, automation_flag, prompt_version, flow_version)
- `integration_events` (source, event_type, payload_json, processed_at, status, retries, error)
- `audit_log` (actor_user_id, action, entity_type, entity_id, before/after json)

### 12.2 Admin Tables
- `admin_users` (id, email, password_hash, is_active, created_at, updated_at) — **no tenant_id**
- `admin_audit_log` (admin_user_id, action, entity_type, entity_id, tenant_id, timestamp, metadata)

### 12.3 CRM Overlay Fields
- `leads.external_source` (autohub/cms/other)
- `leads.external_lead_id`
- `leads.external_payload` (jsonb)
- `contacts.external_ids` (jsonb)

### 12.4 Security (RLS)
- All tables include `tenant_id`
- Policies enforce tenant isolation and role permissions
- Audit logging enabled for mutations

---

## 13) Architecture & Integrations

### 13.1 Stack
1) **ManyChat**: WhatsApp/Messenger flows + human inbox + mobile app  
2) **n8n**: orchestration, ingestion, retries, persistence  
3) **LangGraph**: agentic logic + classification + structured outputs  
4) **Supabase**: auth + RLS + primary datastore  
5) **Pinecone**: RAG / vector store (optional for MVP depending on need)  
6) **Hostinger**: hosting (Node.js or Python backend + UI)

### 13.2 Canonical Event Flow
1) ManyChat event → n8n webhook  
2) n8n persists raw event → `integration_events`  
3) n8n calls LangGraph service with conversation context  
4) LangGraph returns:
   - response text
   - structured outputs: intent, qualification fields, temperature, booking proposal
5) n8n posts response back to ManyChat  
6) n8n persists AI message + structured outputs to Supabase  
7) Human agent replies in ManyChat → must stream back to n8n and persist to `messages`

### 13.3 Reliability Requirements
- At-least-once processing with idempotency
- Dead-letter queue strategy for repeated failures
- Ordering strategy for message sequencing

---

## 14) Acceptance Criteria (MVP "Done")

### 14.1 Tenant Application
- Tenant isolation enforced (RLS verified)
- Overview, Conversations, Leads, Bookings, Analytics, System Health are usable
- Conversations show complete transcript including human ManyChat replies
- Automation rate correctly computed as "no human message sent"
- Lead pipeline supports assignment + stage updates
- Booking availability engine proposes real-time slots (internal rules)
- Won/lost + deal value captured and reflected in analytics
- Notes + @mentions work within tenant
- Integration events logged with retries and visible in System Health

### 14.2 Admin Application
- Admin authentication working with separate JWT secret
- Five-step tenant onboarding wizard functional
- New tenants can be activated and owner receives credentials
- Cross-tenant analytics dashboard displays aggregate metrics
- Tenant list view with search/filter capabilities
- Pause/suspend/reactivate tenant operations working
- System health overview displays integration status
- Cost tracking dashboard shows per-tenant breakdown
- Admin actions logged in `admin_audit_log`

---

## 15) Open Questions (Build Blockers)
1) **Booking capacity model** for slot checking:
   - test drives: limit by demo cars, sales agents, or default 1 booking/slot?
   - service: default 1 booking/slot or configurable N parallel capacity?
2) **CRM ingestion mode** for MVP:
   - webhook push, scheduled pull, manual CSV upload, or start with CSV + webhook?
3) **ManyChat human message sync** mechanism:
   - reliable event webhook, polling, or constrained reply mechanisms?
4) **Meta Lead Ads minimum fields** for “profile completeness” (5–8 max):
   - define required fields (e.g., name, phone, vehicle interest, budget, timeframe)

---
