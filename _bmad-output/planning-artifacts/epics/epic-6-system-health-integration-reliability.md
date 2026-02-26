# Epic 6: System Health & Integration Reliability

Managers can see real-time integration health. Failed events are visible, retryable, and dead-lettered.

## Story 6.1: Integration Event Persistence & Retry Engine

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

## Story 6.2: System Health Dashboard (Tenant View)

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
