# Repository Guidelines

## Project Structure & Module Organization
`apps/web` holds the Next.js app (`src/app`, `src/components`, `src/store`). `apps/admin` is the admin UI. `apps/api` is the NestJS backend; feature modules live in `src/modules`, shared middleware and guards in `src/common`, and tests in `src/__tests__` and `test/`. Shared code lives in `packages/database`, `packages/types`, and `packages/config`. Put schema changes in `supabase/migrations/*.sql`. Leave `_bmad/` and `_bmad-output/` alone unless the task targets workflow artifacts.

## Build, Test, and Development Commands
- `pnpm install`: install workspace dependencies.
- `pnpm dev`: run all apps in watch mode via Turbo.
- `pnpm build`, `pnpm lint`, `pnpm format`: build, lint, and format the monorepo.
- `pnpm --filter @drive-insight/api start:dev`: run only the API on port 3001.
- `pnpm --filter @drive-insight/web dev`: run the tenant dashboard on port 3000.
- `pnpm --filter @drive-insight/admin dev`: run the admin app on port 3002.
- `pnpm --filter @drive-insight/api test`, `test:e2e`, `test:cov`: run API test suites.
- `pnpm --filter @drive-insight/database test`: run database package tests.
- `npx supabase db push` or `pnpm db:reset`: apply or reset local database state.

## Coding Style & Naming Conventions
Use TypeScript throughout. Follow the existing Prettier style: 2-space indentation, semicolons, single quotes, and trailing commas. Keep NestJS filenames aligned with framework conventions such as `users.service.ts`, `auth.controller.ts`, and `login.dto.ts`. Use PascalCase for React components and classes, camelCase for functions and variables, and timestamped snake_case for migrations such as `20260306220000_fix_write_policies_uuid_casting.sql`. Fix ESLint issues before opening a PR; unused variables fail lint and `any` should be a deliberate exception.

## Testing Guidelines
Jest is the active test runner. Add unit specs as `*.spec.ts` next to the module or under `src/__tests__`; use `*.test.ts` in packages when the test exercises the database or external setup. For API changes, cover auth, RBAC, metrics, or request-context behavior where relevant. For RLS or schema changes, validate against local Supabase.

## Commit & Pull Request Guidelines
Recent history uses short, capitalized summaries such as `Added monitoring setup` and `Updated rls policies and fixed build issues`; keep commits concise, outcome-focused, and roughly under 72 characters. PRs should list affected workspaces, call out `.env` or migration changes, include verification commands, link the relevant issue or story, and attach screenshots for `apps/web` or `apps/admin` UI updates.

## Security & Configuration Tips
Copy `.env.example` to `.env` for local setup and never commit secrets. When changing auth, tenancy, or RLS behavior, update `supabase/migrations` and document any required reset steps for reviewers.
