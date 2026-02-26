# UX Consistency Patterns

## Button Hierarchy

Drive Insight uses a strict four-level button hierarchy. Every view must have **at most one primary button** — the single most important action.

| Level | Style | Usage | Examples |
|---|---|---|---|
| **Primary** | Command Blue fill, white text | The one most important action per view | "Open in ManyChat", "Confirm Booking" |
| **Secondary** | Outlined (Command Blue border + text) | Supporting actions of equal importance | "Assign to Agent", "Copy Phone" |
| **Ghost** | Text-only, no border | Low-emphasis actions | "Dismiss", "View Calendar", "Load more" |
| **Destructive** | Red fill, white text | Irreversible actions only — always gated by confirmation dialog | "Cancel Booking" |
| **Icon-only** | Icon with no label | Toolbar and overflow actions — mandatory tooltip required | Filter, sort, overflow (⋯) |

**Rules:**
- Destructive actions never appear as the primary button on initial render — always secondary or ghost until confirmation
- Icon-only buttons must have `aria-label` and visible tooltip on hover/focus
- Loading state: button shows spinner + disabled; label changes to present continuous ("Confirming…", "Assigning…")

---

## Feedback Patterns

### Toast Notifications (Sonner)
Non-blocking confirmations for completed actions. Position: bottom-right. Auto-dismiss: 4 seconds.

**Toast rules:**
- Always name the subject: "Sipho Nkosi opened in ManyChat →" not "Opened ManyChat ✓"
- Success: green left-border accent
- Error: red left-border accent with "Try again" action link
- Never use toast for errors that require user decision — use inline alert or dialog instead

### Deep-Link Handoff Pattern
ManyChat links are the most critical external handoff. Three-stage feedback:

1. **On click:** Button changes to "Opening Sipho Nkosi in ManyChat…" (spinner, disabled) — names the lead explicitly
2. **On tab open (3s timeout):** If window focus returns to Drive Insight, surface follow-up prompt: "Did ManyChat open correctly? [Copy phone] [Try again]" — never assume success
3. **On failure:** Instructive error state: "Could not open automatically — Conversation #12345. [Copy ID] to paste in ManyChat search"

**Rule: External handoffs always open in a new tab (`target="_blank"`)** — Drive Insight context is never replaced by an external navigation.

### System Alert Banner
Full-width banner above the dashboard grid. Used only for system-level events, not individual lead actions.

**Escalation trigger:** When AI success rate drops below configurable critical threshold (default: < 10%), MetricCard `critical` state escalates to system alert banner:
> "⚠️ AI automation is currently failing — all new leads need manual attention"

**Alert suppression:** When a system-wide alert is active, individual HOT lead push notifications are suppressed — the banner is the alert.

**Recovery confirmation:** When metric recovers above threshold, banner changes to:
> "✅ AI automation restored — resuming normal monitoring"
Shown for the remainder of that session before returning to normal MetricCard display.

### Inline Validation
Form fields validate **on blur** (focus lost), never on keystroke. Error message appears below the field, in red, with `aria-describedby` linking field to message. Success state: green checkmark on right of field. Never show both error and success simultaneously.

### Empty States
Every list and panel has a purposeful empty state — never a blank void:

| Context | Empty State Message | Action |
|---|---|---|
| Needs Attention queue | "No leads need attention right now. Great work!" | — |
| Future Follow-ups | "No follow-ups scheduled. Add one from any lead panel." | — |
| Conversation transcript | "No transcript available for this lead." | "Request from ManyChat →" |
| Agent list | "No agents set up yet." | "Add your first agent →" |

---

## Navigation Patterns

### Primary Navigation (Left Sidebar)
- Fixed 240px white sidebar — never collapses to icon-only on desktop
- Active state: Command Blue left border accent + blue text
- Hover state: `--muted` background fill
- Mobile: sidebar becomes bottom tab bar (max 4 tabs)

### Panel Navigation (Breadcrumb)
Used inside slide-over panels only — not on main dashboard pages.
Format: `← Lead Queue  /  Sipho Nkosi`
- Back arrow returns to the list, not browser history
- Breadcrumb never exceeds 2 levels inside a panel

### Tab Navigation
Used inside LeadDetailPanel (Transcript / Timeline / Notes):
- Keyboard navigable: arrow keys move between tabs, Enter/Space selects
- Active tab: Command Blue underline border
- Tab switch does **not** change the URL — panel state is ephemeral
- Tab content lazy-loads on first activation, cached on subsequent switches

### Presence Indicator
When another user has the same LeadDetailPanel open simultaneously, show a subtle chip in the panel header:
> `👤 James is also viewing this lead`
This is awareness-only — it does not block actions. Disappears when the other user closes the panel.

---

## Modal & Overlay Patterns

### Sheet (Slide-over) — LeadDetailPanel
- Slides in from the right, 480px wide on desktop, full-width on mobile
- Background dimmed with `--background` at 60% opacity
- `Escape` key closes; clicking outside closes (unless unsaved notes present — prompt to save)
- Focus trapped inside panel while open

### Dialog — Confirmations Only
Dialogs are reserved exclusively for **confirmations of irreversible or high-stakes actions**:
- "Cancel Booking" → "Are you sure? This cannot be undone. [Cancel] [Confirm Cancel]"
- "Assign to agent at capacity" → "Thabo has 8 active leads (max). Assign anyway? [No] [Yes, assign]"

**Rule: Dialogs are never used for forms.** If data input is needed, use a Sheet.

### Resolve with Undo
"Mark Resolved" does not instantly remove the lead from the queue. Instead:
1. Optimistic update: lead fades and moves to bottom of list with "Resolved ✓ — Undo (3s)" toast
2. After 3 seconds: lead removed from queue permanently
3. Undo within 3s: lead restored to original position with original state

This protects against concurrent editing conflicts — if another manager resolves the same lead simultaneously, the conflict toast shows: "James just resolved this lead — view their notes?"

### Tooltip
- Hover/focus activated — never click-activated
- Never the only way to access information (WCAG 1.3.1)
- Max width: 240px
- Delay: 400ms on hover (prevents tooltip flicker during mouse movement)
- Always describes the action or explains the data — not just a label repeat

### Command Palette (⌘K / Ctrl+K)
Power-user quick-jump to any lead or view:
- Activates on ⌘K / Ctrl+K from anywhere in the app
- Search: lead name, phone number, pipeline stage
- Results: show LeadTemperatureBadge + name + last message timestamp
- Select result: opens LeadDetailPanel directly

---

## Loading & Empty States

### Skeleton States
Skeletons always match the **exact layout** of the loaded content:
- Show section label above skeleton: "Needs Attention — loading…" not anonymous grey bars
- Never use a generic spinner in place of a list or panel
- Skeletons animate with a left-to-right shimmer (not pulse) — less visually aggressive

### Optimistic Updates
Actions that change counts (resolve lead, confirm booking, assign agent) update immediately in the UI without waiting for server confirmation:
- Count decrements animate: `4 → 3` with a brief green flash on the number
- If server returns error: count restores with a red flash and error toast
- MorningBriefingCard counts update in real-time via `aria-live="polite"` — screen readers announce decrements

**Exception:** "Mark Resolved" uses the 3-second undo window (see Modal patterns) rather than instant optimistic removal — protecting against concurrency conflicts.

### Stale Data Indicator
When API calls fail after 2 retries (e.g., slow mobile connection), the dashboard does not show a broken state. Instead:
- Data from last successful fetch is displayed
- Subtle grey badge appears in the dashboard header: "Using cached data — last updated 14 min ago"
- "Refresh" icon button next to badge for manual retry
- Individual component loading states are suppressed — stale data is better than skeleton chaos

---

## Search & Filter Patterns

### Filter Chips (Inline — not drawer)
Filter chips appear above each lead queue — always visible, never hidden behind a "Filter" button:
- Available filters: Temperature (HOT / WARM / COOL / COLD), Pipeline Stage, Assigned Agent
- Active filters shown as dismissible chips: `🔥 HOT ×` — click × to remove
- "Clear all" text link appears when any filter is active
- Filters persist within a session but reset on page refresh

### Queue Overflow Handling
When Needs Attention queue exceeds 20 leads:
- Automatically pre-filter to show HOT leads first
- A separator line and label divides: "8 HOT leads" above / "Also showing 12 WARM leads" below
- COOL and COLD leads collapsed by default with "Show 18 lower-priority leads ▼" expand link
- Progress framing replaces flat count: "Start with 8 HOT leads — you've resolved 0 of 47 today"
- Batch action surfaces: "Resolve all COLD leads (12)" — with confirmation dialog

### Search
- Debounce: 300ms before API call fires
- Minimum: 2 characters before search triggers
- Results highlight matching text in lead name/phone
- "No results" state includes suggestion: "Try searching by phone number or conversation ID"
- Search field clears on `Escape`

---

## Accessibility Patterns

### Colour Independence
No information is communicated by colour alone. Every colour-coded element has a secondary signal:

| Element | Colour | Secondary Signal |
|---|---|---|
| LeadTemperatureBadge HOT | Red | 🔥 icon + "HOT" text label + ● filled circle shape |
| LeadTemperatureBadge WARM | Orange | ⚡ icon + "WARM" text label + ◑ half-circle shape |
| LeadTemperatureBadge COOL | Blue | 💬 icon + "COOL" text label + ○ outlined circle shape |
| LeadTemperatureBadge COLD | Slate | ❄️ icon + "COLD" text label + — dash shape |
| Needs Attention (urgent) | Red-orange | ⚠️ triangle icon |
| AI Successes (success) | Green | ✅ checkmark icon |
| Future Follow-ups (neutral) | Blue | 📅 calendar icon |
| MetricCard critical | Red left border | ↓ directional arrow + "critical" text |
| MetricCard good | Green delta | ↑ directional arrow + "up X%" text |

**Rule: Shape differentiation** — temperature badge shapes (●◑○—) encode urgency independently of colour, ensuring deuteranopia-safe triage.

### Keyboard Navigation
All interactive elements are keyboard accessible in logical tab order:
- Dashboard grid: Tab moves between cards; Enter opens detail
- LeadDetailPanel: Tab order: close → tabs → content → actions; Escape closes
- AgentAssignDropdown: Arrow keys navigate options; Enter selects; Escape closes
- ⌘K command palette: fully keyboard-operable

### Focus Management
- Opening LeadDetailPanel: focus moves to panel's close button
- Closing LeadDetailPanel: focus returns to the row that triggered it
- Opening Dialog: focus moves to the first interactive element (usually the cancel/safe option)
- Closing Dialog: focus returns to the trigger button

### Screen Reader Support
- `aria-live="polite"` on queue counts (MorningBriefingCard, queue headers) — announces decrements
- `role="log"` on ConversationTranscript — historical, not live
- `role="dialog"` + `aria-modal="true"` on Sheet and Dialog
- `role="img"` + descriptive `aria-label` on AIPerformanceFunnel and MetricCard sparkline
- All skeleton states have `aria-busy="true"` and `aria-label="Loading [section name]"`

---

## Concurrency & Conflict Patterns

These patterns handle the reality that multiple managers may use Drive Insight simultaneously.

### Presence Awareness
When another user opens the same LeadDetailPanel:
- Subtle chip in panel header: `👤 James is also viewing this lead`
- Awareness-only — does not block any actions
- Chip disappears when the other user closes the panel or becomes inactive (30s timeout)

### Conflict-Aware Optimistic Updates
All lead state changes (assign, resolve, update notes) use optimistic UI but include server-side conflict detection:
- On conflict: "James just assigned this to Sarah (2s ago) — view their notes?" toast with action link
- On double-resolve: the second resolve attempt shows: "This lead was already resolved by James" — no duplicate state
- Notes conflicts: last-write-wins with a "Heads up — James also edited these notes" notification

### Instructive Failure States
When external integrations fail, errors are instructive, not dead ends:

| Failure | Instructive Error |
|---|---|
| ManyChat deep-link fails | "Could not open automatically — Conversation #12345. [Copy ID] to paste in ManyChat search" |
| Agent assignment API fails | "Assignment failed. [Try again] — James is still unassigned" |
| Transcript fetch fails | "Transcript unavailable. [Request from ManyChat →] or [Copy phone to call directly]" |
| AI platform link fails | "Could not open AI platform. [Copy performance data] to share manually" |

Every failure state provides **at least two recovery paths** — users never hit a dead end.

---
