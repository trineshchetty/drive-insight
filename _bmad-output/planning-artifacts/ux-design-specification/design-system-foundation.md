# Design System Foundation

## Design System Choice

**Primary Design System:** **Shadcn/UI + Tailwind CSS**

This design system choice has already been confirmed in the architecture document and aligns perfectly with Drive Insight's UX goals and technical stack.

## Rationale for Shadcn/UI

**Why Shadcn/UI is the Perfect Fit:**

1. **Copy-Paste Component Library (You Own the Code)**
   - Unlike traditional UI libraries, Shadcn/UI provides components you copy into your codebase
   - Full ownership and customization control—no black-box dependencies
   - Components live in your project, not node_modules
   - Perfect for building dealership-specific custom components on top

2. **Built on Proven Technologies**
   - **Tailwind CSS:** Utility-first CSS framework for rapid styling
   - **Radix UI:** Unstyled, accessible primitives for complex components (Dialog, DropdownMenu, Accordion, etc.)
   - **TypeScript:** Strongly typed throughout for maintainability
   - **class-variance-authority (CVA):** Type-safe component variants (e.g., Badge variants: HOT, WARM, COOL, COLD)

3. **Matches "Clean, Familiar UX" Goal**
   - Professional, modern aesthetic similar to Monday.com
   - Clean layouts with generous white space
   - Not over-stylized—feels like a business dashboard, not a consumer app
   - Familiar patterns that dealership users will recognize from other SaaS tools

4. **Supports Information-Dense Dashboards**
   - Excellent **Table** component for lead lists with sorting, filtering, and inline actions
   - **Card** component with clean separation for metric cards
   - **Badge** and **Avatar** components for visual scanning
   - **Scroll Area** component for long conversation timelines without clutter
   - **Chart** integration via Recharts for sparklines and analytics

5. **Fast Development Speed**
   - 50+ pre-built components ready to copy
   - Consistent design tokens (colors, spacing, typography)
   - Built-in dark mode support (future enhancement)
   - Comprehensive documentation with examples

6. **Perfect for Next.js + TypeScript Stack**
   - Designed for Next.js App Router (Server Components + Client Components)
   - TypeScript-first with full type safety
   - Works seamlessly with Jotai state management
   - Server-Side Rendering (SSR) compatible

## Shadcn/UI Component Mapping to Drive Insight Features

| Drive Insight Feature | Shadcn Component | Usage |
|----------------------|------------------|-------|
| Lead temperature indicators | **Badge** | Custom variants: HOT (red), WARM (orange), COOL (blue), COLD (gray) with emoji |
| Metric cards (Automation Rate, etc.) | **Card** | CardHeader + CardContent + custom Recharts sparkline |
| Lead lists / Conversation lists | **Table** | DataTable with sorting, filtering, pagination |
| Agent assignments | **Avatar** | Show assigned agent with initials and tooltip |
| Alert notifications | **Alert** | Critical/Warning/Info variants with inline actions |
| Search bar | **Command** | Global search with fuzzy matching and keyboard shortcuts |
| Conversation transcript | **Scroll Area** | Long message timelines with auto-scroll to latest |
| Dropdowns (filters, actions) | **DropdownMenu** | Contextual menus and bulk actions |
| Modals (lead detail view) | **Dialog** | Full-screen or modal overlays for deep dives |
| Status indicators | **Badge** + **Progress** | Visual status (active, completed, abandoned) with progress bars |
| Charts and sparklines | **Recharts** (integrates with Shadcn) | Line charts, bar charts, sparklines for trends |

## Implementation Plan

**Phase 1: Initialize Shadcn/UI**
```bash
# Initialize Shadcn/UI in Next.js project
npx shadcn@latest init

# Configure components.json with Drive Insight design tokens
# Choose: New York style (clean, professional)
# Choose: Zinc color palette (neutral, professional)
```

**Phase 2: Install Core Components**
```bash
# Install foundational components for MVP
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add badge
npx shadcn@latest add table
npx shadcn@latest add avatar
npx shadcn@latest add alert
npx shadcn@latest add scroll-area
npx shadcn@latest add dropdown-menu
npx shadcn@latest add dialog
npx shadcn@latest add command
```

**Phase 3: Customize Design Tokens**

Extend Tailwind config with Drive Insight brand colors:

```typescript
// tailwind.config.ts (customization layer)
export default {
  theme: {
    extend: {
      colors: {
        // Brand colors
        brand: {
          primary: '#0066CC',    // Drive Insight blue
          secondary: '#00A86B',  // Success green
        },
        // Temperature colors
        temperature: {
          hot: '#DC2626',        // Red (>80% intent)
          warm: '#F59E0B',       // Orange (60-80% intent)
          cool: '#3B82F6',       // Blue (40-60% intent)
          cold: '#9CA3AF',       // Gray (<40% intent)
        },
        // Status colors
        status: {
          active: '#10B981',     // Green (conversation ongoing)
          completed: '#6366F1',  // Purple (successful close)
          abandoned: '#EF4444',  // Red (dropped off)
          human_active: '#F59E0B', // Orange (human intervention)
        }
      }
    }
  }
}
```

**Phase 4: Build Custom Components**

Extend Shadcn components for Drive Insight-specific needs:

1. **LeadTemperatureBadge** (extends Shadcn Badge)
   ```tsx
   // Custom component with temperature-specific styling
   <Badge variant={temperature}>
     {temperature === 'HOT' && '🔥'} HOT
     {temperature === 'WARM' && '🌡️'} WARM
     {temperature === 'COOL' && '🧊'} COOL
     {temperature === 'COLD' && '❄️'} COLD
   </Badge>
   ```

2. **ConversationTimeline** (extends Shadcn ScrollArea)
   ```tsx
   // Unified timeline with AI/customer/human attribution
   <ScrollArea className="h-[600px]">
     {messages.map(msg => (
       <MessageBubble
         sender={msg.sender} // 'customer' | 'ai' | 'human'
         content={msg.content}
         timestamp={msg.timestamp}
       />
     ))}
   </ScrollArea>
   ```

3. **MetricCard** (extends Shadcn Card + Recharts)
   ```tsx
   // Card with sparkline and trend indicator
   <Card>
     <CardHeader>
       <CardTitle>Automation Rate</CardTitle>
       <CardDescription>Last 7 days</CardDescription>
     </CardHeader>
     <CardContent>
       <div className="text-3xl font-bold text-green-600">68%</div>
       <p className="text-sm text-muted-foreground">↑ 5% from last week</p>
       <Sparkline data={weeklyData} />
     </CardContent>
   </Card>
   ```

4. **MorningBriefingCard** (custom composite component)
   ```tsx
   // Special card for first-login-of-day summary
   <Card className="border-l-4 border-l-blue-500">
     <CardHeader>
       <CardTitle>While you were away...</CardTitle>
     </CardHeader>
     <CardContent>
       <ul className="space-y-2">
         <li>📥 12 new leads</li>
         <li>✅ 8 fully automated</li>
         <li>⚠️ 4 need attention</li>
       </ul>
       <Button className="mt-4" variant="default">
         View 4 Priority Leads →
       </Button>
     </CardContent>
   </Card>
   ```

## Customization Strategy

**When to Use Shadcn Components As-Is:**
- Standard UI patterns (buttons, dropdowns, dialogs, tables)
- Form inputs and validation
- Layout primitives (cards, separators, scroll areas)

**When to Extend Shadcn Components:**
- **Badge:** Extend for temperature and status variants with custom colors
- **Card:** Extend for metric cards with sparklines and trend indicators
- **Table:** Extend for lead/conversation lists with inline actions and bulk selection
- **Alert:** Extend for tiered urgency notifications (critical/warning/info)

**When to Build Custom Components:**
- **ConversationTimeline:** Complex message threading with AI/human/customer attribution
- **MorningBriefingCard:** Special first-login summary with contextual content
- **FunnelVisualization:** Custom horizontal funnel (Conversation → Lead → Booking → Win)
- **AIHealthIndicator:** Custom automation rate visualization with color-coded thresholds

## Design Token Consistency

**Color Palette:**
- **Primary:** Blue (#0066CC) - Brand, primary actions, links
- **Success:** Green (#00A86B) - Completed tasks, positive metrics
- **Warning:** Yellow/Orange (#F59E0B) - Needs attention, moderate urgency
- **Danger:** Red (#DC2626) - Critical alerts, negative metrics
- **Neutral:** Zinc palette (gray shades) - Text, borders, backgrounds

**Typography:**
- **Font Family:** Inter (system font fallback: -apple-system, BlinkMacSystemFont, "Segoe UI")
- **Headings:** Font weights 600-700 for hierarchy
- **Body:** Font weight 400 for readability
- **Data/Metrics:** Font weight 500-600 for emphasis

**Spacing:**
- Follow Tailwind's spacing scale (4px increments)
- Generous padding in cards (p-6 for desktop, p-4 for mobile)
- Consistent gap between elements (gap-4 for related items, gap-6 for sections)

**Interaction States:**
- **Hover:** Subtle background change (e.g., hover:bg-gray-100)
- **Active:** Pressed state with slight scale (active:scale-95)
- **Focus:** Blue ring for keyboard navigation (focus:ring-2 focus:ring-blue-500)
- **Disabled:** Reduced opacity and cursor-not-allowed

## Accessibility Foundations

Shadcn/UI is built on Radix UI primitives, which provide:
- **Keyboard Navigation:** All interactive elements focusable and operable via keyboard
- **Screen Reader Support:** ARIA attributes for semantic meaning
- **Focus Management:** Proper focus trapping in dialogs and menus
- **Color Contrast:** WCAG AA compliance for text and interactive elements

**Drive Insight-Specific Accessibility:**
- All temperature badges have text labels (not just color coding)
- Sparklines include data table fallback for screen readers
- Alert notifications announce urgency level
- Time-based data includes absolute timestamps for context
