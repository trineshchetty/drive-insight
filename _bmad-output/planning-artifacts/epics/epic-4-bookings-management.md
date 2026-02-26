# Epic 4: Bookings Management

Agents can confirm test drives and service appointments, track booking status, and the system computes show-up rates.

## Story 4.1: Bookings Data Schema & Availability Engine

As a platform engineer,
I want the bookings table and internal availability engine created,
So that bookings can be created and slot conflicts are prevented at the database level.

**Acceptance Criteria:**

**Given** migrations are applied
**When** I inspect the schema
**Then** the `bookings` table exists with all status enum values: `requested`, `confirmed`, `rescheduled`, `cancelled`, `no_show`, `completed`
**And** `booking_type` column supports `test_drive` and `service`
**And** an index `idx_bookings_slot_time` exists for availability queries

**Given** two concurrent booking attempts for the same slot
**When** both transactions execute simultaneously
**Then** only one booking succeeds (via `SELECT FOR UPDATE` locking within a transaction)
**And** the second attempt receives HTTP 409 Conflict with message "Slot no longer available"

**Given** a tenant's availability config (operating hours, slot duration, capacity)
**When** `/api/bookings/available-slots?type=test_drive&date=2026-02-20` is called
**Then** the API returns only slots within operating hours that have remaining capacity
**And** slots already at capacity are not returned

---

## Story 4.2: Booking Creation (AI-triggered & Manual)

As a dealership agent,
I want to create a booking for a lead from the Lead Detail Panel, and for AI-created bookings to appear automatically,
So that all bookings are tracked in one place regardless of how they were initiated.

**Acceptance Criteria:**

**Given** an agent has a lead open in the LeadDetailPanel
**When** they click "Create Booking" and select type, date, and slot
**Then** POST `/api/bookings` creates the booking with `status: 'requested'` and links it to the lead and contact
**And** the booking appears in the Bookings module immediately

**Given** the AI flow books a test drive (via n8n → API)
**When** the booking creation event is processed
**Then** a booking is created with `status: 'requested'`, `booking_type: 'test_drive'`, and `created_by: 'ai'`
**And** the lead stage is automatically updated to `booking_created`
**And** the booking appears in the "AI Successes" queue on the dashboard

**Given** a booking is created
**When** I view the booking detail
**Then** I can see: contact name, booking type, slot date/time, current status, and linked lead

---

## Story 4.3: Booking Lifecycle Management & Show-Up Tracking

As a dealership agent,
I want to confirm, reschedule, cancel, or mark bookings as no-show/completed,
So that the system accurately reflects what happened and computes show-up rates.

**Acceptance Criteria:**

**Given** an agent views a `requested` booking
**When** they click "Confirm"
**Then** POST `/api/bookings/:id/confirm` transitions `status` to `confirmed`
**And** a Resend transactional email/notification is sent to the contact (if email is available)

**Given** an agent marks a booking as `no_show`
**When** POST `/api/bookings/:id/mark-no-show` is called
**Then** the booking `status` updates to `no_show`
**And** the show-up rate metric is recalculated for that booking type

**Given** a tenant has 20 bookings (15 completed, 3 no_show, 2 cancelled)
**When** the analytics endpoint `/api/analytics/bookings/show-up-rate` is called
**Then** it returns `{ test_drive: { completed: 15, no_show: 3, rate: 0.833 }, service: { ... } }`

**Given** an agent reschedules a booking
**When** they select a new slot and confirm
**Then** the original booking status becomes `rescheduled`
**And** a new booking is created for the new slot linked to the same lead

---
