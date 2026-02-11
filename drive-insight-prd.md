# PRD v0.2 — Drive Insight (Lightweight DMS Overlay + AI ROI Dashboard)
_Last updated: 2026-02-07_

## 1) Product Summary

**Drive Insight** is a lightweight “overlay” lead console for dealerships that already have a DMS/CRM. It consolidates multi-channel conversations and leads, tracks bookings (test drives + service), and quantifies **AI agent ROI** (automation rate, SLA, sentiment, conversion).  

It is intentionally **not a full DMS**. ManyChat remains the **human inbox + flow builder**; Drive Insight is the **management + ROI layer** with full transcript persistence (AI + human).

---

## 2) Locked Decisions (Confirmed)

### 2.1 Tenancy Model
- **One tenant = one dealership branch** (data fully segregated per branch).
- Example: Ford Claremont is a distinct tenant from other Ford branches.

### 2.2 Roles (MVP)
- `owner`, `manager`, `agent`
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

---

## 6) Functional Requirements

### 6.1 Tenancy & Access Control
- **FR-001** Tenant = dealership branch; strict tenant isolation using Supabase RLS.
- **FR-002** Roles: `owner`, `manager`, `agent`.
- **FR-003** Permission model:
  - owner/manager: manage users, routing rules, integrations, reporting
  - agent: manage assigned leads, add notes, update stages, create bookings, mark won/lost (optional gating)

### 6.2 Channel Ingestion & Normalization
- **FR-010** Ingest inbound + outbound messages from ManyChat (AI + human).
- **FR-011** Ingest Meta Lead Ads payloads (lead form fields + campaign metadata).
- **FR-012** Ingest SMS messages via provider webhook (Twilio first; Clickatell optional).
- **FR-013** Normalize all inbound events into canonical entities:
  - `contacts`, `conversations`, `messages`, `leads` (when applicable)
- **FR-014** Ensure idempotency using `external_message_id` / event IDs per source.

### 6.3 Conversations
- **FR-020** Conversation statuses: `active`, `completed`, `abandoned`, `human_active`.
- **FR-021** Store agent node/persona per AI message (e.g., “Master”, “Car Fit”).
- **FR-022** Transcript shows all messages: customer + AI + human.
- **FR-023** Conversation view supports search/filter by channel, status, assigned agent, date.

### 6.4 Leads & Pipeline
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

### 6.5 Bookings (Test Drive + Service)
- **FR-040** Booking types: `test_drive`, `service`.
- **FR-041** Booking statuses: `requested`, `confirmed`, `rescheduled`, `cancelled`, `no_show`, `completed`.
- **FR-042** Booking can be created by AI flow or human action.
- **FR-043** Compute show-up rate per booking type.

### 6.6 Deals Won/Lost + ROI
- **FR-050** Manual confirmation for `won`/`lost`.
- **FR-051** Deal value entered manually (currency + optional metadata).
- **FR-052** ROI reporting uses deal value + booking conversion + SLA.

### 6.7 AI ROI Instrumentation
- **FR-060** Automation rate = conversations with **no human messages**.
- **FR-061** Sentiment analysis:
  - store per-conversation sentiment
  - trend chart + negative sentiment queue
- **FR-062** Drop-off reason classification (rules or model-based):
  - e.g., price, stock unavailable, finance fail, unresponsive, not interested
- **FR-063** Lead temperature distribution chart.

### 6.8 Internal Collaboration
- **FR-070** Internal notes on leads/conversations.
- **FR-071** `@mentions` notify users in-app within tenant.

### 6.9 System Health & Reliability
- **FR-080** Persist all integration events with status + retries.
- **FR-081** Provide health view: failures, latency, delivery status per integration.
- **FR-082** Retry + dead-letter handling for failed events.

---

## 7) Real-Time Slot Checking (Bookings)

### 7.1 MVP Availability Engine (No external calendar dependency)
- Config per tenant:
  - operating days + open/close hours
  - slot duration per booking type (test drive/service)
  - buffers (before/after)
  - capacity per slot (default 1; configurable)
- System returns next available slots to the agent flow.

### 7.2 Phase 2 Calendar Integrations (Optional)
- Google Calendar / Microsoft 365 sync
- External booking system integration if dealership already uses one

**Acceptance for MVP:** system can propose and reserve slots deterministically using internal availability rules.

---

## 8) UX Requirements

### 8.1 Overview Dashboard (MVP)
Widgets:
- Total Conversations (last 30 days + delta)
- Leads Generated (+ conversion rate)
- Test Drives Booked (+ show-up rate)
- AI Automation Rate (“No human needed”)

Charts:
- Conversations Over Time (completed / active / abandoned)
- Lead Temperature (HOT/WARM/COOL/COLD)

### 8.2 Conversations
- Left: conversation list with search + filters (status/channel/agent)
- Right: transcript with sender tags (Customer / AI node / Human)
- Profile completeness indicator
Actions:
- add note + @mention
- create booking
- mark conversation completed

### 8.3 Leads
- Pipeline/table view with filters (stage/temp/channel/agent/date)
- Lead detail: summary + transcript link + booking link
Actions:
- assign/reassign
- stage updates
- won/lost + deal value

### 8.4 Bookings
- List + filters by type/status/date
- Booking detail view
- Status lifecycle transitions + show-up tagging

### 8.5 Analytics
- Funnel: conversations → leads → bookings → wins
- SLA: response time P50/P95
- AI: automation rate, sentiment trend, drop-offs

### 8.6 System Health
- Integration failures + retries
- Channel status (ManyChat/Meta/SMS/backend)
- Latency indicators

---

## 9) Data Model (Supabase)

### 9.1 Core Tables
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

### 9.2 CRM Overlay Fields
- `leads.external_source` (autohub/cms/other)
- `leads.external_lead_id`
- `leads.external_payload` (jsonb)
- `contacts.external_ids` (jsonb)

### 9.3 Security (RLS)
- All tables include `tenant_id`
- Policies enforce tenant isolation and role permissions
- Audit logging enabled for mutations

---

## 10) Architecture & Integrations

### 10.1 Stack
1) **ManyChat**: WhatsApp/Messenger flows + human inbox + mobile app  
2) **n8n**: orchestration, ingestion, retries, persistence  
3) **LangGraph**: agentic logic + classification + structured outputs  
4) **Supabase**: auth + RLS + primary datastore  
5) **Pinecone**: RAG / vector store (optional for MVP depending on need)  
6) **Hostinger**: hosting (Node.js or Python backend + UI)

### 10.2 Canonical Event Flow
1) ManyChat event → n8n webhook  
2) n8n persists raw event → `integration_events`  
3) n8n calls LangGraph service with conversation context  
4) LangGraph returns:
   - response text
   - structured outputs: intent, qualification fields, temperature, booking proposal
5) n8n posts response back to ManyChat  
6) n8n persists AI message + structured outputs to Supabase  
7) Human agent replies in ManyChat → must stream back to n8n and persist to `messages`

### 10.3 Reliability Requirements
- At-least-once processing with idempotency
- Dead-letter queue strategy for repeated failures
- Ordering strategy for message sequencing

---

## 11) Acceptance Criteria (MVP “Done”)
- Tenant isolation enforced (RLS verified)
- Overview, Conversations, Leads, Bookings, Analytics, System Health are usable
- Conversations show complete transcript including human ManyChat replies
- Automation rate correctly computed as “no human message sent”
- Lead pipeline supports assignment + stage updates
- Booking availability engine proposes real-time slots (internal rules)
- Won/lost + deal value captured and reflected in analytics
- Notes + @mentions work within tenant
- Integration events logged with retries and visible in System Health

---

## 12) Open Questions (Build Blockers)
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
