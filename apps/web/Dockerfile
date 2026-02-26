# Web App Dockerfile (Next.js 15 + Tailwind CSS 4.x + Shadcn/UI)
# Multi-stage build for development and production

# Base stage - shared dependencies
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm@9.12.1

# Development stage
FROM base AS development

# Copy workspace configuration files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy package files from all required workspaces
COPY apps/web/package.json ./apps/web/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/types/package.json ./packages/types/package.json
COPY packages/config/package.json ./packages/config/package.json

# Install all dependencies (including devDependencies for dev mode)
RUN pnpm install --frozen-lockfile

# Copy all workspace code
COPY apps/web ./apps/web
COPY packages ./packages

# Set working directory to web app
WORKDIR /app/apps/web

# Expose Next.js default port
EXPOSE 3000

# Start Next.js development server with Turbopack
CMD ["pnpm", "dev"]

# Production dependencies stage
FROM base AS prod-deps

# Copy workspace configuration
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy package files
COPY apps/web/package.json ./apps/web/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/types/package.json ./packages/types/package.json
COPY packages/config/package.json ./packages/config/package.json

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Production build stage
FROM base AS builder

# Copy workspace configuration
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy package files
COPY apps/web/package.json ./apps/web/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/types/package.json ./packages/types/package.json
COPY packages/config/package.json ./packages/config/package.json

# Install dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Copy all code
COPY apps/web ./apps/web
COPY packages ./packages

# Set working directory
WORKDIR /app/apps/web

# Build the application
RUN pnpm build

# Production stage
FROM base AS production

# Copy production dependencies
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/apps/web/node_modules ./apps/web/node_modules

# Copy built application
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder /app/apps/web/next.config.js ./apps/web/next.config.js

# Copy shared packages (needed for runtime imports)
COPY --from=builder /app/packages ./packages

# Set working directory
WORKDIR /app/apps/web

# Expose Next.js port
EXPOSE 3000

# Set production environment
ENV NODE_ENV=production

# Start Next.js production server
CMD ["pnpm", "start"]
