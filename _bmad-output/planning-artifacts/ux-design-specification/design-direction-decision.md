# Design Direction Decision

## Design Directions Explored

Four distinct visual directions were evaluated, all built on the established Command Blue foundation and Shadcn/UI design system:

| Direction | Style | Navigation | Density | Feel |
|-----------|-------|-----------|---------|------|
| **1. Monday-Style Command** | Light mode | Left sidebar | Medium | Familiar, clean, professional |
| **2. Dark Command Centre** | Dark mode | Left sidebar | Medium | Premium, focused, high contrast |
| **3. Compact Power User** | Light + dark sidebar | Left sidebar | Dense | Maximum data per screen |
| **4. Card-First Focus** | Light + blue topbar | Top tab subnav | Spacious | Bold hierarchy, zone-based |

---

## Chosen Direction

**Direction 1: Monday-Style Command**

A clean, light-mode dashboard with a white left sidebar, card-based metric grid, and familiar CRM layout patterns. The closest visual alignment to Monday.com — immediately recognisable and comfortable for dealership managers.

---

## Design Rationale

**Why Direction 1 is the right choice for Drive Insight:**

1. **Familiarity breeds confidence**
   - Dealership managers already use tools like Monday.com, Salesforce, and CRM platforms with left sidebar navigation
   - Zero learning curve for the navigation pattern — users know where they are immediately
   - Directly supports the emotional goal: "Feels like tools they already know"

2. **Light mode suits the morning review ritual**
   - Primary usage is 8am morning reviews in well-lit offices
   - Light mode is easier on eyes in bright daylight environments
   - Dark mode remains available as a user toggle preference

3. **White sidebar + card grid matches information density goals**
   - Clean white sidebar provides clear navigation hierarchy without visual noise
   - Card-based metric grid supports progressive disclosure — summary at a glance, drill down on click
   - Medium density: not cluttered like DealerSocket, not too airy like a marketing site

4. **Inline action patterns are immediately scannable**
   - HOT/WARM temperature badges in red/orange are high contrast on white backgrounds
   - Lead row hover states provide visual affordance for interaction
   - Action buttons (Open ManyChat, Call, Assign) are clearly readable on light surfaces

5. **Scales well for both desktop and mobile**
   - Left sidebar collapses cleanly to icon-only mode on smaller screens
   - Card grid responds naturally to 3-col → 2-col → 1-col breakpoints
   - Light backgrounds require less colour management on varied display types

---

## Implementation Approach

**Application Shell Structure (Direction 1):**

```
┌──────────────────────────────────────────────────────────┐
│ Top Bar: [Logo] [Global Search ──────────────] [🔔] [TC] │
├───────────────────┬──────────────────────────────────────┤
│ White Sidebar     │ Main Content (light grey #F8F9FC bg) │
│ 220px width       │                                      │
│                   │  ┌──────────────────────────────┐   │
│ 📊 Overview  ◄    │  │ Morning Briefing Card         │   │
│ 💬 Conversations  │  │ border-left: 4px #1D6AE5      │   │
│ 🎯 Leads          │  └──────────────────────────────┘   │
│ 🗓️ Bookings       │  ┌──────┐  ┌──────┐  ┌──────┐       │
│ 📈 Analytics      │  │Metric│  │Metric│  │Metric│       │
│ ⚙️ Settings       │  │Card  │  │Card  │  │Card  │       │
│                   │  └──────┘  └──────┘  └──────┘       │
│ [Collapse ◄]      │  ┌──────────────────────────────┐   │
│                   │  │ Needs Attention — Lead Table  │   │
│                   │  └──────────────────────────────┘   │
└───────────────────┴──────────────────────────────────────┘
```

**Key Visual Implementation Rules (Direction 1):**

- **Sidebar background:** `#FFFFFF` with `border-right: 1px solid #E2E8F0`
- **Active nav item:** `border-left: 3px solid #1D6AE5` + `background: #EFF6FF` + `color: #1D6AE5`
- **Main content background:** `#F8F9FC` (cool near-white, distinct from white cards)
- **Cards:** `background: #FFFFFF` + `border: 1px solid #E2E8F0` + `border-radius: 10px`
- **Morning Briefing accent:** `border-left: 4px solid #1D6AE5`
- **HOT badge:** `background: #FEF2F2` + `color: #DC2626`
- **WARM badge:** `background: #FFF7ED` + `color: #EA580C`
- **Action buttons:** Outlined style (`border: 1px solid #E2E8F0`) with hover state `border-color: #1D6AE5`
- **Primary action:** Filled `background: #1D6AE5 color: #FFFFFF` for "Open ManyChat"

**Dark Mode Variant (Direction 1 Dark):**
When user toggles dark mode, Direction 1 transitions to:
- Sidebar: `#1E293B`
- Main background: `#0F172A`
- Cards: `#1E293B` with `border: 1px solid #334155`
- All semantic colors remain identical (temperature badges, status indicators)
- Active nav: `background: rgba(29,106,229,0.15)` + `color: #60A5FA`

**Reference File:**
Interactive design direction showcase available at: `_bmad-output/planning-artifacts/ux-design-directions.html`
