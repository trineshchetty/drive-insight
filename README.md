# Drive Insight - Turborepo Monorepo

AI-powered dealership management platform built with Next.js, NestJS, and Supabase.

## Project Structure

```
drive-insight/
├── apps/
│   ├── web/          # Next.js 15 tenant dashboard (port 3000)
│   ├── api/          # NestJS backend API (port 3001)
│   └── admin/        # Next.js 15 admin dashboard (port 3002)
├── packages/
│   ├── database/     # Supabase client + types
│   ├── types/        # Shared TypeScript types & Zod schemas
│   └── config/       # Shared ESLint & TypeScript configs
└── _bmad/            # BMad Method workflow files (do not modify)
```

## Tech Stack

- **Monorepo:** Turborepo 2.8.10 + pnpm 9.12.1
- **Frontend:** Next.js 15.5.12 + React 19 + TypeScript 5
- **Styling:** Tailwind CSS 4.2.0 + Shadcn/UI (web app only)
- **State Management:** Jotai 2.18.0 (web app only)
- **Backend:** NestJS 11.1.14 + TypeScript 5
- **Database:** Supabase PostgreSQL (to be configured in Story 1.1)
- **Validation:** Zod 3.24.1 (shared across apps)

## Getting Started

### Prerequisites

- **Node.js 20+**
- **pnpm 9.12.1** (already configured via `packageManager` field)
- **Docker Desktop** (required for local development with Docker Compose)

### Quick Start with Docker Compose (Recommended)

The fastest way to run the entire stack locally:

```bash
# 1. Clone the repository
git clone <repository-url>
cd trinstel-auto-ai

# 2. Copy environment variables
cp .env.example .env

# 3. Start Supabase local stack
npx supabase start

# 4. Copy Supabase keys from the output into .env
# Look for: "anon key" and "service_role key"

# 5. Start all services with Docker Compose
docker-compose up

# 6. Apply database migrations
npx supabase db push
```

**Docker Compose Services (started with docker-compose up):**
- 🌐 **Web App (Tenant Dashboard):** http://localhost:3000
- 🚀 **API (Backend):** http://localhost:3001
- 👑 **Admin App:** http://localhost:3002
- 🔄 **n8n Workflow Automation:** http://localhost:5678

**Supabase Services (started separately with npx supabase start):**
- 🗄️ **Supabase Studio:** http://localhost:54323
- 📊 **PostgreSQL Database:** localhost:54322
- 🔐 **Supabase Auth API:** http://localhost:54321
- 📧 **Mailpit (Email Testing):** http://localhost:54324

### Alternative: Local Development without Docker

If you prefer to run services natively (without Docker):

```bash
# Install all dependencies for all workspaces
pnpm install

# Build all apps and packages
pnpm turbo build

# Start Supabase local stack
npx supabase start

# Run all apps in development mode
pnpm turbo dev
```

### Individual App Commands

```bash
# Web app (tenant dashboard)
cd apps/web
pnpm dev          # http://localhost:3000
pnpm build

# API (backend)
cd apps/api
pnpm dev          # http://localhost:3001
pnpm build

# Admin app
cd apps/admin
pnpm dev          # http://localhost:3002
pnpm build
```

## Workspace Commands

```bash
# Run a command in all workspaces
pnpm turbo <command>

# Examples:
pnpm turbo build     # Build all apps
pnpm turbo lint      # Lint all apps
pnpm turbo clean     # Clean build artifacts
```

## Adding Dependencies

```bash
# Add to a specific workspace
cd apps/web
pnpm add <package>

# Add to root (dev dependencies)
pnpm add -w <package>

# Add to a specific workspace from root
pnpm add <package> --filter @drive-insight/web
```

## Shadcn/UI Components

The web app uses Shadcn/UI with New York style and CSS variables for theming.

```bash
# Add components to web app
cd apps/web
npx shadcn@latest add button
npx shadcn@latest add card
```

Components are installed to `apps/web/src/components/ui/`.

## Docker Compose Commands

```bash
# Start all services in foreground (see logs)
docker-compose up

# Start all services in background (detached)
docker-compose up -d

# Stop all services
docker-compose down

# Stop and remove volumes (clears all data)
docker-compose down -v

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f web
docker-compose logs -f api

# Rebuild specific service
docker-compose build web
docker-compose build api

# Rebuild and restart specific service
docker-compose up -d --build web
```

## Database Migrations

```bash
# Apply migrations to local Supabase database
npx supabase db push

# Create a new migration
npx supabase migration new <migration_name>

# Reset local database (WARNING: deletes all data)
npx supabase db reset
```

## Troubleshooting

### Docker Issues

**Problem: "Cannot connect to Docker daemon"**
- **Solution:** Ensure Docker Desktop is running

**Problem: "Port already in use"**
- **Solution:** Check what's using the port: `lsof -i :3000` (or 3001, 3002, etc.)
- Stop the conflicting process or change ports in `docker-compose.yml`

**Problem: Services not starting or crashing**
- **Solution:** Check logs: `docker-compose logs <service-name>`
- Rebuild containers: `docker-compose up --build`

### Hot Reload Not Working

**Problem: File changes not detected in Docker**
- **Solution:** Add `CHOKIDAR_USEPOLLING=true` to `.env`
- This forces file polling (slower but more reliable on macOS/Windows)

**Problem: NestJS recompilation takes longer than 5 seconds**
- **Solution:** This is expected on first change after startup
- Subsequent changes should be faster (<5s)

### Supabase Issues

**Problem: "Cannot connect to Supabase"**
- **Solution:** Ensure Supabase is running: `npx supabase status`
- If not running: `npx supabase start`

**Problem: "Invalid JWT" or authentication errors**
- **Solution:** Regenerate Supabase keys:
  ```bash
  npx supabase stop
  npx supabase start
  # Copy new keys to .env
  ```

### Build Issues

**Problem: "Module not found" or import errors**
- **Solution:** Rebuild Docker containers: `docker-compose build --no-cache`

**Problem: pnpm install fails in Docker**
- **Solution:** Delete `node_modules` and `pnpm-lock.yaml`, then rebuild:
  ```bash
  docker-compose down
  docker-compose build --no-cache
  docker-compose up
  ```

## Project Status

- ✅ **Story 0.1:** Turborepo monorepo initialization (DONE)
- ✅ **Story 0.2:** Docker Compose local development (DONE)
- ⏳ **Story 0.3:** CI/CD pipeline
- ⏳ **Story 0.4:** Monitoring & observability

See `_bmad-output/implementation-artifacts/sprint-status.yaml` for detailed progress.

## BMad Method

This project uses the BMad Method for structured software development. All planning artifacts, epics, stories, and workflows are in the `_bmad/` and `_bmad-output/` directories.

**DO NOT modify BMad files unless you know what you're doing.** These files drive the AI-assisted development process.

## License

Proprietary - Drive Insight Platform
