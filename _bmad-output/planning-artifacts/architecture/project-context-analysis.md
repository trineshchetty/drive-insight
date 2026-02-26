# Project Context Analysis

## Requirements Overview

**Functional Requirements:**

Drive Insight is a multi-tenant SaaS overlay for dealerships with 51 functional requirements spanning:

- **Tenancy & Access Control**: Branch-level tenant isolation enforced via Supabase RLS. Three roles (owner/manager/agent) with permission hierarchies for user management, routing configuration, and lead operations.

- **Multi-Channel Ingestion**: Normalized event processing from ManyChat (WhatsApp/Messenger), Meta Lead Ads, and SMS providers (Twilio/Clickatell). All inbound events canonicalized into contacts → conversations → messages → leads data model with idempotency guarantees.

- **Conversation Management**: Full transcript persistence including AI agent nodes, human takeover messages, and metadata. Conversation states (active/completed/abandoned/human_active) drive workflow routing.

- **Lead Pipeline**: Auto-qualification with rules-based temperature scoring (HOT/WARM/COOL/COLD). Auto-assignment based on agent working hours + availability. Manual stage management through new → qualified → booking_created → in_follow_up → won/lost lifecycle.

- **Bookings System**: Dual-mode (test_drive/service) with internal availability engine. Status lifecycle tracking (requested → confirmed → rescheduled → cancelled → no_show → completed) for show-up rate analytics.

- **AI ROI Instrumentation**: Automation rate calculation (zero human messages), sentiment analysis per conversation, drop-off reason classification, and lead temperature distribution for tuning loops.

- **System Reliability**: Integration event logging with retry strategies, dead-letter queues, and health dashboard for monitoring failures and latency.

**Non-Functional Requirements:**

- **Security**: Multi-tenant data isolation via RLS policies, audit logging on all mutations, secure webhook ingestion with signature verification
- **Performance**: Sub-minute response times for lead ingestion, real-time booking slot availability, P50/P95 SLA tracking
- **Reliability**: At-least-once event processing with idempotency, retry logic with exponential backoff, integration health monitoring
- **Scalability**: Support thousands of conversations/day per tenant, horizontal scaling of webhook ingestion layer
- **Data Governance**: 12-month retention policy per tenant, audit trail for compliance
- **Observability**: AI agent decision tracking, sentiment trends, drop-off analytics for continuous improvement
- **Cost Control**: Token usage monitoring, model right-sizing, caching strategies to prevent cost explosion

**Scale & Complexity:**

- **Primary domain**: Full-stack SaaS (React/Next.js frontend + Node.js/Python backend + AI orchestration + multi-channel integrations)
- **Complexity level**: HIGH (multi-tenant, real-time event processing, AI-driven workflows, third-party integration orchestration)
- **Estimated architectural components**:
  - Frontend: Dashboard + 6 main modules (Overview, Conversations, Leads, Bookings, Analytics, System Health)
  - Backend: API layer, webhook ingestion service, event processor, booking availability engine
  - AI Layer: Agentic orchestration (🚨 LangGraph vs Antigravity decision pending), sentiment classifier, temperature scorer
  - Integration Layer: ManyChat connector, Meta Lead Ads adapter, SMS provider adapters, CRM export handlers
  - Data Layer: Supabase (PostgreSQL + RLS), optional Pinecone for RAG

## Technical Constraints & Dependencies

**Existing System Integration Requirements:**
- **ManyChat** is the established human inbox and flow builder. Drive Insight must NOT replace it but rather act as the management + ROI overlay. Requirement to persist ALL ManyChat messages (AI + human) into our messages table.

**Locked Technology Decisions from PRD:**
- **Supabase**: Auth, RLS, primary datastore (PostgreSQL-based)
- **n8n**: Orchestration for webhook ingestion, event processing, and integration workflows
- **Hostinger**: Hosting platform (Node.js or Python backend support)

**Open Technology Decisions:**
- **🚨 Agentic Workflow Layer**: PRD lists LangGraph, but considering Google Antigravity or alternatives. Must evaluate on:
  - **Concurrent conversation handling**: Target 100+ simultaneous conversations
  - **Latency**: P50 <500ms, P95 <2s, P99 <5s for AI responses
  - **Cost per conversation**: Token efficiency and model optimization
  - **Prompt versioning & A/B testing**: Built-in support for experimentation
  - **Observability**: Debugging tools, structured output tracking, error tracing
  - **Framework lock-in risk**: Abstraction layer to prevent vendor lock-in
- **Pinecone**: Optional for RAG/vector store depending on context retrieval needs and cost analysis

**Integration Dependencies:**
- ManyChat API for bidirectional message sync
- Meta Lead Ads webhook for form submissions
- Twilio/Clickatell APIs for SMS
- Target CRM systems (AutoHub, SA CMS systems) for export via CSV/webhooks

## Cross-Cutting Concerns Identified

**1. Multi-Tenancy Architecture (Defense-in-Depth):**

Every table, query, and RLS policy must enforce tenant_id isolation. Agent assignment and routing rules are tenant-scoped. Integration credentials and webhook endpoints are per-tenant.

**🔒 Risk Mitigation (Pre-mortem: Tenant Data Breach):**
- Implement defense-in-depth: RLS policies + application-level middleware + API gateway tenant validation
- Mandatory adversarial testing: One tenant actively attempting to access another's data
- Zero exceptions policy: NO database query bypasses tenant_id filtering
- Monthly security audits targeting multi-tenancy boundaries
- "Multi-tenancy Checklist" for every new feature before deployment

**2. Event Ordering & Idempotency (Message Sequencing Guarantees):**

Messages from ManyChat and SMS providers may arrive out-of-order or duplicated. Architecture must handle:
- Idempotent processing using external_message_id
- Conversation sequencing to maintain transcript integrity
- Eventual consistency across conversation → lead → booking state transitions

**⚠️ Risk Mitigation (Pre-mortem: Message Ordering Chaos):**
- Add `sequence_number` field to messages table for deterministic ordering
- Implement vector clocks or lamport timestamps for distributed ordering
- Single-threaded processing per conversation_id (parallel across conversations)
- n8n workflow design: Queue-based processing with conversation-level ordering guarantees
- UI validation: Display warnings when message timestamps appear suspicious
- Testing: Simulate out-of-order webhook delivery in staging environment

**3. AI Observability & Tuning Loop (Agentic Layer Abstraction):**

The system must capture structured outputs from AI agents (sentiment, temperature, drop-off reasons, prompt versions, flow versions) to enable continuous improvement of agent design. This requires deep integration between the agentic layer and analytics pipeline.

**🚀 Risk Mitigation (Pre-mortem: Agentic Layer Meltdown):**
- Abstract agentic layer behind interface (AgenticOrchestrator) to prevent framework lock-in
- Implement semantic caching for common intents ("What are your hours?")
- RAG optimization: Only load relevant context (last N messages + customer profile, not full history)
- Circuit breaker pattern: Fallback to rule-based responses if AI layer degrades
- Cost tracking: Monitor token usage per conversation type, per AI model
- Model right-sizing: Use cheaper models (GPT-3.5-turbo, Claude Haiku) for simple classification
- Benchmark framework candidates on real conversation load before committing

**4. Real-Time Availability Computation (Booking Atomicity):**

Booking slot availability must be computed in real-time considering:
- Tenant operating hours config
- Slot duration and buffers per booking type
- Existing bookings capacity constraints
- Future: potential calendar integration (Google/M365)

**🔐 Risk Mitigation (Pre-mortem: Booking Availability Nightmare):**
- Database-level locking for booking creation using `SELECT FOR UPDATE` within transactions
- Optimistic locking with version numbers as fallback strategy
- Load testing: Concurrent booking attempts on same slot (chaos engineering)
- Business logic buffer: "Overbook by 1" with confirmation queue for edge cases
- UX pressure relief: Display "only N slots remaining" to reduce thundering herd

**5. Integration Reliability (Observability & Recovery):**

Third-party webhooks and APIs will fail. Architecture must include:
- Retry strategies with exponential backoff
- Dead-letter queue for manual intervention
- Health monitoring dashboard for operations teams
- Circuit breaker patterns to prevent cascade failures

**📊 Risk Mitigation (Pre-mortem: Integration Hell):**
- Real-time alerting (Slack/email/PagerDuty) for failed webhook processing (>5% error rate)
- Admin UI for dead letter queue: Inspect, filter, manually replay failed events
- Per-integration SLA tracking: Success rate, latency P95, dead letter queue depth
- Configurable retry policies per integration type (ManyChat vs SMS vs Lead Ads)
- Health checks measuring success rate, not just "is service up?"
- Monthly integration failure runbooks and team drills
- Chaos testing: Deliberately fail integrations to validate recovery procedures

**6. Human-in-the-Loop Handoff:**

ManyChat handles human takeover, but Drive Insight must display full context (transcript, lead data, booking history) for agents to act on. Requires real-time sync of human messages back from ManyChat to maintain complete audit trail.

**7. Regulatory & Audit Requirements:**

12-month data retention, audit logging on mutations, and potential future compliance needs (POPIA in South Africa, GDPR if expanding to EU) inform data governance architecture.

**8. Cost Controls & Budget Management:**

**💰 Risk Mitigation (Pre-mortem: Cost Explosion):**
- Implement cost monitoring dashboard: Track LLM token usage, Pinecone vector operations, Supabase compute
- Budget alerts at 50%, 75%, 90% of monthly threshold
- Model hierarchy: Use GPT-4/Claude Opus only for complex reasoning; GPT-3.5-turbo/Claude Haiku for routing/classification
- Embedding caching: Only regenerate vectors when conversation context materially changes
- Database query optimization: Connection pooling, query plan analysis, index tuning
- Batch processing where latency allows: Group embedding generation, batch CRM exports
- Monthly cost review: Cost per conversation, cost per tenant, identify optimization opportunities

## Critical Architectural Decisions to Lock In

Based on requirements analysis and pre-mortem risk mitigation, these decisions must be made early:

1. **Multi-tenancy enforcement strategy**: Defense-in-depth (RLS + middleware + API gateway) with adversarial testing
2. **Event sequencing mechanism**: Sequence numbers + ordered queue processing per conversation_id
3. **Agentic layer selection criteria**: Performance + cost + observability + abstraction to prevent lock-in
4. **Integration reliability patterns**: Retry + DLQ + real-time monitoring + admin recovery UI
5. **Booking concurrency control**: Database-level locking (SELECT FOR UPDATE) within transactions
6. **Cost monitoring approach**: Per-conversation tracking + model right-sizing + caching + budget alerts
7. **Message ordering guarantees**: Vector clocks or sequence numbers with validation in UI

---
