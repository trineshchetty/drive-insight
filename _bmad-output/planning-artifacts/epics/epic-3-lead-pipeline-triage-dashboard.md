# Epic 3: Lead Pipeline & Triage Dashboard

Managers see a real-time triage dashboard with three workflow queues. They can assign leads, update stages, add notes, and jump to ManyChat.

## Story 3.1: Lead Creation & Temperature Scoring

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

## Story 3.2: Overview Dashboard — Morning Briefing & Three-Queue Triage

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

## Story 3.3: Lead Detail Panel & ManyChat Deep-Link

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

## Story 3.4: Lead Assignment (Manual & Auto)

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

## Story 3.5: Lead Stage Management & Notes

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
