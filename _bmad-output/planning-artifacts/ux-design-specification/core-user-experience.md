# Core User Experience

## Defining Experience

Drive Insight's core experience revolves around the **"lead needs attention" notification → action flow**. Users (primarily Sales Managers and Dealer Principals) perform two key rituals:

1. **Morning Review Ritual (8am):** Log in, see overnight summary, one-click jump to leads needing human attention
2. **Alert-Driven Actions (Throughout Day):** Receive notifications, jump directly to conversation context, take immediate action

The product's value is delivered through **effortless triage** - automatically separating what AI handled successfully from what needs human intervention, with zero friction between awareness and action.

**Core User Actions (Most Frequent):**
- Checking dashboard for overnight leads
- Reviewing conversation transcripts to understand AI interactions
- Managing lead assignments to distribute workload

**Critical Actions (Must Get Right):**
- Identifying which leads need human attention (AI flagging + filtering)
- Tracking leads through full funnel: conversation → booking → sale
- Understanding why conversations dropped off (sentiment, keywords, patterns)
- Managing bookings (confirmations, rescheduling, no-show tracking)

## Platform Strategy

**Primary Platform:**
- Web application (browser-based, no native mobile app)
- Responsive design supporting desktop (primary) and mobile (quick checks)
- Accessed via modern browsers: Chrome, Safari, Edge, Firefox

**Interaction Patterns:**
- **Desktop:** Mouse + keyboard for deep work (transcript review, data analysis, pipeline management)
- **Mobile:** Touch-friendly for quick checks (tap, swipe, scroll through dashboards)
- **No keyboard shortcuts required** for MVP (standard browser navigation)

**Connectivity:**
- 100% online/real-time (no offline functionality)
- Live data updates via Server-Sent Events (SSE)
- Requires stable internet connection for optimal experience

**Notification Strategy:**
- **Primary:** Desktop push notifications (browser-based)
- **Secondary:** Email notifications for critical alerts
- Notifications include deep links directly to relevant conversations/leads

## Effortless Interactions

**1. Automatic Role-Based Dashboards**
- Same dashboard shell for all users (consistency)
- Widgets and data adapt to user role automatically:
  - **Owner:** ROI metrics, automation rate, revenue attribution, cross-dealership insights
  - **Manager:** Pipeline visibility, team performance, SLA compliance, assignment distribution
  - **Agent:** Assigned leads, urgent conversations, follow-up actions, today's bookings
- No manual configuration required - system knows user role from login

**2. Global Search (Always Visible)**
- Persistent search bar in top navigation (always accessible)
- Search across:
  - Customer name, phone number, email
  - Vehicle interest (make, model, year)
  - Date ranges (last 7 days, last 30 days, custom)
  - Lead status (new, qualified, booking created, won, lost)
  - Conversation status (active, completed, abandoned, human_active)
- Search results show:
  - Conversation snippet with matching keywords highlighted
  - Lead status badge and temperature indicator
  - Last activity timestamp
  - Quick action buttons inline

**3. Deep-Linked Alerts with Inline Actions**
- Notifications jump directly to relevant context:
  - "Lead: John Smith - HOT - Dropped off after pricing question" → Opens conversation transcript with drop-off point highlighted
- Alert cards include quick actions without navigation:
  - [Assign to Agent] [Call Customer] [Send Manual WhatsApp] [Mark as Lost]
- Dismissible alerts with "Remind me later" option
- Alert center (bell icon) shows history of all notifications

**4. AI Health at a Glance**
- Single automation rate metric in dashboard header:
  - **"Automation Rate: 68%"** with color coding
  - **Green >70%:** AI performing well
  - **Yellow 50-70%:** Monitor for issues
  - **Red <50%:** Immediate attention required
- Click metric → Drill-down to drop-off analysis and conversation patterns

## Critical Success Moments

**Morning Review Success (8am Login):**
1. **Dashboard shows:** "While you were away: 12 new leads, 8 fully automated, 4 need attention"
2. **One-click action:** "View 4 Priority Leads" button → Filtered list of leads requiring human intervention
3. **Manager workflow:**
   - Address high-value leads first (HOT temperature, high intent)
   - Review automated conversations later (verify AI quality)
4. **Success indicator:** Manager feels in control, no leads slip through cracks

**Lead Needs Attention Flow:**
1. **Alert fires:** "Lead: John Smith - HOT - Dropped off after pricing question"
2. **Click notification** → Conversation transcript opens
3. **Context visible:**
   - Full conversation history (customer + AI messages)
   - AI responses highlighted with agent node labels
   - Drop-off reason shown: "Customer asked about trade-in value, AI couldn't provide estimate"
4. **Actions available inline:**
   - [Assign to Agent] - Route to specific salesperson
   - [Call Customer] - Click-to-dial (if phone integration available)
   - [Send Manual WhatsApp] - Deep link to ManyChat inbox
   - [Mark as Lost] - Record reason and close
5. **Result:** Action taken → Lead status updated → Alert dismissed → User returns to dashboard

**AI Performance Tuning Success:**
1. **Dashboard shows:** "Automation rate: 58% (↓ 12% from last week)" in red
2. **Click metric** → Drill-down view showing:
   - Drop-off reasons breakdown (chart + table)
   - Pattern identified: "10 leads dropped when AI couldn't answer: 'Do you accept trade-ins?'"
   - Top 5 unanswered questions causing drop-offs
3. **Manager action:** Flag "trade-in acceptance" knowledge gap for AI agent improvement
4. **Result:** Clear, actionable insight → Manager knows exactly what to fix in prompts/knowledge base

## Experience Principles

**1. Triage, Don't Overwhelm**
- Automatically separate signal from noise
- Show what needs attention first, hide details until requested
- Use progressive disclosure: summary → detail → deep-dive
- Never force users to process irrelevant information

**2. Context at the Point of Action**
- Never make users hunt for information to complete a task
- Alerts include full context: who, what, why, when
- Actions available inline where decisions are made
- Deep links eliminate navigation overhead

**3. One-Click to Value**
- Morning review: One click from summary to priority leads
- Alert response: One click from notification to actionable conversation
- AI insights: One click from metric to root cause analysis
- Minimize clicks between awareness and resolution

**4. Trust Through Transparency**
- AI decisions always visible and explainable
- Conversation transcripts show exactly what AI said (verbatim)
- Drop-off reasons backed by conversation analysis
- Pattern detection surfaces "why" behind metrics

**5. Progressive Disclosure**
- Start simple: High-level metrics and status indicators
- Drill down on demand: Click metric → See breakdown → View individual conversations
- Respect user attention: Show only what's relevant to current role and task
- Advanced features hidden until needed (no feature bloat)
