# Epic 5: Deals, ROI & Analytics

Owners and managers can see automation rate, booking conversion funnel, sentiment trends, drop-off reasons, won/lost deals, and SLA compliance.

## Story 5.1: AI Metrics Schema & Automation Rate Calculation

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

## Story 5.2: Won/Lost Deal Capture & ROI Reporting

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

## Story 5.3: Sentiment Analysis & Drop-Off Classification

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

## Story 5.4: Overview Analytics Dashboard & SLA Metrics

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
