# Epic 2: Multi-Channel Lead Ingestion & Conversation Capture

Every conversation from WhatsApp, Messenger, Meta Lead Ads, and SMS automatically appears in Drive Insight with full transcript, correctly attributed to the right contact and channel.

## Story 2.1: Core Data Schema — Contacts, Conversations, Messages

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

## Story 2.2: ManyChat Webhook Ingestion (WhatsApp / Messenger)

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

## Story 2.3: Meta Lead Ads Ingestion

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

## Story 2.4: SMS Ingestion (Twilio)

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

## Story 2.5: Conversation View with Full Transcript

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
