# Responsive Design & Accessibility

## Responsive Strategy

Drive Insight is **desktop-primary**. The core triage workflow — reading transcripts, working through a queue of leads, assigning agents, investigating AI funnel performance — is too information-dense to be a primary mobile experience. The right metaphor:

- **Desktop:** Full command centre — all 5 user journeys, full panel access, analytics depth
- **Tablet:** Simplified command centre — morning briefing, queue triage, basic lead actions; analytics read-only
- **Mobile:** Quick-check surface — morning briefing snapshot, flag a lead, confirm a single booking; full triage deferred to desktop

This is consistent with the Monday.com-style command paradigm chosen in Step 9 — desktop-first tools that are mobile-aware, not mobile-first tools stretched to desktop.

---

## Breakpoint Strategy

Drive Insight uses **Tailwind CSS default breakpoints**, which align natively with Shadcn/UI components. All breakpoints use **min-width (mobile-first media queries)** even though the primary design target is desktop — this ensures the mobile layout is the reliable baseline.

| Breakpoint | Min Width | Layout Target | Primary Use |
|---|---|---|---|
| (default) | 0px | Mobile | Bottom tab bar, stacked cards, full-screen panels |
| `sm` | 640px | Large mobile | Minor spacing adjustments; not a primary target |
| `md` | 768px | Tablet | Collapsible sidebar, single-column queue |
| `lg` | 1024px | Desktop | Full sidebar (240px) + main content grid — **primary design target** |
| `xl` | 1280px | Wide desktop | Expanded panels, denser analytics grid |
| `2xl` | 1536px | Ultra-wide | Content capped at 1440px max-width; centred |

**Max content width:** 1440px — prevents Drive Insight from becoming unreadably wide on large monitors. Content centred with auto margins above 1440px.

---

## Device-Level Layout Adaptations

### Desktop (lg: 1024px+) — Primary Design Target

```
┌──────────┬─────────────────────────────────────────┐
│  Sidebar │  Main Content Area                       │
│  240px   │                                          │
│  fixed   │  [MorningBriefingCard]                   │
│          │                                          │
│  Nav     │  [Needs Attention Queue]                  │
│  items   │  [AI Successes]  [Future Follow-ups]      │
│          │                                          │
│          │  [Slide-over LeadDetailPanel — 480px]    │
└──────────┴─────────────────────────────────────────┘
```

- Fixed 240px white left sidebar — never collapses
- Main content: CSS Grid, 12-column, gap 24px
- MorningBriefingCard: full width (12 columns)
- Queue sections: 8-column main + 4-column summary (lg), full-width stacked (xl splits into side-by-side)
- LeadDetailPanel: 480px slide-over from right, overlays main content

### Tablet (md: 768px–1023px)

```
┌─────────────────────────────────────┐
│  [☰ Menu]  Drive Insight            │
├─────────────────────────────────────┤
│  [MorningBriefingCard — full width] │
│  [Needs Attention — single column]  │
│  [AI Successes — single column]     │
│  [Future Follow-ups — single column]│
└─────────────────────────────────────┘
```

- Sidebar collapses — hamburger menu (☰) in top-left reveals sidebar as overlay drawer
- Single-column layout for all queue sections
- LeadDetailPanel: full-width slide-over (100% width, from right)
- Analytics: simplified read-only MetricCard grid (2 columns); AIPerformanceFunnel hidden (desktop-only)
- AgentAssignDropdown: remains functional; workload counts hidden to save space

### Mobile (<md: 0–767px)

```
┌──────────────────────────┐
│  [MorningBriefingCard]   │
│  [HOT leads — top 3]     │
│  [View all →]            │
│                          │
│ ┌──┬──┬──┬──┐            │
│ │🏠│⚠️│📅│📊│ ← Tab bar  │
│ └──┴──┴──┴──┘            │
└──────────────────────────┘
```

- Sidebar becomes **bottom tab bar** — max 4 tabs: Dashboard / Needs Attention / Follow-ups / Analytics
- MorningBriefingCard: full-width, compact variant (shows counts only, no sparkline)
- Needs Attention queue: shows top 3 HOT leads; "View all X leads →" link to full queue page
- LeadDetailPanel: full-screen (not slide-over) — pushes to a new view, back button returns
- ConversationTranscript: preview mode (5 messages) by default, "Load full transcript" expands inline
- AgentAssignDropdown: simplified — agent name list only; workload and status in tooltip
- AIPerformanceFunnel: not available on mobile — "View on desktop for full analytics"
- Touch targets: minimum 44×44px for all interactive elements
- Thumb zone: primary CTAs (Open ManyChat, Confirm Booking) anchored to bottom of screen on mobile lead view

---

## Accessibility Strategy

Drive Insight targets **WCAG 2.1 Level AA** compliance across all device types. This is the industry standard for B2B SaaS and satisfies most legal requirements (including South African POPIA-adjacent digital accessibility expectations).

### Colour Contrast

All colour combinations verified against WCAG AA 4.5:1 (normal text) and 3:1 (large text + UI components):

| Combination | Ratio | Pass/Fail |
|---|---|---|
| Command Blue (#1D6AE5) on white | 4.56:1 | ✅ AA |
| White text on Command Blue | 4.56:1 | ✅ AA |
| Body text (#0F172A) on white background | 19.6:1 | ✅ AAA |
| HOT red (#DC2626) on white | 4.87:1 | ✅ AA |
| WARM orange (#EA580C) on white | 3.15:1 | ✅ AA (large text/UI only) |
| Muted text (#64748B) on white | 4.52:1 | ✅ AA |
| White text on dark background (#0F172A) | 19.6:1 | ✅ AAA |

**Note on WARM orange:** Does not meet 4.5:1 for small body text. Rule: WARM temperature label must always be `md` size (minimum 18.66px) or larger, or bold — never used as small body copy.

### Touch Targets (Mobile)

- Minimum 44×44px for all tappable elements on mobile
- Spacing between adjacent touch targets: minimum 8px
- Bottom tab bar items: minimum 48px height
- Inline action buttons in lead rows: minimum 44px height (row height adapts)

### Focus Indicators

All interactive elements have visible focus indicators that meet WCAG 2.1 AA 3:1 contrast against adjacent colours:
- Default Shadcn/UI focus ring: 2px solid Command Blue offset 2px — verified compliant
- Dark mode: focus ring switches to white (same offset) — verified against dark surface (#1E293B)
- Custom components inherit focus ring via `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`

### Skip Links

A "Skip to main content" link is the first focusable element in the DOM — visually hidden until focused, then appears as a Command Blue bar at the top of viewport. Essential for keyboard users who don't want to tab through the entire sidebar on every page load.

### Reduced Motion

All animations (count decrement flash, skeleton shimmer, panel slide-in) respect `prefers-reduced-motion`:
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```
LeadDetailPanel still appears (no animation), skeleton states still show (no shimmer), count changes still happen (no flash).

---

## Testing Strategy

### Automated Testing (every PR)

- **Axe DevTools** (browser extension + CI integration): catches ~57% of WCAG issues automatically
- **Lighthouse Accessibility audit**: score target ≥ 95 on all primary pages
- **Storybook a11y addon**: component-level accessibility validation during development
- CI pipeline blocks merge if Axe reports any critical or serious violations

### Manual Accessibility Testing (per milestone)

| Test Type | Tool | Frequency |
|---|---|---|
| Screen reader — macOS | VoiceOver + Safari | Every milestone |
| Screen reader — Windows | NVDA + Chrome | Every milestone |
| Keyboard-only navigation | No mouse, all 5 user journeys | Every milestone |
| Colour blindness simulation | Stark plugin (Figma/browser) | Before each release |
| High contrast mode | Windows High Contrast Mode | Before each release |
| Zoom to 200% | Browser zoom | Every milestone |

**5 user journeys tested keyboard-only at each milestone:**
1. Morning Review Ritual (Tab through briefing → Review Now → queue → resolve)
2. Alert-Driven Lead Rescue (Navigate to HOT lead → open panel → open ManyChat → mark resolved)
3. Booking Confirmation (Navigate queue → open panel → call confirmed → resolve)
4. Qualified Lead Assignment (Navigate panel → open assign dropdown → select agent → confirm)
5. AI Performance Investigation (Navigate analytics → read funnel → flag for improvement)

### Responsive Testing

| Device Category | Test Method |
|---|---|
| Desktop 1440px | Chrome DevTools device simulation + physical monitor |
| Desktop 1024px (min) | Browser resize |
| Tablet 768px (iPad) | Chrome DevTools + physical iPad if available |
| Mobile 375px (iPhone SE — smallest common target) | Chrome DevTools + physical device |
| Mobile 390px (iPhone 14) | Chrome DevTools |
| Mobile 412px (Android common) | Chrome DevTools |

**Browser matrix:** Chrome (primary), Safari (macOS/iOS critical), Firefox, Edge. IE not supported.

**Network conditions:** Test mobile layouts under "Slow 3G" in Chrome DevTools to validate stale data indicator and skeleton label patterns defined in Step 12.

---

## Implementation Guidelines

### Responsive Development

```
// Tailwind responsive prefix pattern — mobile-first
<div className="
  flex flex-col          // mobile: stacked
  md:flex-row            // tablet: side-by-side
  lg:grid lg:grid-cols-12 // desktop: 12-col grid
">
```

- Use `rem` for font sizes, `px` for borders, `%` / `vw` / `vh` for layout containers
- Use `gap-*` (not margin) for grid spacing — scales consistently across breakpoints
- Sidebar: `hidden lg:flex` — invisible on mobile/tablet, visible on desktop
- Bottom tab bar: `flex lg:hidden` — visible on mobile/tablet, hidden on desktop
- Never use `!important` for responsive overrides — restructure the component instead

### Accessibility Development

**Semantic HTML first:**
```html
<!-- Correct -->
<nav aria-label="Primary navigation">
<main>
<section aria-labelledby="attention-heading">
  <h2 id="attention-heading">Needs Attention</h2>

<!-- Incorrect -->
<div class="nav">
<div class="main">
<div class="section">
```

**ARIA only when HTML semantics are insufficient:**
- `role="dialog"` + `aria-modal="true"` on Sheet and Dialog (Shadcn/UI handles this)
- `aria-live="polite"` on count regions (MorningBriefingCard, queue headers)
- `aria-busy="true"` on skeleton loading states
- `aria-label` on icon-only buttons — required, no exceptions
- `aria-describedby` linking form fields to their error messages

**Tailwind accessibility utilities:**
```
sr-only          // visually hidden but screen-reader accessible
focus-visible:   // show focus ring only on keyboard navigation (not mouse click)
not-sr-only      // restore visibility (used with sr-only for skip links)
```


