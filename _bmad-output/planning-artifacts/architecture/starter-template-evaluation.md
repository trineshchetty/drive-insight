# Starter Template Evaluation

## Primary Technology Domain

Full-stack SaaS (Next.js frontend + NestJS backend + Supabase + Docker deployment)

## Technical Preferences Established

**Frontend Stack:**
- Language: TypeScript
- Framework: Next.js 15 (App Router)
- UI Components: Shadcn/UI
- State Management: Jotai
- Styling: Tailwind CSS

**Backend Stack:**
- Language: TypeScript (Node.js)
- Framework: NestJS
- Database: Supabase (PostgreSQL + RLS + Auth)
- Orchestration: n8n (webhook processing, integrations)
- Real-time: **Server-Sent Events (SSE)** for dashboard updates and notifications

**Deployment:**
- Local Development: Docker Compose
- Production: Docker containers on Hostinger VPS
- Future Migration: AWS ECS/Fargate (architecture supports easy migration)

**Monorepo:**
- Tool: Turborepo
- Package Manager: pnpm workspaces
- Structure: Separate apps for web/api, shared packages for types/database/config

## Selected Starter: Turborepo Monorepo (Custom Setup)

**Rationale for Selection:**

1. **Type Safety**: Supabase generated types shared between frontend and backend eliminates runtime type mismatches
2. **Docker Optimization**: Multi-stage Dockerfiles per app; single docker-compose for local dev with hot-reload
3. **Modern Ecosystem**: Turborepo is lightweight, Vercel-backed, and aligns with 2025 best practices
4. **Flexibility**: Shadcn/UI and Jotai easily integrated via CLI tools (no lock-in to opinionated templates)
5. **n8n Integration**: Runs as separate Docker service, communicates via webhooks to NestJS API
6. **Migration Ready**: Docker containers port directly to ECS/Fargate with minimal config changes
7. **SSE Simplicity**: Server-Sent Events perfect for unidirectional dashboard updates without WebSocket complexity

**Initialization Commands:**

```bash
# 1. Initialize Turborepo monorepo
npx create-turbo@latest drive-insight --package-manager pnpm
cd drive-insight

# 2. Create Next.js frontend (in apps/web)
cd apps
npx create-next-app@latest web --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd web

# 3. Add Shadcn/UI to Next.js
npx shadcn@latest init
# Select: New York style, Neutral color, CSS variables: yes

# 4. Add Jotai for state management
pnpm add jotai

# 5. Create NestJS backend (in apps/api)
cd ../
npx @nestjs/cli new api --package-manager pnpm --skip-git

# 6. Add Supabase client to backend
cd api
pnpm add @supabase/supabase-js

# 7. Create shared packages
cd ../../packages
mkdir database types config

# 8. Add Supabase local development
# (Supabase CLI for local Postgres + Studio)
pnpm add -D supabase
npx supabase init

# 9. Setup Docker Compose
# (Create docker-compose.yml and docker-compose.prod.yml - see structure below)
```

**Project Structure:**

```
drive-insight/
├── apps/
│   ├── web/                      # Next.js 15 + Shadcn + Jotai
│   │   ├── src/
│   │   │   ├── app/              # App Router pages
│   │   │   ├── components/       # React components (Shadcn)
│   │   │   ├── lib/              # Utilities, Supabase client, SSE hooks
│   │   │   └── store/            # Jotai atoms
│   │   ├── public/
│   │   ├── Dockerfile            # Multi-stage: development + production
│   │   ├── next.config.js
│   │   └── package.json
│   ├── api/                      # NestJS backend
│   │   ├── src/
│   │   │   ├── modules/          # Feature modules
│   │   │   ├── common/           # Shared guards, interceptors
│   │   │   ├── sse/              # SSE service for real-time updates
│   │   │   └── main.ts
│   │   ├── Dockerfile            # Optimized Node.js production
│   │   ├── nest-cli.json
│   │   └── package.json
├── packages/
│   ├── database/                 # Supabase client + generated types
│   │   ├── src/
│   │   │   ├── client.ts         # Supabase initialization
│   │   │   └── types.ts          # Generated DB types
│   │   └── package.json
│   ├── types/                    # Shared TypeScript types
│   │   └── src/
│   │       └── index.ts          # DTOs, interfaces
│   └── config/                   # Shared configs
│       ├── eslint-config/
│       └── typescript-config/
├── supabase/
│   ├── migrations/               # Database migrations
│   └── config.toml               # Supabase local config
├── docker-compose.yml             # Dev: Supabase + API + Web + n8n
├── docker-compose.prod.yml        # Prod overrides for Hostinger
├── turbo.json                     # Turborepo pipeline config
├── pnpm-workspace.yaml
└── package.json
```

**Architectural Decisions Provided by This Setup:**

**Language & Runtime:**
- TypeScript across entire stack (strict mode enabled)
- Node.js 20+ for both frontend and backend
- ESM modules with top-level await support

**Styling Solution:**
- Tailwind CSS 4.x with JIT compiler
- Shadcn/UI component library (copy-paste, not npm dependency)
- CSS variables for theming (supports dark mode out-of-box)

**Build Tooling:**
- Turbopack for Next.js development (faster than Webpack)
- SWC for TypeScript compilation (faster than tsc)
- Turborepo for monorepo task orchestration with caching
- Docker multi-stage builds for production optimization

**Testing Framework:**
- Jest + React Testing Library for Next.js (frontend unit tests)
- Jest + Supertest for NestJS (backend integration tests)
- Playwright for E2E tests (to be added in testing story)

**Code Organization:**
- Next.js: App Router with `/app` directory, co-located components
- NestJS: Module-based architecture (one module per domain)
- Shared packages: `@drive-insight/database`, `@drive-insight/types`

**Development Experience:**
- Hot Module Replacement (HMR) for both Next.js and NestJS via Docker volumes
- pnpm workspaces for fast installs and disk space efficiency
- Turborepo caching eliminates redundant builds
- Supabase Studio (local) for database inspection at `localhost:54323`
- n8n UI for workflow debugging at `localhost:5678`

**Docker Strategy:**
- **Development**: `docker-compose up` starts all services with hot-reload
- **Production**: `docker-compose -f docker-compose.prod.yml up` uses optimized builds
- **Migration to ECS**: Same Dockerfiles, swap docker-compose for ECS task definitions

**Real-time Strategy:**
- **Server-Sent Events (SSE)** for unidirectional updates:
  - Dashboard metrics updates (conversations count, automation rate)
  - Real-time notifications (new lead assignments, booking confirmations)
  - System health status updates
- **Implementation**: NestJS SSE endpoints (`/api/sse/dashboard`, `/api/sse/notifications`)
- **Frontend**: React hooks for SSE connection management with auto-reconnect
- **Rationale**: SSE is simpler than WebSockets, HTTP-based (firewall-friendly), and perfect for server-to-client updates without bidirectional need

**Note:** Project initialization is the first implementation story. All commands above should be executed as part of Epic 0: Project Setup.

---
