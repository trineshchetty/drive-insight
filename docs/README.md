# Documentation Index

This directory contains comprehensive project documentation for Drive Insight.

## 🔐 Security & Authentication

### [RLS-BYPASSRLS-ISSUE.md](./RLS-BYPASSRLS-ISSUE.md) ⚠️ **CRITICAL - READ FIRST**

**Complete analysis of PostgreSQL Row Level Security (RLS) bypass issue**

- Root cause: `postgres` user has `BYPASSRLS` attribute enabled
- Impact: RLS policies not enforced, tenant isolation broken
- Solutions: Remove BYPASSRLS or create dedicated app user
- Status: Issue identified, solutions documented
- **Action required before production deployment**

### [RLS-QUICK-REFERENCE.md](./RLS-QUICK-REFERENCE.md)

**Quick troubleshooting guide for RLS issues**

- Fast diagnosis steps
- Quick fixes for development
- Common issues and solutions
- Verification commands
- When to use each fix

### [JWT-AUTHENTICATION-EXPLAINED.md](./JWT-AUTHENTICATION-EXPLAINED.md)

**Complete JWT authentication implementation guide**

- JWT generation and verification with Supabase Auth
- Custom claims (tenant_id, role)
- Token expiration and refresh
- Integration with NestJS guards
- Security considerations

---

## 📊 Monitoring & Operations

### [MONITORING-SETUP.md](./MONITORING-SETUP.md)

**Complete Grafana Cloud monitoring setup guide**

- Prometheus metrics integration
- Grafana Agent configuration
- Dashboard setup
- Alert configuration
- Troubleshooting

### [MONITORING-QUICK-START.md](./MONITORING-QUICK-START.md)

**Quick start for monitoring**

- 5-minute setup guide
- Essential metrics
- Basic dashboards
- Quick troubleshooting

---

## 🧪 Testing & Development

### [TEST-ENVIRONMENT-SETUP-SESSION-LOG.md](./TEST-ENVIRONMENT-SETUP-SESSION-LOG.md)

**Session log from test environment setup**

- Integration test setup
- Supabase local development
- Database migrations
- Test data seeding
- Common issues encountered

---

## 📋 Product & Planning

### [drive-insight-prd.md](./drive-insight-prd.md)

**Product Requirements Document (PRD)**

- Product vision and scope
- User stories and features
- Technical architecture
- Implementation phases
- Success metrics

### [AI and Automation in Car Dealerships_.md](./AI%20and%20Automation%20in%20Car%20Dealerships_%20Trends,%20Innovations,%20and%20Regional%20Insights.md)

**Market research and analysis**

- AI adoption trends in automotive industry
- Regional insights
- Competitive analysis
- Innovation opportunities

---

## 🚀 Quick Start Guides

### New to the project?

1. **Understand the product:** [drive-insight-prd.md](./drive-insight-prd.md)
2. **Set up authentication:** [JWT-AUTHENTICATION-EXPLAINED.md](./JWT-AUTHENTICATION-EXPLAINED.md)
3. **⚠️ Fix RLS issue:** [RLS-QUICK-REFERENCE.md](./RLS-QUICK-REFERENCE.md)
4. **Set up monitoring:** [MONITORING-QUICK-START.md](./MONITORING-QUICK-START.md)

### Troubleshooting?

| Problem | Document |
|---------|----------|
| RLS not working, tests failing | [RLS-QUICK-REFERENCE.md](./RLS-QUICK-REFERENCE.md) |
| Users see wrong tenant data | [RLS-BYPASSRLS-ISSUE.md](./RLS-BYPASSRLS-ISSUE.md) |
| Authentication issues | [JWT-AUTHENTICATION-EXPLAINED.md](./JWT-AUTHENTICATION-EXPLAINED.md) |
| Monitoring not working | [MONITORING-SETUP.md](./MONITORING-SETUP.md) |
| Test environment issues | [TEST-ENVIRONMENT-SETUP-SESSION-LOG.md](./TEST-ENVIRONMENT-SETUP-SESSION-LOG.md) |

---

## 📁 Related Resources

### Code References

- **Authentication:** `apps/api/src/modules/auth/`
- **RLS Interceptor:** `apps/api/src/common/interceptors/tenant-context.interceptor.ts`
- **Integration Tests:** `apps/api/src/__tests__/auth/auth.integration.spec.ts`
- **RLS Test Script:** `apps/api/test-rls.js`

### Database

- **Migrations:** `supabase/migrations/`
- **RLS Policies:** `supabase/migrations/*_rls_policies.sql`
- **Seed Data:** `supabase/seed.sql`

---

## ⚠️ Critical Issues

### 🔴 SECURITY: RLS Bypass Issue

**Status:** Identified, not yet fixed
**Priority:** CRITICAL
**Action:** Read [RLS-BYPASSRLS-ISSUE.md](./RLS-BYPASSRLS-ISSUE.md) before deploying to production

**Summary:** PostgreSQL `postgres` user has `BYPASSRLS` attribute, causing all RLS policies to be ignored. This breaks tenant isolation and allows users to see/modify data from all tenants.

**Quick Fix (Dev):**
```sql
ALTER ROLE postgres NOBYPASSRLS;
```

**Production Fix:** Create dedicated `app_user` role - see [RLS-BYPASSRLS-ISSUE.md](./RLS-BYPASSRLS-ISSUE.md)

---

## 📝 Documentation Standards

When adding new documentation:

1. **Create descriptive filename** (e.g., `FEATURE-EXPLANATION.md`)
2. **Add to this README** with category and quick description
3. **Include quick links** to related docs
4. **Add troubleshooting section** if applicable
5. **Reference code locations** for implementation details

---

**Last Updated:** 2026-03-06
**Maintained By:** Development Team
