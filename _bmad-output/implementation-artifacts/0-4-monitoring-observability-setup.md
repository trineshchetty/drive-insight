---
story_id: 0-4-monitoring-observability-setup
epic: Epic 0 - Project Foundation & Infrastructure
title: Monitoring & Observability Setup
status: in-progress
created: 2026-02-22
---

# Story 0.4: Monitoring & Observability Setup

## User Story

As a developer,
I want structured logs shipping to Grafana Cloud Loki and Prometheus metrics pushing to Grafana Cloud,
So that I can debug production issues and track system health from day one.

## Acceptance Criteria

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

## Technical Requirements

### Logging
- Winston logger configured for NestJS API
- Grafana Cloud Loki integration via winston-loki transport
- Structured JSON logging with context labels:
  - `app`: Application name (e.g., "drive-insight-api")
  - `environment`: Current environment (development/production)
  - `tenant_id`: Current tenant context (when available)
- Log levels: error, warn, info, debug
- Logs shipped within 30 seconds to Grafana Cloud

### Metrics
- Prometheus client library for Node.js
- Push metrics to Grafana Cloud every 15 seconds
- Custom metrics to implement:
  - `http_request_duration_seconds` (Histogram): HTTP request latency
    - Labels: method, route, status_code, tenant_id
  - `http_requests_total` (Counter): Total HTTP requests
    - Labels: method, route, status_code, tenant_id
  - `conversations_total` (Counter): Total conversations created
    - Labels: tenant_id, channel
  - `llm_cost_total` (Counter): Cumulative LLM API costs
    - Labels: tenant_id, model

### Alerting
- Grafana Cloud alert configured for error rate threshold
- Trigger: >10 errors/second sustained for 5 minutes
- Notification channel: Slack `#alerts` channel
- Alert includes: tenant_id, error type, affected endpoint

### API Documentation
- Swagger/OpenAPI integration via `@nestjs/swagger`
- Available at `/api/docs` in development environment
- Auto-generated from NestJS decorators
- Includes request/response schemas, authentication requirements

## Implementation Tasks

### 1. Winston Logger Setup
- [ ] Install winston and winston-loki packages
- [ ] Create `LoggerModule` in NestJS
- [ ] Configure winston transports (Console + Loki)
- [ ] Add Grafana Cloud Loki credentials to environment variables
- [ ] Create custom logger service with context injection
- [ ] Add middleware to inject `tenant_id` into logger context
- [ ] Test log output to Grafana Cloud Loki

### 2. Prometheus Metrics Setup
- [ ] Install `prom-client` package
- [ ] Create `MetricsModule` in NestJS
- [ ] Configure Prometheus push gateway client
- [ ] Add Grafana Cloud Prometheus credentials to environment variables
- [ ] Implement custom metrics collectors:
  - HTTP request duration histogram
  - HTTP request counter
  - Conversation counter
  - LLM cost counter
- [ ] Create middleware to instrument HTTP requests
- [ ] Set up 15-second push interval
- [ ] Test metrics appearing in Grafana Cloud

### 3. Grafana Cloud Configuration
- [ ] Create Grafana Cloud account (or use existing)
- [ ] Generate Loki API credentials
- [ ] Generate Prometheus API credentials
- [ ] Configure alert rule for error rate >10/sec for 5min
- [ ] Set up Slack webhook integration for `#alerts` channel
- [ ] Create initial dashboard with key metrics:
  - Request rate per endpoint
  - Error rate over time
  - P50/P95/P99 latency
  - Conversation volume by tenant
  - LLM cost tracking

### 4. Swagger Documentation
- [ ] Install `@nestjs/swagger` package
- [ ] Configure Swagger module in `main.ts`
- [ ] Set up document builder with API metadata
- [ ] Ensure Swagger UI only available in development
- [ ] Add API decorators to existing controllers
- [ ] Test Swagger UI at `/api/docs`

### 5. Environment Configuration
- [ ] Add environment variables to `.env.example`:
  ```
  # Grafana Cloud Loki
  LOKI_HOST=
  LOKI_USERNAME=
  LOKI_PASSWORD=

  # Grafana Cloud Prometheus
  PROMETHEUS_PUSH_GATEWAY=
  PROMETHEUS_USERNAME=
  PROMETHEUS_PASSWORD=

  # Alerting
  SLACK_WEBHOOK_URL=
  ```
- [ ] Update Docker Compose with environment variables
- [ ] Document setup instructions in README

### 6. Testing & Validation
- [ ] Generate test logs and verify in Grafana Loki
- [ ] Make API requests and verify metrics in Grafana Prometheus
- [ ] Manually trigger error threshold and verify Slack alert
- [ ] Verify Swagger docs render correctly
- [ ] Verify metrics include all required labels

### 7. Review Follow-ups (AI)
- [ ] [AI-Review][HIGH] Update story file - mark completed tasks as [x] and update status from ready-for-dev to in-progress [0-4-monitoring-observability-setup.md]
- [ ] [AI-Review][HIGH] Write comprehensive tests - unit tests for LoggerService and MetricsService, integration tests for modules [apps/api/src/modules/*/]
- [ ] [AI-Review][HIGH] Implement Prometheus push to Grafana Cloud - replace warning with actual remote-write implementation [apps/api/src/modules/metrics/metrics.service.ts:79-96]
- [ ] [AI-Review][HIGH] Configure Grafana Cloud alert rule - error rate >10/sec for 5min to Slack #alerts [Grafana Cloud UI]
- [ ] [AI-Review][HIGH] Fix Winston Loki transport - add tenant_id as dynamic label, not just metadata [apps/api/src/modules/logger/logger.service.ts:35-38]
- [ ] [AI-Review][HIGH] Create tenant_id middleware - extract tenant from request and inject into logger context [apps/api/src/common/middleware/]
- [ ] [AI-Review][HIGH] Add Dev Agent Record section - create File List and Completion Notes sections in story file [0-4-monitoring-observability-setup.md]
- [ ] [AI-Review][HIGH] Fix Swagger environment check - change from NODE_ENV !== 'production' to NODE_ENV === 'development' [apps/api/src/main.ts:23]
- [ ] [AI-Review][MEDIUM] Commit story file to git - currently untracked, needs to be version controlled [git add]
- [ ] [AI-Review][MEDIUM] Validate monitoring end-to-end - test actual connection to Grafana Cloud Loki and Prometheus [Manual testing]
- [ ] [AI-Review][MEDIUM] Fix metrics route cardinality - use route template instead of dynamic path params [apps/api/src/common/middleware/http-metrics.middleware.ts:18]
- [ ] [AI-Review][MEDIUM] Write integration tests - test logger and metrics modules working together in NestJS app [apps/api/test/]
- [ ] [AI-Review][LOW] Add JSDoc comments - document public methods in LoggerService and MetricsService [apps/api/src/modules/*/]
- [ ] [AI-Review][LOW] Improve Loki error handling - use winston fallback instead of console.error [apps/api/src/modules/logger/logger.service.ts:43]

## Definition of Done

- [ ] Winston logger emits structured JSON logs to console and Grafana Cloud Loki
- [ ] All logs include `app`, `environment`, and `tenant_id` (when available) labels
- [ ] Prometheus metrics push to Grafana Cloud every 15 seconds
- [ ] Custom metrics implemented: http_request_duration_seconds, http_requests_total, conversations_total, llm_cost_total
- [ ] Grafana Cloud alert configured for error rate threshold
- [ ] Alert fires to Slack `#alerts` channel when triggered
- [ ] Swagger documentation accessible at `/api/docs` in development
- [ ] Environment variables documented in `.env.example`
- [ ] Manual testing completed and verified in Grafana Cloud
- [ ] Sprint status updated to `done`

## Dependencies

- Story 0.1: Turborepo monorepo structure (NestJS API must exist)
- Story 0.2: Docker Compose environment (for testing locally)

## Notes

- For local development, Loki/Prometheus can be optional - logs will still go to console
- Consider using Grafana Cloud free tier initially to save costs
- Alerting can be expanded later with additional rules (high latency, database connection issues, etc.)
- Metrics will be valuable for Epic 5 (Deals, ROI & Analytics) when tracking LLM costs and automation rates

## Related Requirements

- **NFR-014**: Grafana Cloud monitoring (Loki logs + Prometheus metrics) with alerting
- **From Architecture**: Winston → Grafana Cloud Loki for structured logs, Prometheus client → Grafana Cloud for metrics (push every 15s)

---

## Senior Developer Review (AI)

**Review Date:** 2026-02-26
**Reviewer:** Amelia (Dev Agent - Code Review Mode)
**Review Outcome:** 🔴 **CHANGES REQUESTED**

### Summary

Partial implementation detected with significant gaps in core acceptance criteria. The code structure is solid (logger, metrics, swagger modules implemented), but critical functionality is missing or incomplete. Story file is completely out of sync with actual progress - no tasks marked complete despite substantial code written.

**Critical Findings:**
- ❌ Zero test coverage (violates TDD red-green-refactor)
- ❌ Prometheus push to Grafana Cloud not implemented (AC #2 violation)
- ❌ Grafana Cloud alerting not configured (AC #3 violation)
- ❌ Loki labels missing tenant_id (AC #1 partial violation)
- ❌ Story file shows 0/34 tasks complete (should reflect actual progress)

**Positive Findings:**
- ✅ Winston logger structure well-designed
- ✅ Prometheus metrics collectors properly implemented
- ✅ Swagger documentation working at /api/docs
- ✅ Environment variables documented in .env.example

### Action Items

**HIGH Priority (Must Fix):**
1. [ ] Update story file - mark completed tasks as [x] and update status from ready-for-dev to in-progress [Related AC: All]
2. [ ] Write comprehensive tests - unit tests for LoggerService and MetricsService, integration tests for modules [Related AC: DoD - Testing]
3. [ ] Implement Prometheus push to Grafana Cloud - replace warning with actual remote-write implementation [Related AC: #2]
4. [ ] Configure Grafana Cloud alert rule - error rate >10/sec for 5min to Slack #alerts [Related AC: #3]
5. [ ] Fix Winston Loki transport - add tenant_id as dynamic label, not just metadata [Related AC: #1]
6. [ ] Create tenant_id middleware - extract tenant from request and inject into logger context [Related AC: #1]
7. [ ] Add Dev Agent Record section - create File List and Completion Notes sections in story file [Related AC: DoD]
8. [ ] Fix Swagger environment check - change from NODE_ENV !== 'production' to NODE_ENV === 'development' [Related AC: #4]

**MEDIUM Priority (Should Fix):**
9. [ ] Commit story file to git - currently untracked, needs to be version controlled
10. [ ] Validate monitoring end-to-end - test actual connection to Grafana Cloud Loki and Prometheus
11. [ ] Fix metrics route cardinality - use route template instead of dynamic path params
12. [ ] Write integration tests - test logger and metrics modules working together in NestJS app

**LOW Priority (Nice to Fix):**
13. [ ] Add JSDoc comments - document public methods in LoggerService and MetricsService
14. [ ] Improve Loki error handling - use winston fallback instead of console.error

**Total Action Items:** 14 (8 High, 4 Medium, 2 Low)

### Files Reviewed

**Implementation Files:**
- `apps/api/src/modules/logger/logger.service.ts` - Winston logger implementation
- `apps/api/src/modules/logger/logger.module.ts` - Logger module
- `apps/api/src/modules/metrics/metrics.service.ts` - Prometheus metrics service
- `apps/api/src/modules/metrics/metrics.module.ts` - Metrics module
- `apps/api/src/modules/metrics/metrics.controller.ts` - Metrics endpoint
- `apps/api/src/common/middleware/http-metrics.middleware.ts` - HTTP instrumentation
- `apps/api/src/app.module.ts` - Module imports and middleware setup
- `apps/api/src/main.ts` - Swagger configuration
- `.env.example` - Environment variable documentation
- `apps/api/package.json` - Dependencies

**Test Files:**
- ❌ No test files found (CRITICAL ISSUE)

### Recommendations

1. **Immediate:** Write tests before proceeding - this is non-negotiable for story completion
2. **Architecture:** Consider using Grafana Agent sidecar instead of push gateway for better Grafana Cloud integration
3. **Tenant Context:** Implement tenant extraction middleware early - impacts both logging and metrics
4. **Alerting:** Grafana Cloud alerts must be configured via UI - document credentials and access needed
5. **Story Hygiene:** Update story file regularly as work progresses - don't wait until the end

### Next Steps

Address HIGH priority issues first (especially tests and story file updates), then proceed with MEDIUM priority fixes. Story can move to "done" status only after all HIGH items are resolved and acceptance criteria are fully met.
