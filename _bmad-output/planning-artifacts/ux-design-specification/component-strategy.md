# Component Strategy

## Design System Components

Drive Insight is built on **Shadcn/UI** (Radix UI + Tailwind CSS + TypeScript), a copy-paste component library that provides fully accessible, unstyled primitives customised with Command Blue tokens.

### Available Shadcn/UI Components & Usage Mapping

| Component | Usage in Drive Insight |
|---|---|
| `Button` | Primary CTAs (Open ManyChat, Confirm Booking), secondary actions, icon-only toolbar buttons |
| `Badge` | Status labels (lead pipeline stage labels — extended into `LeadTemperatureBadge`) |
| `Card` | Dashboard grid cells, Morning Briefing container, metric tiles |
| `Table` | Lead queue lists, booking confirmation lists, qualified lead pipeline view |
| `Sheet` | Slide-over panel for `LeadDetailPanel` |
| `Dialog` | Confirmation modals (booking cancel, agent reassign confirm) |
| `DropdownMenu` | Agent assign selector, action overflow menus |
| `Tabs` | Transcript / Timeline / Notes tabs inside LeadDetailPanel |
| `Tooltip` | ManyChat link preview, metric explanations, truncated content |
| `Alert` | System warnings (AI performance drop, SLA breach alerts) |
| `Progress` | Booking confirmation progress bar, AI funnel visualisation bars |
| `Avatar` | Agent thumbnails in AgentAssignDropdown, conversation participant icons |
| `Separator` | Section dividers in panels and cards |
| `Skeleton` | Loading states for all async-loaded components |
| `Toast / Sonner` | Handoff confirmation ("Opened ManyChat ✓"), error notifications |
| `Command` | Power-user search palette (⌘K), quick lead lookup |
| `ScrollArea` | Scrollable transcript container, long lead queues |
| `Switch` | Dark mode toggle in user preferences |
| `Input` | Notes field, search filter inputs |

### Gap Analysis

After mapping user journeys to available Shadcn/UI components, the following gaps exist that require custom components:

| Gap | Reason |
|---|---|
| Lead temperature visualisation | Badge doesn't encode urgency colour semantics (HOT/WARM/COOL/COLD) or threshold logic |
| Morning briefing summary widget | No existing card pattern with dismissal, partial-complete state, and grouped metric display |
| Full-context lead panel | Sheet provides the container but not the structured tab layout + action toolbar specific to lead management |
| Conversation transcript | No message-bubble component with sender-type differentiation (AI vs human vs customer vs system) |
| AI funnel visualisation | Progress bars don't natively support funnel stage labelling, drop-off annotation, and improvement flag |
| Agent availability selector | DropdownMenu doesn't show agent workload, status colour, or unavailability reasons |
| Metric delta card | Card + number doesn't include delta arrow, threshold colouring, or sparkline slot |

---

## Custom Components

### 1. `MorningBriefingCard`

**Purpose:** The top-of-dashboard card that greets the manager on arrival and gives an immediate read on where the business stands, persisting all day until explicitly dismissed.

**Anatomy:**
```
┌─────────────────────────────────────────────────────────────┐
│  📊 Today's Briefing  [Dismiss ×]                            │
│  ─────────────────────────────────────────────────────────  │
│  Conversations since midnight: 24                            │
│  ✅ 8 handled automatically: 5 bookings, 3 qualified leads   │
│  ⚠️  4 need attention          [Review Now →]                │
│  📅 12 future follow-ups       [View Calendar →]             │
│  ─────────────────────────────────────────────────────────  │
│  AI success rate: 33%  △+5% vs last week                    │
└─────────────────────────────────────────────────────────────┘
```

**Props Interface:**
```typescript
interface MorningBriefingCardProps {
  totalConversations: number;
  automated: {
    count: number;
    bookings: number;
    qualifiedLeads: number;
  };
  needsAttention: number;
  futureFollowUps: number;
  aiSuccessRate: number;
  aiSuccessRateDelta: number; // positive = up vs last week
  onReviewAttention: () => void;
  onViewCalendar: () => void;
  onDismiss: () => void;
  isDismissed?: boolean;
}
```

**States:**
- `default` — Full card visible, counts populated
- `loading` — Skeleton shimmer over all metric areas
- `partial-complete` — Some queues resolved (count decrements animate in real-time)
- `all-clear` — All attention items resolved; card shows celebration micro-animation
- `dismissed` — Card collapsed to a thin "View Today's Summary" restore bar
- `error` — Data fetch failed; shows cached last-known values with staleness indicator

**Accessibility:**
- `role="region"` with `aria-label="Today's morning briefing summary"`
- Dismiss button: `aria-label="Dismiss morning briefing"`
- Count changes: `aria-live="polite"` region for real-time decrement announcements

---

### 2. `LeadTemperatureBadge`

**Purpose:** A visually distinct, semantically rich badge that encodes lead urgency using colour + label + optional icon so managers can triage at a glance without reading text.

**Variants:**

| Variant | Colour | Icon | Meaning |
|---|---|---|---|
| `HOT` | `#DC2626` (red) | 🔥 | Needs immediate human intervention |
| `WARM` | `#EA580C` (orange) | ⚡ | AI stalled, respond within the hour |
| `COOL` | `#3B82F6` (blue) | 💬 | Engaged but no urgency |
| `COLD` | `#94A3B8` (slate) | ❄️ | Low engagement, future follow-up |

**Props Interface:**
```typescript
type LeadTemperature = 'HOT' | 'WARM' | 'COOL' | 'COLD';
type BadgeSize = 'sm' | 'md' | 'lg';

interface LeadTemperatureBadgeProps {
  temperature: LeadTemperature;
  size?: BadgeSize; // default: 'md'
  showIcon?: boolean; // default: true
  showLabel?: boolean; // default: true
  tooltip?: string; // reason for temperature
}
```

**Sizes:**
- `sm` — 20px height, used in compact table rows
- `md` — 24px height, default usage in cards and panels
- `lg` — 32px height, used as primary lead identifier in LeadDetailPanel header

**Accessibility:**
- `aria-label="Lead temperature: HOT — needs immediate attention"`
- Never relies solely on colour; always includes text label in `md` and `lg`
- `sm` size with icon only: tooltip required, `aria-describedby` linked

---

### 3. `LeadDetailPanel`

**Purpose:** A full-context slide-over panel that surfaces everything a manager needs to know about a lead — transcript, timeline, notes — before taking action. Embodies the Context-Before-Action pattern.

**Anatomy:**
```
┌────────────────────────────────────────────────────┐
│  [← Back]  Sipho Nkosi  🔥 HOT  Toyota Hilux      │
│  ────────────────────────────────────────────────  │
│  📞 +27 82 555 1234  |  Dropped off: 14 min ago   │
│  ────────────────────────────────────────────────  │
│  [Transcript] [Timeline] [Notes]                   │
│  ────────────────────────────────────────────────  │
│  [Transcript content / ConversationTranscript]     │
│  ...                                               │
│  ────────────────────────────────────────────────  │
│  Actions:                                          │
│  [🔗 Open in ManyChat]  [📋 Copy Phone]            │
│  [👤 Assign to Agent ▼]  [✓ Mark Resolved]         │
└────────────────────────────────────────────────────┘
```

**Props Interface:**
```typescript
interface LeadDetailPanelProps {
  lead: Lead; // full lead object
  isOpen: boolean;
  onClose: () => void;
  onOpenManyChat: (conversationId: string) => void;
  onAssign: (agentId: string) => void;
  onMarkResolved: (leadId: string) => void;
  onCopyPhone: (phone: string) => void;
  activeTab?: 'transcript' | 'timeline' | 'notes'; // default: 'transcript'
}
```

**States:**
- `loading` — Skeleton in transcript area, action buttons disabled
- `transcript-loaded` — Full panel operational
- `assigning` — Assign dropdown shows spinner, button disabled during API call
- `resolving` — Mark resolved button shows spinner, panel animates out on success
- `manychat-opening` — Button shows "Opening…" with spinner, toast fires on success/failure
- `error` — API failure state with retry button

**Accessibility:**
- `role="dialog"` with `aria-modal="true"` and `aria-labelledby` pointing to lead name
- Focus trap within panel when open
- `Escape` key closes panel
- Tab order: close → tabs → transcript → actions

---

### 4. `ConversationTranscript`

**Purpose:** A message-thread view that renders ManyChat conversation history with clear visual differentiation between sender types, enabling managers to understand exactly what happened without reading a wall of undifferentiated text.

**Sender Types:**

| Type | Alignment | Colour | Label |
|---|---|---|---|
| `customer` | Left | `#F1F5F9` bubble | Customer name |
| `ai` | Right | `#EFF6FF` bubble (light blue) | "AI Agent" |
| `human` | Right | `#F0FDF4` bubble (light green) | Agent name |
| `system` | Centre | `#FEF9C3` pill (yellow) | Italic system text |

**Props Interface:**
```typescript
type SenderType = 'customer' | 'ai' | 'human' | 'system';

interface TranscriptMessage {
  id: string;
  sender: SenderType;
  senderName: string;
  content: string;
  timestamp: string;
  isHighlighted?: boolean; // scrolls to and pulses on mount
}

interface ConversationTranscriptProps {
  messages: TranscriptMessage[];
  mode?: 'preview' | 'full'; // preview shows last 5 messages
  highlightMessageId?: string; // ID of the drop-off message to highlight
  isLoading?: boolean;
}
```

**States:**
- `preview` — Last 5 messages visible with "Load full transcript" button
- `full` — All messages in scrollable `ScrollArea`
- `highlighted` — Specific message has yellow pulse border, auto-scrolled to on mount (the drop-off highlight)
- `loading` — Message skeleton rows

**Accessibility:**
- `role="log"` with `aria-label="Conversation transcript"`
- `aria-live="off"` (historical content, not live updates)
- Sender type communicated via text label, not colour alone

---

### 5. `MetricCard`

**Purpose:** A standardised tile for the analytics dashboard that displays a single KPI with context: current value, delta vs prior period, threshold-based colour coding, and an optional sparkline for trend.

**Anatomy:**
```
┌───────────────────────────────┐
│  AI Booking Rate              │
│  34%           △ +5%          │
│  ▁▂▃▄▅▆▇ (sparkline slot)    │
│  vs last week                 │
└───────────────────────────────┘
```

**Props Interface:**
```typescript
interface MetricCardProps {
  title: string;
  value: number | string;
  unit?: string; // '%', 'min', 'ZAR', etc.
  delta?: number; // percentage change
  deltaPeriod?: string; // "vs last week"
  thresholds?: {
    good: number;   // value >= good = green
    warn: number;   // value >= warn = amber
    // below warn = red
  };
  sparklineData?: number[]; // last N data points
  isLoading?: boolean;
  tooltip?: string; // metric explanation
}
```

**States:**
- `good` — Value meets or exceeds threshold; delta number in `#16A34A` green
- `warn` — Value in warning range; delta number in `#EA580C` amber
- `critical` — Value below warning threshold; card gets subtle red left-border accent
- `loading` — Skeleton shimmer
- `no-data` — "No data yet" placeholder

**Accessibility:**
- `aria-label` includes full metric context: `"AI Booking Rate: 34%, up 5% vs last week"`
- Sparkline has `role="img"` with descriptive `aria-label`
- Colour coding always supplemented with directional arrow (↑ ↓) in text

---

### 6. `AgentAssignDropdown`

**Purpose:** An enhanced dropdown that enables managers to assign leads to agents with full visibility of each agent's availability status and current workload, making assignment an informed decision, not a guess.

**Anatomy:**
```
[Assign to Agent ▼]
  ──────────────────
  ● James M.    Available  (3 active)
  ● Sarah K.    Available  (5 active)
  ○ Thabo N.    Busy       (8 active) ──── max
  ✕ Priya S.    Off-duty
  ──────────────────
  + Add new agent
```

**Props Interface:**
```typescript
type AgentStatus = 'available' | 'busy' | 'off-duty';

interface Agent {
  id: string;
  name: string;
  avatarUrl?: string;
  status: AgentStatus;
  activeLeadCount: number;
  maxCapacity?: number; // shows warning when near max
}

interface AgentAssignDropdownProps {
  agents: Agent[];
  selectedAgentId?: string;
  onAssign: (agentId: string) => void;
  isLoading?: boolean;
  triggerLabel?: string; // default: "Assign to Agent"
}
```

**States:**
- `unassigned` — Trigger shows "Assign to Agent ▼" in ghost style
- `assigned` — Trigger shows agent name + avatar; still clickable to reassign
- `busy-agent-selected` — Confirmation dialog: "Thabo is at capacity. Assign anyway?"
- `loading` — Trigger shows spinner during assignment API call
- `error` — Assignment failed; shows toast with retry

**Accessibility:**
- Uses Shadcn `DropdownMenu` with `role="menu"` and `role="menuitem"` items
- Status communicated via text ("Available", "Busy") and icon, never colour alone
- `aria-disabled` on off-duty agents (still visible but not selectable)

---

### 7. `AIPerformanceFunnel`

**Purpose:** A visual funnel chart that shows where leads drop off in the AI conversation pipeline, enabling managers to pinpoint exactly which stage needs improvement and surface the flag-for-improvement action inline.

**Anatomy:**
```
Total Conversations: 24
  ████████████████  24  Conversation Started
  ███████████████   22  First AI Response
  ████████████      18  Lead Qualification
  ████████           12  Quote / Test Drive Offer
  ████               8  Booking / Outcome   ← 33% funnel rate
                                            [⚑ Flag for Improvement]
  Drop-off points annotated:
  18→12: "Price objection (5), No response (1)"
```

**Props Interface:**
```typescript
interface FunnelStage {
  id: string;
  label: string;
  count: number;
  dropOffReasons?: string[]; // annotated on the bar below it
}

interface AIPerformanceFunnelProps {
  stages: FunnelStage[];
  totalConversations: number;
  funnelRate: number; // percentage reaching final stage
  onFlagImprovement: () => void; // opens external AI platform or improvement form
  comparisonPeriod?: string; // "vs last week"
  isLoading?: boolean;
}
```

**States:**
- `default` — Bars sized proportionally, drop-off reasons annotated below each bar
- `hover-stage` — Hovered stage bar elevates with tooltip showing exact count and %
- `loading` — Skeleton bars
- `no-data` — "Not enough data yet" placeholder with minimum conversation count guidance
- `flag-sent` — Flag button shows "Flagged ✓" confirmation state

**Accessibility:**
- `role="img"` with `aria-label` describing the full funnel summary
- Each stage also has a visually hidden `<caption>` row for screen readers
- Flag button: `aria-label="Flag AI performance for improvement review"`

---

## Component Implementation Strategy

### Foundation Components (Shadcn/UI — use as-is with token customisation)

These components require only CSS variable overrides to adopt Command Blue tokens. No structural changes needed:

- `Button` — Apply `--primary: 29 106 229` (Command Blue)
- `Card` — Apply `--card`, `--card-foreground`, `--border` tokens
- `Table` — Zebra striping using `--muted` token
- `Dialog` / `Sheet` — Overlay uses `--background` with opacity
- `Toast / Sonner` — Success variant uses `--success` green token
- `Badge` — Base for `LeadTemperatureBadge` extension

### Custom Components (designed in this step)

All 7 custom components are built **on top of Shadcn/UI primitives**, never bypassing them:

| Custom Component | Shadcn/UI Primitives Used |
|---|---|
| `MorningBriefingCard` | `Card`, `Button`, `Skeleton`, `Separator` |
| `LeadTemperatureBadge` | `Badge`, `Tooltip` |
| `LeadDetailPanel` | `Sheet`, `Tabs`, `Button`, `Separator`, `Skeleton` |
| `ConversationTranscript` | `ScrollArea`, `Skeleton`, `Button` |
| `MetricCard` | `Card`, `Skeleton`, `Tooltip`, `Separator` |
| `AgentAssignDropdown` | `DropdownMenu`, `Avatar`, `Button`, `Dialog` |
| `AIPerformanceFunnel` | `Progress`, `Button`, `Tooltip`, `Skeleton` |

### Implementation Principles

1. **Token-first:** Every colour, spacing, and radius value references a CSS variable — never hardcoded
2. **Shadcn first:** Always check if a Shadcn primitive covers the need before building custom
3. **Accessibility non-negotiable:** Every custom component ships with full ARIA, keyboard navigation, and focus management before any visual polish
4. **TypeScript strict:** All component props have explicit interfaces; no `any` types
5. **Dark mode automatic:** Using `dark:` Tailwind variant; components don't need separate dark implementations if tokens are used correctly

---

## Implementation Roadmap

### Phase 1 — Core Triage Components (P0 — needed for MVP critical flows)

These are required before any meaningful user testing. They power the Morning Review Ritual and Alert-Driven Lead Rescue journeys.

| Component | Drives Journey | Estimated Complexity |
|---|---|---|
| `LeadTemperatureBadge` | All 5 journeys (universal status signal) | Low |
| `MorningBriefingCard` | Morning Review Ritual | Medium |
| `AgentAssignDropdown` | Qualified Lead Assignment | Medium |
| `MetricCard` | AI Performance Investigation | Medium |
| Extended `Badge` (pipeline stage) | Lead queues in all journeys | Low |
| Extended `Table` (lead queue rows) | Alert-Driven Lead Rescue | Low |

### Phase 2 — Context & Action Components (P1 — required for complete lead workflows)

These complete the lead rescue and booking confirmation journeys.

| Component | Drives Journey | Estimated Complexity |
|---|---|---|
| `LeadDetailPanel` (shell + tabs) | Alert-Driven Lead Rescue, Booking Confirmation | High |
| `ConversationTranscript` (preview mode) | Alert-Driven Lead Rescue | Medium |
| Extended `Alert` (SLA breach notification) | Alert-Driven Lead Rescue | Low |
| Extended `Progress` (booking status) | Booking Confirmation Workflow | Low |

### Phase 3 — Analytics & Enhancement Components (P2 — completes full product)

These deliver the AI performance and analytics capabilities that differentiate Drive Insight.

| Component | Drives Journey | Estimated Complexity |
|---|---|---|
| `ConversationTranscript` (full mode + highlight) | AI Performance Investigation | Medium |
| `AIPerformanceFunnel` | AI Performance Investigation | High |
| Extended `Avatar` (agent with status dot) | Agent Assignment (visual polish) | Low |
| `MetricCard` sparkline slot | Analytics dashboard depth | Medium |

**Total custom component build effort:** 2 high-complexity, 5 medium-complexity, 4 low-complexity extensions

---
