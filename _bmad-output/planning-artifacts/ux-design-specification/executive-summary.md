# Executive Summary

## Project Vision

Drive Insight is a lightweight, AI-powered overlay dashboard for progressive car dealerships that transforms multi-channel lead chaos into clear ROI insights. It's designed for tech-forward dealerships who are drowning in fragmented tools and want a single, focused command center that shows them exactly how their AI automation is performing and where leads need human attention. The product deliberately avoids feature bloat, instead offering role-optimized views that surface the right information at the right time.

## Target Users

**Primary Audience:**
- Sales Managers and Dealer Principals at tech-progressive dealerships (not traditional family-run operations resistant to digital tools)
- Desktop-first workers who check in morning and evening for strategic reviews
- Sales reps use mobile phones, but customer communication happens via ManyChat mobile app (not Drive Insight)
- Platform Administrators who monitor system health daily and troubleshoot as-needed

**Tech Profile:**
- Comfortable with modern web dashboards and data visualization
- Value simplicity over feature count
- Appreciate automation but want visibility into how it works

**Device Usage:**
- **Primary:** Desktop for dashboards, reporting, and deep-dive analysis
- **Secondary:** Mobile for quick checks (responsive, not native app)
- **Communication:** ManyChat mobile app (separate from Drive Insight)

**Daily Rhythms:**
- **Morning:** Review overnight leads, check automation performance, identify priority actions
- **End of Day:** Pipeline reviews, ROI analysis, team performance assessment
- **Occasional:** Mid-day check-ins when alerts fire

## Key Design Challenges

1. **Cognitive Load Reduction**
   - **Problem:** Users are burned out by complex, feature-heavy systems
   - **Approach:** Role-based dashboards with progressive disclosure and clear visual hierarchy

2. **AI Transparency & Trust**
   - **Problem:** Managers need to understand and trust AI decisions to tune performance
   - **Approach:** Clear conversation transcript tagging, sentiment visualizations, drop-off explanations, and performance comparisons

3. **Real-Time Awareness Without Constant Monitoring**
   - **Problem:** Users check morning and evening but need immediate notification of critical issues
   - **Approach:** Smart configurable alerts, proactive status indicators, and daily digest emails

4. **Single Sign-On & Context Continuity**
   - **Problem:** Login fatigue from multiple systems kills productivity
   - **Approach:** Supabase auth with session persistence and deep linking from email alerts

5. **Mobile-Friendly for Quick Checks**
   - **Problem:** Occasional on-the-floor mobile access without native app complexity
   - **Approach:** Responsive dashboard with touch-friendly controls and key metrics above the fold

## Design Opportunities

1. **"Morning Briefing" Dashboard**
   - Auto-detect first login of the day and surface overnight summary
   - "While you were away: 12 new leads, 8 automated, 4 need attention"
   - One-click jump to priority actions

2. **AI Performance Scorecard**
   - Visual funnel: Conversation → Lead → Booking → Win
   - Hover over drop-off points to see why (sentiment keywords, patterns)
   - AI-suggested fixes based on conversation analysis

3. **Zero-Noise Alerting**
   - User-configurable alert rules (e.g., "Notify me if automation rate drops below 60%")
   - Tiered urgency with color coding (critical/warning/info)
   - In-app notification center (bell icon) + email for critical issues

4. **Cross-Tenant Insights for Admins**
   - Tenant performance leaderboard (gamified healthy competition)
   - Outlier detection: "Tenant X has 2× booking conversion - what are they doing?"
   - Bulk tenant actions (pause all in a region with one click)
