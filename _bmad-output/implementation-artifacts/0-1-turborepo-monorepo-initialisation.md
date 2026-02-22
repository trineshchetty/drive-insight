# Story 0.1: Turborepo Monorepo Initialisation

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want a Turborepo monorepo with `apps/web`, `apps/api`, `apps/admin`, and shared `packages/` already scaffolded,
So that all team members can clone the repo and have the correct project structure immediately.

## Acceptance Criteria

**Given** a fresh clone of the repository
**When** I run `pnpm install` at the root
**Then** all workspace dependencies are installed without errors
**And** `turbo build` succeeds across all apps and packages

**Given** the monorepo is initialized
**When** I inspect the folder structure
**Then** `apps/web` contains a Next.js 15 App Router project with TypeScript, Tailwind CSS, and Shadcn/UI initialized (New York style, CSS variables)
**And** `apps/api` contains a NestJS project with TypeScript in strict mode
**And** `apps/admin` contains a Next.js 15 project with TypeScript and Tailwind CSS
**And** `packages/database` exports Supabase client initialization and type stubs
**And** `packages/types` exports shared TypeScript interfaces and Zod schemas
**And** `packages/config` exports shared ESLint and TypeScript configurations

**Given** the monorepo structure exists
**When** I run `pnpm add jotai` in `apps/web`
**Then** Jotai is installed only in the web workspace (not globally)

## Tasks / Subtasks

- [x] Initialize Turborepo monorepo with pnpm workspaces (AC: 1)
  - [x] Run `npx create-turbo@latest` to create base monorepo structure
  - [x] Configure `pnpm-workspace.yaml` for apps and packages
  - [x] Set up `turbo.json` with build pipeline configuration
  - [x] Verify `pnpm install` works correctly

- [x] Create Next.js 15 web application with Shadcn/UI (AC: 2)
  - [x] Generate Next.js 15 app in `apps/web` with TypeScript, Tailwind, ESLint
  - [x] Initialize Shadcn/UI with New York style and CSS variables
  - [x] Configure Next.js to use App Router with src directory
  - [x] Install and configure Jotai for state management
  - [x] Verify `turbo build` works for web app

- [x] Create NestJS API application (AC: 2)
  - [x] Generate NestJS project in `apps/api` with TypeScript strict mode
  - [x] Configure NestJS for production build optimization
  - [x] Set up basic health check endpoint (`/api/health`)
  - [x] Verify `turbo build` works for API app

- [x] Create Next.js 15 admin application (AC: 2)
  - [x] Generate Next.js 15 app in `apps/admin` with TypeScript and Tailwind
  - [x] Configure admin app with separate branding/theme from web app
  - [x] Verify `turbo build` works for admin app

- [x] Create shared packages structure (AC: 2)
  - [x] Create `packages/database` with Supabase client stub
  - [x] Create `packages/types` with base TypeScript interfaces and Zod schemas
  - [x] Create `packages/config` with shared ESLint and TypeScript configs
  - [x] Configure proper exports in each package's package.json

- [x] Test workspace isolation and dependencies (AC: 3)
  - [x] Test installing Jotai only in web workspace
  - [x] Verify cross-package imports work correctly
  - [x] Test `turbo build` from root builds all apps and packages
  - [x] Verify `turbo dev` can start all apps concurrently

## Dev Notes

### Critical Architecture Requirements

**Monorepo Tool:** Turborepo 2.x (latest stable: 2.8.10)
- Rust-based build system optimized for TypeScript/JavaScript
- Provides intelligent caching and parallel execution
- Install via: `npx create-turbo@latest`

**Package Manager:** pnpm workspaces
- Faster than npm, more disk-efficient than yarn
- Required for monorepo workspace management
- Version: Latest stable (pnpm 9.x recommended)

**Frontend Stack (apps/web & apps/admin):**
- Next.js 15 (App Router) - Latest stable: 15.5+
- TypeScript strict mode enabled
- Tailwind CSS 4.x with JIT compiler
- Shadcn/UI component library (New York style, CSS variables theme)
- Jotai for state management (web app only)
- Install command: `npx create-next-app@latest` with flags: `--typescript --tailwind --eslint --app --src-dir`

**Backend Stack (apps/api):**
- NestJS 11.x (latest stable: 11.1.14)
- TypeScript strict mode
- Install via: `npx @nestjs/cli new api --package-manager pnpm --skip-git`
- Configure for monorepo environment (no separate git init)

**Shared Packages:**
- `packages/database`: Supabase client + generated types (stub for now)
- `packages/types`: Shared TypeScript interfaces, Zod schemas, DTOs
- `packages/config`: ESLint configs, TypeScript configs (extends from base)

### Project Structure (Target State)

```
drive-insight/  (or current repo name: trinstel-auto-ai)
├── apps/
│   ├── web/                      # Next.js 15 tenant dashboard
│   │   ├── src/
│   │   │   ├── app/              # App Router pages
│   │   │   ├── components/       # React components (Shadcn)
│   │   │   ├── lib/              # Utilities
│   │   │   └── store/            # Jotai atoms
│   │   ├── public/
│   │   ├── next.config.js
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   ├── api/                      # NestJS backend
│   │   ├── src/
│   │   │   ├── modules/          # Feature modules (empty for now)
│   │   │   ├── common/           # Shared code (empty for now)
│   │   │   ├── app.module.ts
│   │   │   ├── app.controller.ts # Health check endpoint
│   │   │   ├── app.service.ts
│   │   │   └── main.ts
│   │   ├── test/
│   │   ├── nest-cli.json
│   │   ├── tsconfig.json
│   │   └── package.json
│   ├── admin/                    # Next.js 15 admin dashboard
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── components/
│   │   │   └── lib/
│   │   ├── public/
│   │   ├── next.config.js
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
├── packages/
│   ├── database/                 # Supabase client + types
│   │   ├── src/
│   │   │   ├── client.ts         # Stub: export placeholder
│   │   │   └── index.ts          # Re-exports
│   │   ├── tsconfig.json
│   │   └── package.json
│   ├── types/                    # Shared TypeScript types
│   │   ├── src/
│   │   │   ├── index.ts          # Placeholder types
│   │   │   └── schemas/          # Zod schemas (stubs)
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── config/                   # Shared configs
│       ├── eslint-config/
│       │   └── index.js
│       ├── typescript-config/
│       │   ├── base.json
│       │   ├── nextjs.json
│       │   └── nestjs.json
│       └── package.json
├── turbo.json                     # Turborepo pipeline config
├── pnpm-workspace.yaml
├── package.json                   # Root package.json
├── .gitignore
└── README.md
```

### Technology Versions (February 2026)

**Critical:** Use these specific versions to ensure compatibility:

- **Turborepo:** 2.8.10 (latest stable)
- **Next.js:** 15.5+ (App Router, stable with React 19)
  - Note: Next.js 16 exists but stick with 15.x for stability
  - React 19 support confirmed
- **NestJS:** 11.1.14 (latest stable, enhanced TypeScript support)
- **pnpm:** 9.x (recommended for workspace management)
- **TypeScript:** 5.x (required for NestJS 11+)
- **Tailwind CSS:** 4.x (JIT compiler enabled)
- **Shadcn/UI:** Latest (CLI-based installation, no npm package)
- **Jotai:** Latest stable from npm

### Shadcn/UI Installation Notes

**Important:** Shadcn/UI is NOT an npm dependency - it copies components directly into your project.

**Installation Steps for apps/web:**
1. Navigate to `apps/web`
2. Run: `npx shadcn@latest init`
3. Select: **New York** style
4. Select: **CSS variables** for theming (supports dark mode)
5. Components will be added to `apps/web/src/components/ui/`

**Known Issue (React 19):**
- If using npm with React 19, use `--legacy-peer-deps` flag
- pnpm handles React 19 peer dependencies better (recommended)

### Testing Requirements

**Unit Tests:** Not required for this story (scaffolding only)

**Integration Tests:** Verify the following manually:
1. `pnpm install` at root completes without errors
2. `turbo build` successfully builds all apps and packages
3. `turbo dev` starts all dev servers (web:3000, api:3001, admin:3002)
4. Workspace isolation works (installing in one app doesn't affect others)

### References

- **Architecture Source:** `_bmad-output/planning-artifacts/architecture.md`
  - Section: "Starter Template Evaluation" (lines 218-398)
  - Section: "Initialization Commands" (lines 262-300)
  - Section: "Project Structure" (lines 302-346)
- **Epic Source:** `_bmad-output/planning-artifacts/epics.md`
  - Epic 0, Story 0.1 (lines 247-273)
- **Technical Stack Summary:** `architecture.md` frontmatter (lines 10-27)

### Known Challenges & Solutions

**Challenge 1: React 19 Peer Dependency Warnings**
- **Solution:** Use pnpm (handles peer deps better than npm)
- **Fallback:** Use `npm install --legacy-peer-deps` if npm required

**Challenge 2: Turborepo Cache Pollution**
- **Solution:** Run `turbo clean` if builds behave unexpectedly
- **Prevention:** Don't commit `.turbo/` directory (add to .gitignore)

**Challenge 3: TypeScript Path Aliases Across Workspaces**
- **Solution:** Each package must define proper `exports` in package.json
- **Example:**
  ```json
  {
    "name": "@drive-insight/types",
    "exports": {
      ".": "./src/index.ts"
    }
  }
  ```

**Challenge 4: NestJS in Monorepo**
- **Solution:** Use `--skip-git` flag when generating NestJS app
- **Reason:** Turborepo manages git at monorepo root, not per-app

### Next Story Dependencies

This story is a **foundation story** - all subsequent stories depend on it.

**Immediate Next Steps (Story 0.2):**
- Docker Compose setup for local development
- Supabase local stack integration
- Hot-reload configuration for all apps

**Files Created by Story 0.3 (CI/CD) Will Use:**
- `turbo.json` pipeline for GitHub Actions
- Individual app Dockerfiles (not created in this story)

### Implementation Checklist

- [x] Turborepo initialized with correct structure
- [x] pnpm workspaces configured
- [x] Next.js 15 web app with Shadcn/UI (New York, CSS variables)
- [x] Next.js 15 admin app with Tailwind
- [x] NestJS API app with health endpoint
- [x] packages/database stub created
- [x] packages/types stub created
- [x] packages/config with ESLint and TypeScript configs
- [x] turbo.json configured with build pipeline
- [x] `pnpm install` works from root
- [x] `turbo build` succeeds for all apps
- [x] Workspace isolation verified
- [x] README.md updated with getting started instructions

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Debug Log References

- Turbo 2.x required `tasks` instead of `pipeline` in turbo.json
- Tailwind CSS 4.x requires `@tailwindcss/postcss` plugin instead of legacy postcss plugin
- Tailwind 4.x uses `@import "tailwindcss"` syntax instead of `@tailwind` directives
- React 19 uses `React.ReactNode` instead of `React.Node`

### Completion Notes List

✅ All acceptance criteria met:
1. Turborepo monorepo initialized with pnpm workspaces
2. All apps scaffold complete (web, api, admin)
3. All shared packages created (database, types, config)
4. Jotai installed only in web workspace (workspace isolation verified)
5. `turbo build` succeeds across all apps (3/3 successful)

**Code Review Fixes Applied (2026-02-21):**
- ✅ Fixed task tracking: All 30 tasks marked as complete [x]
- ✅ Added root .gitignore file (prevents committing .turbo/ cache)
- ✅ Created sample Jotai atoms in apps/web/src/store/index.ts
- ✅ Installed Shadcn button component (apps/web/src/components/ui/button.tsx)
- ✅ Updated packages/config/package.json with proper exports configuration

**Technology Versions Installed:**
- Turborepo: 2.8.10
- Next.js: 15.5.12
- React: 19.2.4
- NestJS: 11.1.14
- pnpm: 9.12.1
- Tailwind CSS: 4.2.0
- Jotai: 2.18.0
- TypeScript: 5.x

**Build Output:**
- Web app: 102 kB initial load (static)
- Admin app: 102 kB initial load (static)
- API app: NestJS production build successful

### File List

**Root:**
- package.json
- pnpm-workspace.yaml
- turbo.json
- .gitignore

**apps/web:**
- package.json
- tsconfig.json
- next.config.js
- tailwind.config.ts
- postcss.config.js
- components.json (Shadcn/UI)
- .eslintrc.json
- .gitignore
- README.md
- src/app/layout.tsx
- src/app/page.tsx
- src/app/globals.css
- src/lib/utils.ts
- src/store/index.ts
- src/components/ui/button.tsx

**apps/api:**
- package.json
- tsconfig.json
- nest-cli.json
- .gitignore
- README.md
- src/main.ts
- src/app.module.ts
- src/app.controller.ts
- src/app.service.ts

**apps/admin:**
- package.json
- tsconfig.json
- next.config.js
- tailwind.config.ts
- postcss.config.js
- .eslintrc.json
- .gitignore
- README.md
- src/app/layout.tsx
- src/app/page.tsx
- src/app/globals.css

**packages/database:**
- package.json
- tsconfig.json
- src/client.ts
- src/index.ts

**packages/types:**
- package.json
- tsconfig.json
- src/index.ts
- src/schemas/index.ts

**packages/config:**
- package.json
- typescript-config/base.json
- typescript-config/nextjs.json
- typescript-config/nestjs.json
- eslint-config/index.js
