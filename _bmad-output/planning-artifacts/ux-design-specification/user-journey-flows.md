# User Journey Flows

## Journey 1: Morning Review Ritual

**Persona:** Sales Manager / Dealer Principal
**Entry Point:** First login of the day (any time — Morning Briefing persists until dismissed)
**Goal:** Resolve all overnight leads systematically before starting the sales day
**Success:** All three action queues addressed — pipeline under control

```mermaid
flowchart TD
    A([User logs in]) --> B{First login\nof the day?}
    B -->|Yes| C[Morning Briefing Card\nappears at top of dashboard]
    B -->|No| D[Standard dashboard\nno briefing card]

    C --> E[Read overnight summary\n12 new leads\n8 automated · 4 need attention]

    E --> F{Which action\nfirst?}

    F -->|Urgent| G[Click: Resolve 4 Flagged Leads →]
    F -->|Routine| H[Click: Confirm 5 Bookings →]
    F -->|Routine| I[Click: Assign 3 Qualified Leads →]

    G --> J[Needs Attention filtered view\nHOT leads first]
    J --> K{For each lead:\nchoose action}
    K -->|Open ManyChat| L[Deep-link opens\nManyChat thread\nat drop-off point]
    K -->|Assign| M[Select agent\nfrom dropdown\nAgent notified]
    K -->|Call| N[Copy phone or\nclick-to-dial]
    K -->|Mark Lost| O[Select loss reason\nLead archived]
    L & M & N & O --> P{More flagged\nleads?}
    P -->|Yes| K
    P -->|No| Q[✓ All flagged leads resolved\nCount: 0]

    Q --> H
    H --> R[Bookings Created by AI\nsorted by appointment date]
    R --> S{For each booking:\ncall to confirm}
    S -->|Called + Confirmed| T[Click: Confirmed ✓\nStatus updates]
    S -->|No answer| U[Click: Reschedule\nor try again later]
    T & U --> V{More bookings?}
    V -->|Yes| S
    V -->|No| W[✓ All bookings processed]

    W --> I
    I --> X[Qualified Leads list\nwith captured info]
    X --> Y[Click: Assign to Agent ▼\nSelect from available agents]
    Y --> Z[Lead assigned\nAgent notified\nStatus updates]
    Z --> AA{More leads\nto assign?}
    AA -->|Yes| Y
    AA -->|No| AB[✓ All leads assigned]

    AB --> AC[Morning Briefing Card\nupdates: All actions complete]
    AC --> AD([Ready to tackle\nthe day strategically 🎯])
```

**Flow Optimisations:**
- Suggested priority order shown in briefing (Flagged → Bookings → Assign) but user can start anywhere
- Each workflow remembers position — user can switch between queues and return without losing progress
- Progress indicators visible throughout: "3 of 4 flagged leads resolved"
- Morning Briefing Card remains visible (sticky) until user explicitly dismisses or all queues are empty

---

## Journey 2: Alert-Driven Lead Rescue

**Persona:** Sales Manager / Agent
**Entry Point:** Desktop notification, email alert, or in-app bell icon
**Goal:** Rescue a dropped-off HOT/WARM lead before customer loses interest
**Success:** Lead contacted via ManyChat / assigned to agent / outcome recorded

```mermaid
flowchart TD
    A([Alert fires:\nHOT lead dropped off]) --> B{How does\nuser receive it?}

    B -->|Desktop notification| C[Click notification\nDeep-link to Drive Insight]
    B -->|Email alert| D[Click email link\nDeep-link to lead detail]
    B -->|In-app bell icon| E[Click bell\nExpand alert center\nSelect alert]

    C & D & E --> F[Lead Detail View opens\nFull context visible]

    F --> G[Read context:\nCustomer name · phone · vehicle\nTemperature · Why flagged\nConversation transcript preview]

    G --> H{Choose\naction}

    H -->|Open ManyChat| I[Hover button\nTooltip preview:\nOpens John Smiths\nWhatsApp thread]
    I --> J[Click: Open in ManyChat]
    J --> K{Deep-link\nsuccess?}
    K -->|Yes| L[ManyChat opens\nExact thread · drop-off highlighted\nReply box ready]
    K -->|No| M[Error popup:\nOpen ManyChat Console\nor Copy Customer Phone]
    L --> N[Toast: ✓ Opened in ManyChat\nLead status: Human Active 🟠]
    M --> O[User navigates\nmanually to ManyChat]

    H -->|Assign to Agent| P[Open agent dropdown\nSee availability + workload]
    P --> Q[Select agent\nSystem assigns lead]
    Q --> R[Agent receives notification\nLead status: Assigned 👤]

    H -->|Call Customer| S{Phone integration\nenabled?}
    S -->|Yes| T[Click-to-dial opens\nCall initiated]
    S -->|No| U[Phone copied to clipboard\nToast: ✓ Copied number]

    H -->|Mark as Lost| V[Select loss reason dropdown\nOptional: add notes]
    V --> W[Lead status: Lost ❌\nArchived · removed from queue]

    N & R & T & U & W --> X[Alert dismissed\nfrom notification center]
    O --> X
    X --> Y[Count decrements\non dashboard]
    Y --> Z([Return to dashboard\nSatisfied ✓])
```

**Flow Optimisations:**
- All three notification entry points converge on the same Lead Detail View — consistent experience regardless of how user arrived
- Deep-link failure handled gracefully with two fallback options (never a dead end)
- Lead status updates immediately on action — user sees confirmation without refreshing
- Alert auto-dismisses after action taken — no manual cleanup required

---

## Journey 3: Booking Confirmation Workflow

**Persona:** Sales Manager / Receptionist
**Entry Point:** Morning Briefing "Confirm 5 Bookings →" OR Bookings section in sidebar
**Goal:** Call each AI-created booking to confirm the appointment
**Success:** All bookings marked Confirmed or Rescheduled before appointment date

```mermaid
flowchart TD
    A([Enter Bookings workflow]) --> B[Bookings Created by AI list\nSorted by appointment date/time]

    B --> C[Select first Pending booking\nSee: customer · vehicle · date · time]

    C --> D{Phone\nintegration?}
    D -->|Enabled| E[Click: 📞 Call to Confirm\nClick-to-dial opens]
    D -->|Not enabled| F[Click: 📞 Call to Confirm\nPhone copied to clipboard\nUser dials manually]

    E & F --> G{Call outcome?}

    G -->|Customer confirms| H[Click: Confirmed ✓\nStatus: Confirmed ✅\nTimestamp recorded]
    G -->|Customer reschedules| I[Click: Reschedule\nUpdate date/time\nStatus: Rescheduled 🔄]
    G -->|No answer| J[Click: No Answer\nStatus: Pending — retry later\nOptional: set reminder]
    G -->|Customer cancels| K[Click: Cancelled\nSelect cancellation reason\nStatus: Cancelled ❌]

    H & I & J & K --> L[Count updates:\n4 of 5 bookings processed]

    L --> M{More bookings\nto process?}
    M -->|Yes| N[Next booking in list]
    N --> C
    M -->|No — all processed| O[All bookings section complete\n✓ confirmation shown]

    O --> P([Return to dashboard\nor next workflow])
```

**Flow Optimisations:**
- Bookings sorted by appointment date by default — most urgent (soonest appointment) shown first
- Four clear call outcomes available inline — no modal required for standard actions
- "No Answer" keeps booking in pending state with optional reminder — nothing gets lost
- Bulk confirmation not available in MVP — each booking requires individual call confirmation (deliberate: ensures quality)

---

## Journey 4: Qualified Lead Assignment

**Persona:** Sales Manager
**Entry Point:** Morning Briefing "Assign 3 Qualified Leads →" OR Leads section filtered to "Qualified — Unassigned"
**Goal:** Assign each AI-qualified lead to the most appropriate available agent
**Success:** All qualified leads assigned — agents notified — pipeline moving

```mermaid
flowchart TD
    A([Enter Qualified Leads workflow]) --> B[Qualified Leads list\nUnassigned · sorted by qualification time]

    B --> C[Review first lead:\nCustomer name · phone\nVehicle interest · budget\nTrade-in? · Cash/Finance\nQualified X hours ago]

    C --> D[Optional: Click View Transcript\nRead AI qualification conversation]

    D --> E[Click: Assign to Agent ▼\nDropdown opens]

    E --> F[See agent list with context:\nAgent name · status · workload\nSarah M. Available — 2 active leads\nMark T. Busy — 5 active leads\nLisa K. Off duty — available at 2pm]

    F --> G{Select agent}

    G -->|Available agent| H[Confirm assignment]
    G -->|Busy agent| I[Manager decides:\nAssign anyway or wait\nfor available agent]
    G -->|Off-duty agent| J[Manager decides:\nassign for later\nor pick another]

    H & I & J --> K[System assigns lead\nAgent receives notification:\nNew lead: Customer · vehicle · budget]

    K --> L[Lead status updates:\nAssigned 👤 Sarah M.\nTimestamp recorded]

    L --> M[Count decrements:\n2 of 3 leads assigned]

    M --> N{More unassigned\nleads?}
    N -->|Yes| O[Next lead in list]
    O --> C
    N -->|No| P[All leads assigned\n✓ Section complete]

    P --> Q([Return to dashboard\nor next workflow])
```

**Flow Optimisations:**
- Agent workload visible in assignment dropdown — manager makes informed decisions, not blind assignments
- "View Transcript" optional step — experienced managers may not need it, new managers find it valuable
- Off-duty agents can still be assigned leads (they'll see notification when they return)
- Assignment triggers immediate notification to agent — no separate communication step required

---

## Journey 5: AI Performance Investigation

**Persona:** Sales Manager / Dealer Principal
**Entry Point:** Automation Rate metric on dashboard (yellow or red threshold)
**Goal:** Understand why automation rate dropped and identify knowledge gaps to fix
**Success:** Root cause identified + flagged for improvement OR external fix initiated

```mermaid
flowchart TD
    A([User notices Automation Rate\nin yellow or red on dashboard]) --> B[Click: Automation Rate metric\nor View Details]

    B --> C[AI Performance drill-down view\nopens]

    C --> D[See drop-off funnel:\nConversations → Leads → Bookings → Won\nDrop-off % at each stage highlighted]

    D --> E[See drop-off reasons breakdown\nTop 5 unanswered questions\ncausing drop-offs]

    E --> F{Identify root\ncause}

    F -->|Knowledge gap\ne.g. trade-in questions| G[Click: Flag for Improvement\nModal opens]
    F -->|AI tone/response issue| G
    F -->|External factor\ne.g. stock shortage| H[Note: External factor\nNo AI fix needed\nDismiss]
    F -->|Needs deeper investigation| I[Click: View Conversations\nFilter by drop-off reason\nRead transcripts]
    I --> F

    G --> J[Flag details form:\nIssue type · description\nExample conversations attached\nPriority: Low · Medium · High]

    J --> K{Action route}

    K -->|Flag in Drive Insight| L[Flag saved\nVisible to Admin/AI team\nStatus: Pending Review]
    K -->|Fix externally| M[Click: Open AI Agent Config\nExternal link to ManyChat\nor AI platform]
    K -->|Both| L
    L --> M

    M --> N[Flag status visible\non AI Performance dashboard\nPending → In Progress → Resolved]

    H & N --> O([Return to dashboard\nMonitor automation rate\nover next 24-48 hours])
```

**Flow Optimisations:**
- Single click from Automation Rate metric to drill-down — no navigation required
- Root cause analysis surfaces automatically (top 5 patterns) — manager doesn't have to manually detect patterns
- "View Conversations" available for deeper investigation without leaving Drive Insight
- Both internal flag AND external link available — accommodates teams who fix in ManyChat directly
- Flag status visible on performance dashboard — closure loop for manager ("was this fixed?")

---

## Journey Patterns

Across all 5 journeys, these reusable patterns emerge:

**1. Progressive Entry Pattern**
Every journey has multiple valid entry points (notification, briefing card, sidebar navigation) that all converge on the same destination. Users are never locked into one path.

**2. Inline Action Pattern**
All actions available at the point of decision — no navigation to separate screens for standard tasks. Actions: [Primary CTA] [Secondary] [Tertiary ▼ dropdown]

**3. Count Decrement Pattern**
Every action updates a visible count immediately. "4 → 3 → 2 → 1 → 0" creates satisfying progress closure and prevents double-handling.

**4. Context-Before-Action Pattern**
Every lead/booking shows full context (customer, vehicle, why flagged, transcript preview) before revealing actions. Users always know what they're acting on.

**5. Graceful Failure Pattern**
Every external dependency (ManyChat deep-link, phone integration) has a fallback path. No dead ends — always a way forward.

**6. Completion Signal Pattern**
Each journey ends with a clear completion state: "✓ All flagged leads resolved", "✓ All bookings confirmed", "✓ All leads assigned". Emotional closure reinforces the "accomplished" feeling.

---

## Flow Optimisation Principles

**1. Minimum viable steps to value**
No journey exceeds 4 user actions from entry to completion for the standard (happy) path. Complex paths (investigation, error recovery) add steps but are clearly signposted.

**2. Smart defaults reduce decisions**
- HOT leads always sorted first (no manual filter needed)
- Bookings sorted by appointment date (most urgent first)
- Agent dropdown shows availability status (informed choice, not guesswork)
- ManyChat opens to exact conversation (no search required)

**3. Error recovery is never a dead end**
Every failure state (deep-link error, no phone integration, no available agents) provides at least two recovery options. Users feel supported, not stuck.

**4. Actions match urgency**
- Urgent (flagged leads): Primary CTA = "Open ManyChat" (immediate human intervention)
- Routine (bookings): Primary CTA = "Call to Confirm" (systematic follow-up)
- Administrative (assignment): Primary CTA = "Assign to Agent ▼" (delegation)

**5. External tool handoffs are explicit**
Every jump to ManyChat or external AI platform is clearly signposted with:
- Button label that names the destination ("Open in ManyChat" not "Open")
- Tooltip confirming what will open
- Confirmation toast after successful handoff
- Fallback options if handoff fails

---
