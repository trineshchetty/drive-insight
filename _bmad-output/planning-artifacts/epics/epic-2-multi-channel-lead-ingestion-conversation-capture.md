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

## Story 2.6: LangGraph Service Foundation & AI Agent Node Metadata

As a platform engineer,
I want the LangGraph service initialized with a basic conversation processing graph,
So that webhook ingestion can extract AI agent node metadata for message storage and future AI-driven workflows can build on this foundation.

**Acceptance Criteria:**

**Given** the NestJS API is running
**When** I inspect the module structure
**Then** `apps/api/src/modules/langraph/` exists with files: `langraph.module.ts`, `langraph.service.ts`, `langraph.types.ts`
**And** the `LangGraphModule` is imported into the main `AppModule`

**Given** the LangGraph service is initialized
**When** the application bootstraps
**Then** a `StateGraph` is compiled with three nodes: `classifier`, `qualifier`, `booking_agent`
**And** the graph entry point is set to `classifier`
**And** state channels are defined: `messages`, `intent`, `temperature`, `agent_node`

**Given** LangChain dependencies are needed
**When** I inspect `apps/api/package.json`
**Then** dependencies include: `@langchain/langgraph@^latest`, `@langchain/openai@^latest`, `@langchain/core@^latest`
**And** `pnpm install` completes without errors

**Given** environment variables are configured
**When** I inspect `.env.local` and Docker Compose
**Then** `OPENAI_API_KEY` is present and valid
**And** `LANGCHAIN_TRACING_V2` (optional) is configurable for debugging

**Given** a conversation event needs AI processing
**When** `LangGraphService.extractAgentNode(messagePayload)` is called
**Then** it returns a string identifying which AI agent node handled the message (e.g., `"classifier"`, `"Car Fit"`, `"Master"`)
**And** if the message is from a human or customer, it returns `null`

**Given** the service processes a test message
**When** `LangGraphService.processConversation({ messages: [...] })` is called (integration test)
**Then** the graph invokes successfully without errors
**And** the response includes `{ agent_node: string, intent?: string }`
**And** no actual LLM calls are made (mocked OpenAI client in tests)

**Given** the API is running in local development
**When** I trigger a test webhook event via `POST /api/webhooks/test`
**Then** the LangGraph service logs: `"LangGraph graph compiled successfully"` on startup
**And** Winston logs include `langraph` as a context label

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

## Story 2.7: LangGraph Cost Tracking & Prometheus Metrics

As a platform engineer,
I want LLM token usage and costs tracked per conversation and tenant,
So that we can monitor AI spending, prevent cost overruns, and meet NFR-010 and NFR-011 requirements.

**Acceptance Criteria:**

**Given** migrations are applied
**When** I inspect the database schema
**Then** the `cost_tracking` table exists with columns: `id`, `tenant_id`, `conversation_id`, `service` (VARCHAR), `operation` (VARCHAR), `model` (VARCHAR), `tokens_used` (INT), `cost_usd` (DECIMAL), `created_at`
**And** index `idx_cost_tracking_tenant_service` exists on `(tenant_id, service, created_at DESC)`

**Given** the LangGraph service makes an OpenAI API call
**When** `processConversation()` completes
**Then** a record is inserted into `cost_tracking` with:
- `service: 'openai'`
- `operation: 'chat_completion'`
- `model: 'gpt-4o-mini'` (or configured model)
- `tokens_used`: Total tokens from response
- `cost_usd`: Calculated based on model pricing
**And** the `conversation_id` is linked

**Given** cost tracking is enabled
**When** a conversation processes 3 messages through LangGraph
**Then** 3 separate `cost_tracking` records exist (one per LLM call)
**And** each record has a unique `id` and timestamp

**Given** Prometheus metrics are configured (from Epic 0 Story 0-4)
**When** the LangGraph service tracks a cost
**Then** the `llmCostTotal` counter is incremented with labels: `{ tenant_id, model, operation }`
**And** Grafana Cloud receives the metric on the next 15-second push

**Given** the analytics API is called
**When** `GET /api/analytics/costs?tenantId=<uuid>&period=7d` is requested
**Then** it returns aggregated cost data:
```json
{
  "total_cost_usd": 2.45,
  "total_tokens": 125000,
  "breakdown_by_model": [
    { "model": "gpt-4o-mini", "cost_usd": 2.45, "tokens": 125000 }
  ],
  "period": "7d"
}
```

**Given** a tenant exceeds 50% of their monthly token budget
**When** the cost tracking service computes the threshold
**Then** an alert event is emitted (logged to Winston with `level: 'warn'`)
**And** the alert includes: `{ tenant_id, usage_percent: 52, threshold: 50, budget_remaining_usd: 24.50 }`
*Note: Alert delivery (email/Slack) is deferred to Epic 6*

**Given** LLM calls are mocked in tests
**When** integration tests run
**Then** cost tracking records are created with mock token counts
**And** tests validate the `cost_usd` calculation formula matches OpenAI pricing

---

## Story 2.8: LangGraph Structured Output Schema for Webhook Integration

As a webhook integration developer,
I want the LangGraph service to return structured metadata when processing ManyChat messages,
So that Story 2.2 can store `ai_agent_node` data and future stories can consume qualification signals.

**Acceptance Criteria:**

**Given** the LangGraph service is configured
**When** I inspect `apps/api/src/modules/langraph/langraph.types.ts`
**Then** a `ConversationOutput` interface exists:
```typescript
export interface ConversationOutput {
  agent_node: string | null;        // "classifier", "qualifier", "booking_agent", null
  intent?: 'inquiry' | 'objection' | 'booking_request' | 'qualification';
  qualified?: boolean;               // true if qualification threshold met
  temperature?: 'HOT' | 'WARM' | 'COOL' | 'COLD';
  sentiment?: 'positive' | 'neutral' | 'negative';
  dropoff_reason?: string;           // populated if conversation ends
  tokens_used: number;
  cost_usd: number;
}
```

**Given** a ManyChat webhook event is processed (Story 2.2)
**When** the event processor calls `LangGraphService.analyzeMessage(message, conversationContext)`
**Then** it returns a `ConversationOutput` object
**And** `agent_node` is extracted from the LangGraph state
**And** if the message is customer-sent, `agent_node` is `null`
**And** if the message is AI-generated, `agent_node` matches the node that produced it

**Given** the webhook processor receives an AI message from ManyChat
**When** the message payload contains: `{ sender_type: 'ai', node_name: 'Car Fit' }`
**Then** `LangGraphService.extractAgentNode()` returns `"Car Fit"`
**And** this value is stored in `messages.ai_agent_node`

**Given** the LangGraph `classifier` node runs (basic implementation)
**When** a customer message contains "book a test drive"
**Then** the structured output includes: `{ intent: 'booking_request', agent_node: 'classifier' }`
**And** the graph routes to the `booking_agent` node on the next invocation

**Given** the LangGraph `qualifier` node runs (basic implementation)
**When** a customer provides: name, phone, vehicle interest
**Then** the structured output includes: `{ qualified: true, temperature: 'HOT', agent_node: 'qualifier' }`
**And** this data is available for Epic 3 Story 3.1 (Lead Creation)

**Given** a conversation processes through the graph
**When** multiple messages are analyzed sequentially
**Then** the graph maintains state between invocations
**And** previous `intent` and `temperature` values are accessible in state channels
**And** the final output reflects cumulative analysis

**Given** the LangGraph service is tested
**When** unit tests run for `analyzeMessage()`
**Then** mock LLM responses return deterministic structured outputs
**And** tests validate all fields in `ConversationOutput` are correctly populated
**And** tests cover edge cases: empty messages, malformed payloads, missing context

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
