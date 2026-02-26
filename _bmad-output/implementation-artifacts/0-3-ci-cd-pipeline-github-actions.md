# Story 0.3: CI/CD Pipeline (GitHub Actions)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want every push to `main` to automatically test, build, and deploy to Hostinger,
so that releases are consistent, auditable, and require no manual steps.

## Acceptance Criteria

**Given** a pull request is opened against `main`
**When** the GitHub Actions workflow triggers
**Then** `pnpm test` runs across all workspaces and must pass before merge is allowed
**And** `pnpm build` must succeed for all apps

**Given** a commit is merged to `main`
**When** the deploy job runs
**Then** Docker images are built for `apps/api`, `apps/web`, and `apps/admin` tagged with the Git SHA
**And** images are pushed to the container registry
**And** the Hostinger VPS is updated via SSH + `docker compose pull && docker compose up -d`
**And** deployment completes within 10 minutes end-to-end

**Given** the production deploy uses Docker Secrets
**When** the API container starts
**Then** `DB_PASSWORD`, `JWT_SECRET`, and `OPENAI_API_KEY` are read from `/run/secrets/` and not from environment variables directly

**Given** a test fails in CI
**When** the workflow completes
**Then** the deploy job is skipped and a failing status check is shown on the PR

## Tasks / Subtasks

- [ ] Add test task to Turborepo configuration (AC: 1)
  - [ ] Add `test` task to `turbo.json` with proper dependencies
  - [ ] Verify `pnpm turbo test` runs tests across all workspaces
  - [ ] Configure test outputs for caching

- [ ] Create GitHub Actions CI workflow (AC: 1, 4)
  - [ ] Create `.github/workflows/ci.yml` for pull request testing
  - [ ] Configure Node 20 and pnpm 9.12.1 setup
  - [ ] Add pnpm dependency caching (`pnpm store path`)
  - [ ] Add Turborepo cache for `.turbo` directory
  - [ ] Run `pnpm turbo lint` task
  - [ ] Run `pnpm turbo test` task
  - [ ] Run `pnpm turbo build` task
  - [ ] Configure status check to block merge on failure

- [ ] Create production docker-compose file (AC: 2, 3)
  - [ ] Create `docker-compose.prod.yml` with production service definitions
  - [ ] Configure Docker Secrets for API service
  - [ ] Define secrets: `db_password`, `jwt_secret`, `admin_jwt_secret`, `openai_api_key`
  - [ ] Update API service to read secrets from `/run/secrets/`
  - [ ] Remove direct environment variable usage for sensitive data

- [ ] Implement secret reading in API code (AC: 3)
  - [ ] Create `apps/api/src/config/secrets.ts` utility
  - [ ] Implement `readSecret()` function to read from `/run/secrets/` or env fallback
  - [ ] Update database configuration to use `readSecret('DB_PASSWORD')`
  - [ ] Update JWT configuration to use `readSecret('JWT_SECRET')`
  - [ ] Update OpenAI configuration to use `readSecret('OPENAI_API_KEY')`
  - [ ] Test secret reading in Docker environment

- [ ] Create GitHub Actions deploy workflow (AC: 2)
  - [ ] Create `.github/workflows/deploy.yml` triggered on push to `main`
  - [ ] Add test job (runs first, required for deploy)
  - [ ] Add build job to build Docker images with Git SHA tags
  - [ ] Configure Docker buildx for multi-platform builds (optional)
  - [ ] Push images to GitHub Container Registry (ghcr.io)
  - [ ] Add deploy job with SSH to Hostinger VPS
  - [ ] Configure deployment timeout (10 minutes max)

- [ ] Configure GitHub secrets and repository settings (AC: 1, 2)
  - [ ] Add `HOSTINGER_USER` secret
  - [ ] Add `HOSTINGER_HOST` secret
  - [ ] Add `HOSTINGER_SSH_KEY` secret (private key for deployment)
  - [ ] Add container registry authentication secrets
  - [ ] Enable branch protection rule on `main` with required status checks
  - [ ] Configure required checks: `test` job from ci.yml

- [ ] Create Hostinger VPS deployment structure (AC: 2, 3)
  - [ ] Create `/opt/drive-insight` directory on VPS
  - [ ] Create `/opt/drive-insight/secrets/` directory (restricted permissions)
  - [ ] Generate and store `db_password.txt`, `jwt_secret.txt`, `admin_jwt_secret.txt`, `openai_api_key.txt`
  - [ ] Copy `docker-compose.prod.yml` to VPS
  - [ ] Test `docker compose -f docker-compose.prod.yml up -d` manually
  - [ ] Add GitHub Actions public key to VPS `~/.ssh/authorized_keys`

- [ ] Validate CI/CD pipeline end-to-end (All ACs)
  - [ ] Create feature branch and open PR → verify tests run
  - [ ] Intentionally break a test → verify merge is blocked
  - [ ] Fix test, merge PR → verify deployment triggers
  - [ ] Monitor GitHub Actions logs for < 10 minute deployment
  - [ ] Verify Docker images tagged with commit SHA in registry
  - [ ] Verify VPS containers updated successfully
  - [ ] Test deployed applications at VPS URLs
  - [ ] Verify API reads secrets from `/run/secrets/` (check logs)

## Dev Notes

### Critical Architecture Requirements

**Epic 0 Context:**
This story is part of Epic 0 (Project Foundation & Infrastructure) and is the third of four stories establishing the development foundation. Story 0.3 creates the automated deployment pipeline that enables all future feature work to ship to production consistently and safely.

**Hard Dependencies:**
- Story 0.1 (Turborepo Monorepo Initialisation) MUST be complete - provides workspace structure
- Story 0.2 (Local Development Environment - Docker Compose) MUST be complete - provides Dockerfiles

**Technology Stack (from Stories 0.1 & 0.2):**
- **Monorepo**: Turborepo 2.8.10 with pnpm 9.12.1 workspaces
- **Node.js**: v20.14.0 (LTS)
- **Frontend**: Next.js 15.5.12 + React 19.2.4
- **Backend**: NestJS 11.1.14
- **Deployment**: Docker multi-stage builds, GitHub Actions, Hostinger VPS

**NFR Coverage:**
- **NFR-012**: "GitHub Actions CI/CD pipeline; tests must pass before merge to main"
- **NFR-013**: "Docker containerized deployment on Hostinger VPS; docker-compose for local dev"

### Project Structure (from Stories 0.1 & 0.2)

```
/Users/trinesh.chettyoldmutual.com/work/Project_Vault/trinstel-auto-ai/
├── .github/
│   └── workflows/
│       ├── ci.yml              # ← CREATE: PR testing workflow
│       └── deploy.yml          # ← CREATE: Deploy to production
├── apps/
│   ├── web/
│   │   ├── Dockerfile          # EXISTS: Multi-stage (dev + prod)
│   │   └── src/
│   ├── api/
│   │   ├── Dockerfile          # EXISTS: Multi-stage (dev + prod)
│   │   ├── src/
│   │   │   ├── config/
│   │   │   │   └── secrets.ts  # ← CREATE: Secret reading utility
│   │   │   └── main.ts
│   │   └── package.json
│   └── admin/
│       ├── Dockerfile          # EXISTS: Multi-stage (dev + prod)
│       └── src/
├── packages/
│   ├── database/
│   ├── types/
│   └── config/
├── supabase/
│   └── migrations/             # EXISTS: Initial tenant schema
├── docker-compose.yml          # EXISTS: Development configuration
├── docker-compose.prod.yml     # ← CREATE: Production with secrets
├── turbo.json                  # EXISTS: Needs test task added
├── pnpm-workspace.yaml         # EXISTS
└── package.json                # EXISTS
```

### Dockerfile Architecture (from Story 0.2)

All three apps use **identical multi-stage pattern**:

**Stages:**
1. **base**: Node 20 Alpine + pnpm 9.12.1
2. **development**: Dev dependencies + hot-reload
3. **prod-deps**: Production dependencies only
4. **builder**: Build application
5. **production**: Final optimized image ← CI/CD uses this stage

**Docker Build Commands:**
```bash
# Web app (from repository root)
docker build -f apps/web/Dockerfile --target production -t ghcr.io/OWNER/trinstel-auto-ai-web:${{ github.sha }} .

# API app
docker build -f apps/api/Dockerfile --target production -t ghcr.io/OWNER/trinstel-auto-ai-api:${{ github.sha }} .

# Admin app
docker build -f apps/admin/Dockerfile --target production -t ghcr.io/OWNER/trinstel-auto-ai-admin:${{ github.sha }} .
```

**CRITICAL:**
- Build context MUST be repository root (`.`), NOT app directories
- Must copy `pnpm-workspace.yaml` and root `package.json` for monorepo resolution
- Uses `--frozen-lockfile` for reproducible builds
- Build target is `production` stage (NOT `development`)

### GitHub Actions Configuration (Latest 2026 Best Practices)

**Recommended Workflow Structure:**
- **ci.yml**: Runs on PRs and pushes, executes tests and builds
- **deploy.yml**: Runs only on push to `main`, handles deployment

**Required Actions:**
```yaml
- uses: actions/checkout@v4
- uses: actions/setup-node@v4
  with:
    node-version: '20'
- uses: pnpm/action-setup@v3
  with:
    version: 9.12.1
- uses: actions/cache@v4  # For pnpm store
- uses: actions/cache@v4  # For .turbo cache
```

**Multi-Layer Caching Strategy (2026 Best Practice):**

1. **pnpm Dependency Cache:**
```yaml
- uses: actions/cache@v4
  with:
    path: ~/.local/share/pnpm/store
    key: ${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}
    restore-keys: ${{ runner.os }}-pnpm-
```

2. **Turborepo Build Cache:**
```yaml
- uses: actions/cache@v4
  with:
    path: .turbo
    key: ${{ runner.os }}-turbo-${{ github.sha }}
    restore-keys: ${{ runner.os }}-turbo-
```

3. **Docker Layer Cache:**
```yaml
- uses: docker/setup-buildx-action@v3
- uses: docker/build-push-action@v5
  with:
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

**Performance Targets:**
- Test job: < 5 minutes (tests + lint + build)
- Build job: < 3 minutes (Docker image builds)
- Deploy job: < 2 minutes (SSH + docker compose)
- **Total**: < 10 minutes end-to-end (AC requirement)

### Docker Secrets Configuration (AC Requirement)

**Production Compose File Structure:**
```yaml
# docker-compose.prod.yml
services:
  api:
    image: ghcr.io/OWNER/trinstel-auto-ai-api:latest
    secrets:
      - db_password
      - jwt_secret
      - admin_jwt_secret
      - openai_api_key
    environment:
      # File paths, NOT actual values
      DB_PASSWORD_FILE: /run/secrets/db_password
      JWT_SECRET_FILE: /run/secrets/jwt_secret
      ADMIN_JWT_SECRET_FILE: /run/secrets/admin_jwt_secret
      OPENAI_API_KEY_FILE: /run/secrets/openai_api_key
    ports:
      - "3001:3000"

  web:
    image: ghcr.io/OWNER/trinstel-auto-ai-web:latest
    ports:
      - "3000:3000"

  admin:
    image: ghcr.io/OWNER/trinstel-auto-ai-admin:latest
    ports:
      - "3002:3000"

secrets:
  db_password:
    file: ./secrets/db_password.txt
  jwt_secret:
    file: ./secrets/jwt_secret.txt
  admin_jwt_secret:
    file: ./secrets/admin_jwt_secret.txt
  openai_api_key:
    file: ./secrets/openai_api_key.txt
```

**Secret Reading Implementation:**
```typescript
// apps/api/src/config/secrets.ts
import { readFileSync } from 'fs';

export function readSecret(secretName: string): string {
  const secretPath = process.env[`${secretName}_FILE`];
  if (secretPath) {
    try {
      return readFileSync(secretPath, 'utf-8').trim();
    } catch (error) {
      console.error(`Failed to read secret from ${secretPath}:`, error);
      throw error;
    }
  }
  // Fallback to direct environment variable (for local development)
  const directValue = process.env[secretName];
  if (!directValue) {
    throw new Error(`Secret ${secretName} not found in file or environment`);
  }
  return directValue;
}

// Usage in configuration
import { readSecret } from './config/secrets';

export const config = {
  database: {
    password: readSecret('DB_PASSWORD'),
    // ...other config
  },
  jwt: {
    secret: readSecret('JWT_SECRET'),
    adminSecret: readSecret('ADMIN_JWT_SECRET'),
  },
  openai: {
    apiKey: readSecret('OPENAI_API_KEY'),
  },
};
```

**Why This Approach:**
- **Security**: Secrets never in environment variables or image layers
- **Flexibility**: Same code works locally (env vars) and production (files)
- **Compliance**: Meets NFR-013 requirement for Docker Secrets
- **AC3 Validation**: API must read from `/run/secrets/` in production

### Hostinger VPS Deployment Strategy

**SSH Connection Pattern:**
```yaml
- name: Deploy to Hostinger VPS
  uses: appleboy/ssh-action@v1.2.0
  with:
    host: ${{ secrets.HOSTINGER_HOST }}
    username: ${{ secrets.HOSTINGER_USER }}
    key: ${{ secrets.HOSTINGER_SSH_KEY }}
    script: |
      cd /opt/drive-insight
      docker compose -f docker-compose.prod.yml pull
      docker compose -f docker-compose.prod.yml up -d
      docker system prune -f
```

**Alternative: Official Hostinger Action**
```yaml
- uses: hostinger/deploy-on-vps@v1
  with:
    host: ${{ secrets.HOSTINGER_HOST }}
    username: ${{ secrets.HOSTINGER_USER }}
    ssh_key: ${{ secrets.HOSTINGER_SSH_KEY }}
    working_directory: /opt/drive-insight
    command: |
      docker compose -f docker-compose.prod.yml pull
      docker compose -f docker-compose.prod.yml up -d
```

**VPS Directory Structure:**
```
/opt/drive-insight/
├── docker-compose.prod.yml
├── secrets/
│   ├── db_password.txt        # 0600 permissions
│   ├── jwt_secret.txt         # 0600 permissions
│   ├── admin_jwt_secret.txt   # 0600 permissions
│   └── openai_api_key.txt     # 0600 permissions
└── (Docker images pulled from registry)
```

**Initial VPS Setup (Manual - One Time):**
```bash
# On Hostinger VPS
mkdir -p /opt/drive-insight/secrets
chmod 700 /opt/drive-insight/secrets

# Generate secure random secrets
openssl rand -base64 32 > /opt/drive-insight/secrets/jwt_secret.txt
openssl rand -base64 32 > /opt/drive-insight/secrets/admin_jwt_secret.txt

# Add actual secrets (from Supabase, OpenAI)
echo "actual-db-password" > /opt/drive-insight/secrets/db_password.txt
echo "sk-actual-openai-key" > /opt/drive-insight/secrets/openai_api_key.txt

# Restrict permissions
chmod 600 /opt/drive-insight/secrets/*.txt

# Copy production compose file
scp docker-compose.prod.yml user@host:/opt/drive-insight/

# Add GitHub Actions public key for deployment
# (Public key from GitHub Actions SSH key pair)
```

### Container Registry: GitHub Container Registry (ghcr.io)

**Why ghcr.io:**
- Free for public repos, generous for private
- Native GitHub integration (no separate registry account)
- Automatic cleanup of old images
- Easy authentication with `GITHUB_TOKEN`

**Authentication in Workflow:**
```yaml
- uses: docker/login-action@v3
  with:
    registry: ghcr.io
    username: ${{ github.actor }}
    password: ${{ secrets.GITHUB_TOKEN }}
```

**Image Naming Convention:**
```
ghcr.io/{owner}/trinstel-auto-ai-api:{git-sha}
ghcr.io/{owner}/trinstel-auto-ai-web:{git-sha}
ghcr.io/{owner}/trinstel-auto-ai-admin:{git-sha}
```

**Image Tagging Strategy:**
- **Git SHA**: Immutable tag for each commit (`${{ github.sha }}`)
- **latest**: Also tag as `latest` for easy VPS pulls
- Enables rollback to any previous version by SHA

### Turborepo Test Task Configuration

**Add to `turbo.json`:**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "clean": {
      "cache": false
    }
  }
}
```

**Test Execution:**
```bash
pnpm turbo test   # Runs tests across all workspaces with caching
pnpm turbo test --force  # Bypasses cache (for CI verification)
```

### Branch Protection Configuration

**Required Settings in GitHub:**
1. **Protect `main` branch**
2. **Require status checks before merging:**
   - `test` (from ci.yml workflow)
   - `lint` (from ci.yml workflow)
   - `build` (from ci.yml workflow)
3. **Require linear history** (optional but recommended)
4. **Include administrators** (enforce checks on all users)

**Workflow Configuration for Status Checks:**
```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  test:
    name: Test
    runs-on: ubuntu-latest
    # This job name becomes the status check
```

### Known Issues from Story 0.2 (CRITICAL)

**From Code Review Findings:**

1. **No docker-compose.prod.yml exists yet**
   - Story 0.2 created only `docker-compose.yml` (development)
   - This story MUST create production version with secrets

2. **Monorepo package resolution in Docker not validated**
   - Dockerfiles copy packages but never tested in real build
   - First CI build will be first real validation
   - Risk: `@drive-insight/types` imports may not resolve

3. **Health checks use Node.js native method**
   - Changed from `wget` (Alpine doesn't include it)
   - Uses: `node -e "require('http').get('http://localhost:3000/api/health', ...)"`
   - Should work but never tested in production

4. **Port mapping inconsistency**
   - Web app: External 3003 (not 3000 - port conflict during development)
   - Production may use different ports
   - Ensure `docker-compose.prod.yml` uses standard ports

5. **Container naming: `trinstel-auto-ai-*` not `drive-insight-*`**
   - Fixed in Story 0.2 code review
   - Matches project folder name
   - CI/CD should use same naming

### Testing Strategy

**Infrastructure Story - No Unit Tests Required:**
Similar to Stories 0.1 and 0.2, this is infrastructure scaffolding. Focus on end-to-end validation of the CI/CD pipeline itself.

**Manual Validation Tests:**

1. **AC1 Validation (PR Testing):**
   - Create feature branch
   - Make trivial change
   - Open PR against `main`
   - Verify `test` job runs in GitHub Actions
   - Verify status check appears in PR
   - Intentionally break a test
   - Verify PR cannot be merged

2. **AC2 Validation (Deployment):**
   - Merge PR to `main`
   - Monitor GitHub Actions workflow
   - Verify Docker images built with Git SHA tags
   - Verify images pushed to ghcr.io
   - Verify SSH connection to Hostinger succeeds
   - Verify `docker compose pull` and `up -d` complete
   - Check total time < 10 minutes

3. **AC3 Validation (Docker Secrets):**
   - SSH into Hostinger VPS
   - Check API container logs: `docker compose logs api`
   - Verify secrets loaded from `/run/secrets/` (not env vars)
   - Test API endpoints require valid JWT (secret loaded correctly)
   - Verify database connection works (password loaded)

4. **AC4 Validation (Test Failure Handling):**
   - Create PR with failing test
   - Verify `test` job fails
   - Verify `deploy` job is skipped
   - Verify PR shows failing status check

**Performance Monitoring:**
- GitHub Actions provides duration metrics
- Aim for < 10 minute total (AC requirement)
- Identify bottlenecks if exceeded

### Latest Technical Guidance (Feb 2026 Research)

**GitHub Actions Best Practices (2026):**
- Separate workflows: ci.yml (tests), build.yml (images), deploy.yml (production)
- Pin action versions for security: `actions/checkout@v4` not `@main`
- Use `concurrency` to cancel outdated workflow runs on new pushes
- Set explicit `permissions` on workflows (principle of least privilege)

**Docker Build Optimization:**
- Use BuildKit with `docker/build-push-action@v5`
- Enable cache-from/cache-to with GitHub Actions cache
- Multi-platform builds optional (linux/amd64 sufficient for Hostinger VPS)

**pnpm + Turborepo Caching:**
- Real-world case study: Tinybird saved 5 hours/week CI time
- Cache hit rate target: > 80% on repeated runs
- Use `--filter` for affected-only execution (future optimization)

**Docker Secrets Security:**
- Never use `ARG` or `ENV` for secrets (visible in `docker history`)
- Always mount secrets from files at `/run/secrets/`
- Separate secrets per environment (dev/staging/prod)
- Rotate secrets on schedule (not required for MVP)

### References

**Architecture Source:**
- File: `_bmad-output/planning-artifacts/architecture.md`
- CI/CD strategy: Lines 22-24, Lines 1220-1281
- Docker Secrets configuration: Lines 1260-1281

**Epic Source:**
- File: `_bmad-output/planning-artifacts/epics.md`
- Epic 0, Story 0.3: Lines 306-333
- NFR-012 and NFR-013: Lines 108-109

**Previous Stories:**
- Story 0.1: `_bmad-output/implementation-artifacts/0-1-turborepo-monorepo-initialisation.md`
  - Technology versions, monorepo structure
- Story 0.2: `_bmad-output/implementation-artifacts/0-2-local-development-environment-docker-compose.md`
  - Docker strategy, Dockerfiles, docker-compose.yml, code review findings

**Latest Tech Research (Feb 2026):**
- GitHub Actions for Docker deployment
- Docker Secrets best practices
- pnpm + Turborepo CI/CD caching strategies
- Hostinger VPS deployment patterns

### Next Story Dependencies

**Story 0.4 (Monitoring & Observability) depends on this story:**
- Needs CI/CD pipeline to ship logs/metrics to Grafana Cloud
- Production environment must exist to monitor
- Deployment workflow may add monitoring instrumentation steps

**All Future Feature Stories (Epics 1-7) depend on this story:**
- Cannot ship features without automated deployment
- CI/CD becomes the quality gate for all future work
- Test failures block all deployments (protects production)

### Implementation Checklist

**Pre-Implementation:**
- [ ] Story 0.1 complete (Turborepo monorepo initialized)
- [ ] Story 0.2 complete (Dockerfiles and docker-compose.yml exist)
- [ ] All files committed to git (currently at commit 0e37ac2)
- [ ] Hostinger VPS access confirmed (SSH credentials available)

**Configuration:**
- [ ] Add `test` task to `turbo.json`
- [ ] Create `docker-compose.prod.yml` with secrets
- [ ] Create `apps/api/src/config/secrets.ts` utility
- [ ] Update API code to use `readSecret()` function

**GitHub Actions:**
- [ ] Create `.github/workflows/ci.yml`
- [ ] Create `.github/workflows/deploy.yml`
- [ ] Configure GitHub Secrets (Hostinger, registry)
- [ ] Enable branch protection on `main`

**VPS Setup:**
- [ ] Create `/opt/drive-insight` directory
- [ ] Create `/opt/drive-insight/secrets/` with restricted permissions
- [ ] Generate and store all secret files
- [ ] Add GitHub Actions SSH public key to authorized_keys
- [ ] Copy `docker-compose.prod.yml` to VPS

**Validation:**
- [ ] Open PR → verify tests run
- [ ] Break test → verify merge blocked
- [ ] Merge PR → verify deployment triggers
- [ ] Check deployment time < 10 minutes
- [ ] Verify API reads secrets from `/run/secrets/`
- [ ] Test deployed applications work

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
