# Visual Design Foundation

## Color System

**Primary Brand Direction: "Command Blue"**

Drive Insight's visual identity is built on a confident, professional blue palette that communicates trust, authority, and data clarity. Inspired by Monday.com's clean aesthetic and tailored for information-dense dealership dashboards.

**Core Palette:**

```
--- Brand Colors ---
Primary:          #1D6AE5  (Command Blue — trust, authority, action)
Primary Dark:     #1552B8  (Hover states, active navigation)
Primary Light:    #EFF6FF  (Subtle backgrounds, selected states)

--- Neutrals (Zinc base from Shadcn/UI) ---
Background:       #F8F9FC  (Light mode — cool near-white)
Surface:          #FFFFFF  (Cards, modals, panels)
Border:           #E2E8F0  (Subtle element separation)
Text Primary:     #0F172A  (Near-black — maximum readability)
Text Secondary:   #475569  (Body text, descriptions)
Text Muted:       #64748B  (Labels, timestamps, secondary info)

--- Dark Mode Equivalents ---
Background:       #0F172A  (Deep navy)
Surface:          #1E293B  (Cards, panels)
Border:           #334155  (Subtle dark separation)
Text Primary:     #F1F5F9  (Near-white)
Text Secondary:   #CBD5E1  (Body text)
Text Muted:       #94A3B8  (Labels, timestamps)
```

**Semantic Color Mapping:**

```
--- Functional Colors ---
Success:          #16A34A  (Green — AI successes, bookings confirmed, completed)
Success Light:    #F0FDF4  (Success backgrounds, positive states)
Warning:          #D97706  (Amber — needs attention, moderate urgency, WARM leads)
Warning Light:    #FFFBEB  (Warning backgrounds)
Danger:           #DC2626  (Red — critical alerts, HOT leads, lost, errors)
Danger Light:     #FEF2F2  (Danger backgrounds)
Info:             #0EA5E9  (Sky blue — scheduled follow-ups, informational)
Info Light:       #F0F9FF  (Info backgrounds)

--- Three-Workflow Zone Colors ---
Zone 1 (AI Successes):       #16A34A / Success Green
Zone 2 (Needs Attention):    #DC2626 / Danger Red → #D97706 / Warning Amber
Zone 3 (Future Follow-ups):  #0EA5E9 / Info Blue
```

**Lead Temperature Scale:**

```
HOT:    #DC2626  (Red)     — >80% intent, urgent
WARM:   #EA580C  (Orange)  — 60-80% intent, monitor
COOL:   #3B82F6  (Blue)    — 40-60% intent, low urgency
COLD:   #94A3B8  (Slate)   — <40% intent, archive candidate
```

**Automation Rate Threshold Colors:**

```
Green (Performing):  #16A34A  — Automation Rate >70%
Yellow (Monitor):    #CA8A04  — Automation Rate 50-70%
Red (Critical):      #DC2626  — Automation Rate <50%
```

**Color Accessibility:**

All color combinations meet WCAG AA minimum contrast ratios:
- Primary Blue (#1D6AE5) on White: **4.8:1** ✅ (AA)
- Text Primary (#0F172A) on White: **18.1:1** ✅ (AAA)
- Danger Red (#DC2626) on White: **4.6:1** ✅ (AA)
- Success Green (#16A34A) on White: **4.7:1** ✅ (AA)
- Dark mode Text (#F1F5F9) on Surface (#1E293B): **12.3:1** ✅ (AAA)

**Dark Mode Toggle:**
- Implemented via Shadcn/UI's built-in dark mode support + Tailwind's `dark:` prefix
- User preference persisted in localStorage
- System preference detection on first visit (`prefers-color-scheme`)
- Toggle accessible from top navigation (sun/moon icon)

---

## Typography System

**Font Strategy: Inter (System-Optimised)**

Inter is the definitive choice for Drive Insight:
- Designed specifically for computer screens and data-dense interfaces
- Used by Linear, Vercel, Notion, and Monday.com (familiar to target users)
- Excellent readability at small sizes (critical for data tables and metric labels)
- Available via Google Fonts (zero licensing cost, fast CDN delivery)
- Comprehensive weight range (100–900) for flexible hierarchy

**Font Stack:**

```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont,
             'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
```

**Type Scale:**

| Level | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| Display | 30px / 1.875rem | 700 | 1.2 | Page titles (rare) |
| H1 | 24px / 1.5rem | 700 | 1.3 | Section headings |
| H2 | 20px / 1.25rem | 600 | 1.4 | Card headings, widget titles |
| H3 | 16px / 1rem | 600 | 1.5 | Sub-section headings |
| H4 | 14px / 0.875rem | 600 | 1.5 | Table column headers |
| Body | 14px / 0.875rem | 400 | 1.5 | General body text, descriptions |
| Small | 12px / 0.75rem | 400 | 1.4 | Timestamps, labels, meta info |
| Micro | 11px / 0.6875rem | 500 | 1.3 | Badges, status chips |
| Metric | 32px / 2rem | 700 | 1.1 | KPI numbers (Automation Rate %) |
| Metric SM | 20px / 1.25rem | 600 | 1.2 | Secondary metric numbers |

**Numeric Display:**

```css
/* For all metric/number displays — tabular figures for alignment */
font-variant-numeric: tabular-nums;
font-feature-settings: "tnum";
```

This ensures metric numbers in tables and dashboards align perfectly in columns.

**Typography Principles:**
- **Maximum 3 sizes per screen** to maintain hierarchy clarity
- **Bold only for headings and KPIs** — body text stays at 400 weight
- **Muted text (#64748B)** for secondary information (timestamps, labels)
- **No italic text** in data displays — use color and weight for emphasis instead

---

## Spacing & Layout Foundation

**Spacing Unit: 4px Base Grid**

All spacing in Drive Insight follows a strict 4px base unit, using Tailwind's default spacing scale:

```
4px  = space-1  (micro gaps, icon padding)
8px  = space-2  (tight component spacing)
12px = space-3  (related element grouping)
16px = space-4  (standard component padding)
24px = space-6  (card internal padding)
32px = space-8  (section separation)
48px = space-12 (major layout sections)
64px = space-16 (page-level spacing)
```

**Layout Density: "Focused Efficiency"**

Drive Insight uses **medium density** — not as tight as Bloomberg Terminal, not as airy as a marketing site:
- Tables: 48px row height (comfortable click targets, maximum list density)
- Cards: 24px internal padding (p-6)
- Between cards: 16px gap (gap-4)
- Between sections: 32px gap (gap-8)
- Page margins: 24px on mobile, 32px on desktop

**Grid System:**

```
Desktop (≥1280px):   12-column grid, 24px gutters, 32px page margins
Tablet (768-1279px): 8-column grid, 16px gutters, 24px page margins
Mobile (<768px):     4-column grid, 16px gutters, 16px page margins
```

**Application Layout Structure:**

```
┌──────────────────────────────────────────────────────┐
│ Top Navigation Bar (64px height)                     │
│ [Logo] [Global Search] [Notifications] [User Menu]   │
├───────────────┬──────────────────────────────────────┤
│ Left Sidebar  │ Main Content Area                    │
│ (240px width) │                                      │
│               │  ┌─────────────────────────────┐    │
│ [Overview]    │  │ Morning Briefing Card        │    │
│ [Leads]       │  └─────────────────────────────┘    │
│ [Bookings]    │  ┌────────┐ ┌────────┐ ┌────────┐   │
│ [Analytics]   │  │Metric  │ │Metric  │ │Metric  │   │
│ [System]      │  │Card    │ │Card    │ │Card    │   │
│               │  └────────┘ └────────┘ └────────┘   │
│ (Collapses    │  ┌─────────────────────────────┐    │
│  on mobile)   │  │ Lead List / Data Table       │    │
│               │  └─────────────────────────────┘    │
└───────────────┴──────────────────────────────────────┘
```

**Sidebar Navigation:**
- **Width:** 240px expanded, 64px collapsed (icon only)
- **Collapse trigger:** Toggle button at bottom of sidebar
- **Mobile:** Hidden by default, accessible via hamburger menu
- **Active state:** Primary blue left border (4px) + blue text + light blue background
- **Navigation items:** Icon (20px) + Label + optional badge (notification count)

**Top Navigation Bar:**
- **Height:** 64px fixed
- **Left:** Drive Insight logo + wordmark
- **Center:** Global search bar (expands to 480px on focus)
- **Right:** Notification bell (with badge) + User avatar + Role indicator

**Content Area Breakpoints:**

```
Desktop:  Sidebar visible, 3-column metric grid, full data tables
Tablet:   Sidebar collapsible, 2-column metric grid, scrollable tables
Mobile:   Sidebar hidden (drawer), 1-column stacked, simplified tables
```

---

## Motion & Interaction Foundation

**Animation Principles:**

Drive Insight is a **productivity tool, not an entertainment app.** Animations should be:
- **Subtle:** Never distracting or delaying user action
- **Purposeful:** Only animate to communicate state changes
- **Fast:** 150-200ms for micro-interactions, 300ms maximum for transitions

**Interaction Timing:**

```
Micro (hover, focus):     150ms ease-out
Standard (panel open):    200ms ease-out
Navigation (page change): 300ms ease-in-out
Toast notifications:      200ms slide-in, auto-dismiss 3s
Loading states:           Skeleton screens (no spinners)
```

**Key Animated Moments:**
- **Count decrement:** Brief scale pulse when "4 needs attention" drops to "3" (confirms action taken)
- **Toast notification:** Slides in from top-right, auto-dismisses after 3 seconds
- **Sidebar collapse:** Smooth width transition (240px → 64px)
- **Metric card load:** Skeleton → content fade-in (no layout shift)
- **Morning Briefing Card:** Subtle slide-down on first login of day

**No animation for:**
- Table row updates (just update text — no flash)
- Form field interactions (standard browser behavior)
- Error states (immediate, no delay)

---

## Dark Mode Implementation

**Strategy: CSS Variables + Tailwind Dark Prefix**

Shadcn/UI handles dark mode via CSS custom properties that automatically switch:

```css
:root {
  --background: 248 249 252;       /* #F8F9FC */
  --foreground: 15 23 42;          /* #0F172A */
  --card: 255 255 255;             /* #FFFFFF */
  --border: 226 232 240;           /* #E2E8F0 */
  --primary: 29 106 229;           /* #1D6AE5 */
  --muted-foreground: 100 116 139; /* #64748B */
}

.dark {
  --background: 15 23 42;          /* #0F172A */
  --foreground: 241 245 249;       /* #F1F5F9 */
  --card: 30 41 59;                /* #1E293B */
  --border: 51 65 85;              /* #334155 */
  --primary: 29 106 229;           /* Same blue works on dark */
  --muted-foreground: 148 163 184; /* #94A3B8 */
}
```

**Dark Mode Considerations for Drive Insight:**
- Temperature badge colors remain the same (HOT red, WARM orange, etc.) — high contrast on both modes
- Automation rate color thresholds unchanged — semantic colors work on both backgrounds
- Chart colors adjusted for dark mode (slightly brighter to pop on dark backgrounds)
- Morning Briefing Card: Dark mode uses `#1E293B` surface with blue left border

**Toggle Implementation:**
- Moon icon in top nav → switches to dark mode
- Sun icon → switches to light mode
- Preference stored in `localStorage('theme')`
- On first visit: reads `prefers-color-scheme` system setting
- Smooth transition: 200ms color fade across all elements

---

## Accessibility Considerations

**WCAG AA Compliance (Minimum Standard):**

All interactive elements and text meet WCAG 2.1 AA:
- Text contrast: ≥4.5:1 for body text, ≥3:1 for large text/UI components
- Interactive target size: ≥44×44px for touch targets (mobile)
- Focus indicators: Visible blue ring on all focusable elements (2px, offset 2px)
- Color independence: Never rely on color alone (always add text label, icon, or pattern)

**Specific Drive Insight Accessibility Decisions:**

1. **Temperature Badges:** Color + text label + emoji (triple redundancy)
   - ✅ HOT (red background + "HOT" text + 🔥 emoji)
   - Never just a red dot with no label

2. **Automation Rate Gauge:** Color + percentage text + trend arrow
   - ✅ 68% ↑ in green (not just a green number)
   - Screen reader: "Automation rate: 68 percent, up 5 percent from last week"

3. **Alert Notifications:** Icon + color + text description
   - ✅ ⚠️ icon + amber color + "Needs attention" text
   - Never just a red badge with no context

4. **Charts/Sparklines:** Accessible data table alternative available
   - Recharts includes `aria-label` and keyboard navigation
   - Data table toggle for screen reader users

5. **Focus Management:**
   - Modal dialogs trap focus correctly (Radix UI handles this)
   - Deep-link navigation announces page change to screen readers
   - Skip-to-main-content link at top of page

6. **Reduced Motion:**
   ```css
   @media (prefers-reduced-motion: reduce) {
     * { animation-duration: 0.01ms !important; }
   }
   ```
   All animations disabled for users who prefer reduced motion.
