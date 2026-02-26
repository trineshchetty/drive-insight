# Epic 7: Admin Application — Tenant Operations

Platform administrators can onboard dealerships, manage tenant status, view cross-tenant analytics, monitor system health, track costs, and support tenants.

## Story 7.1: Admin Authentication

As a platform administrator,
I want to log in to the Admin application with a separate email and password,
So that admin access is completely decoupled from tenant user accounts.

**Acceptance Criteria:**

**Given** an `admin_users` record exists in the database
**When** the admin POSTs to `/admin/api/auth/login` with correct credentials
**Then** a JWT is issued signed with `ADMIN_JWT_SECRET` (different from tenant JWT secret) with `role: 'superuser'`
**And** the JWT expires in 8 hours

**Given** the admin is inactive for 30 minutes
**When** they attempt any action
**Then** the session expires and they are redirected to the admin login page

**Given** an admin action is performed (create tenant, pause tenant, etc.)
**When** the action completes
**Then** an `admin_audit_log` entry is created with `admin_user_id`, `action`, `entity_type`, `entity_id`, `tenant_id`, and timestamp

**Given** invalid admin credentials are submitted
**When** login is attempted
**Then** HTTP 401 is returned with no information about whether the email exists (enumeration prevention)

---

## Story 7.2: Tenant Onboarding Wizard

As a platform administrator,
I want to onboard a new dealership through a five-step wizard,
So that new tenants are fully configured and ready to use Drive Insight in under 5 minutes.

**Acceptance Criteria:**

**Given** the admin navigates to "Onboard New Tenant"
**When** the wizard loads
**Then** a 5-step form is displayed with a progress indicator showing: Dealership Info → Owner Account → Default Config → Integration Setup → Verification

**Given** the admin completes all 5 steps and clicks "Activate"
**When** the wizard finalizes
**Then** a `tenants` record is created with `status: 'active'`
**And** an owner Supabase Auth user is created with an auto-generated password and `role: 'owner'`
**And** a welcome email is sent via Resend with login credentials and instructions
**And** default routing rules and availability settings are created for the tenant
**And** a unique webhook endpoint URL is generated: `https://api.driveinsight.com/webhooks/manychat/{tenant_id}`
**And** the tenant appears immediately in the admin tenant list

**Given** the admin leaves a required field empty
**When** they attempt to proceed to the next step
**Then** clear inline validation errors appear below the relevant fields and the step does not advance

---

## Story 7.3: Tenant Management (List, Pause, Suspend, Reactivate)

As a platform administrator,
I want to view all tenants and manage their operational status,
So that I can respond to billing issues, violations, or support requests without touching the database directly.

**Acceptance Criteria:**

**Given** the admin navigates to the Tenant List
**When** the page loads
**Then** a searchable, filterable table shows all tenants with columns: Name, Branch, Status badge (green/yellow/red), Created Date, Last Activity, Total Conversations
**And** a search input filters the list by name or branch in real-time

**Given** the admin clicks "Pause" on an active tenant
**When** they confirm the action
**Then** `tenants.status` is set to `paused`
**And** tenant users cannot log in (Supabase Auth returns 403)
**And** inbound webhooks are accepted but queued (not processed)
**And** an `admin_audit_log` entry is created

**Given** the admin clicks "Reactivate" on a paused tenant
**When** they confirm
**Then** `tenants.status` is set to `active`
**And** queued webhooks are processed in order
**And** tenant users can log in again

**Given** the admin initiates a hard delete
**When** they type the tenant name for confirmation and confirm
**Then** all tenant data (conversations, leads, bookings, messages) is permanently deleted
**And** a backup is created before deletion
**And** the action is logged with `action: 'HARD_DELETE'` in `admin_audit_log`

---

## Story 7.4: Cross-Tenant Analytics & Tenant Impersonation

As a platform administrator,
I want to see aggregate metrics across all dealerships and drill into any tenant's dashboard in read-only mode,
So that I can identify underperforming tenants and support them proactively.

**Acceptance Criteria:**

**Given** the admin navigates to the Analytics page
**When** it loads
**Then** aggregate metric cards display: Total Conversations (all tenants, last 30 days), Total Leads, Total Bookings, Average Automation Rate
**And** a tenant performance comparison table shows automation rate, booking conversion rate, and SLA compliance ranked by tenant

**Given** the admin clicks a tenant name in the comparison table
**When** the drill-down loads
**Then** the tenant's own analytics dashboard is displayed in read-only mode
**And** a persistent banner shows: "Admin View — Read Only — [Tenant Name]"
**And** no edit, delete, or assign actions are available

**Given** the admin views cross-tenant analytics
**When** they click "Export to CSV"
**Then** a CSV file downloads with all tenant metrics for the selected period

---

## Story 7.5: Admin System Health & Cost Tracking

As a platform administrator,
I want to see platform-wide system health and per-tenant cost breakdowns,
So that I can proactively identify infrastructure issues and manage cost anomalies before they escalate.

**Acceptance Criteria:**

**Given** the admin navigates to System Health
**When** the page loads
**Then** status indicators show: Supabase database status, n8n uptime, ManyChat API connectivity, Twilio/Meta API status
**And** recent errors are listed by tenant with severity badges and error type categorisation
**And** API response time charts (P50, P95, P99) are displayed for the last 24 hours

**Given** the admin navigates to Cost Tracking
**When** the page loads
**Then** a per-tenant cost breakdown table shows: Supabase storage, DB row counts, n8n executions, LLM token usage, external API costs
**And** a platform-wide cost summary shows total costs, cost per tenant (average), and cost per conversation

**Given** a tenant exceeds a configured storage threshold
**When** the cost monitoring check runs
**Then** an alert notification appears on the admin dashboard with the tenant name and usage details
