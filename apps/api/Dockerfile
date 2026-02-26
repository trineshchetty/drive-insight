# API Dockerfile (NestJS 11 with TypeScript strict mode)
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
COPY apps/api/package.json ./apps/api/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/types/package.json ./packages/types/package.json
COPY packages/config/package.json ./packages/config/package.json

# Install all dependencies (including devDependencies for dev mode)
RUN pnpm install --frozen-lockfile

# Copy all workspace code
COPY apps/api ./apps/api
COPY packages ./packages

# Set working directory to API app
WORKDIR /app/apps/api

# Expose NestJS port (internal container port is 3000)
EXPOSE 3000

# Start NestJS development server with watch mode
CMD ["pnpm", "run", "start:dev"]

# Production dependencies stage
FROM base AS prod-deps

# Copy workspace configuration
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy package files
COPY apps/api/package.json ./apps/api/package.json
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
COPY apps/api/package.json ./apps/api/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/types/package.json ./packages/types/package.json
COPY packages/config/package.json ./packages/config/package.json

# Install dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Copy all code
COPY apps/api ./apps/api
COPY packages ./packages

# Set working directory
WORKDIR /app/apps/api

# Build the application
RUN pnpm build

# Production stage
FROM base AS production

# Copy production dependencies
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/apps/api/node_modules ./apps/api/node_modules

# Copy built application
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json

# Copy shared packages (needed for runtime imports)
COPY --from=builder /app/packages ./packages

# Set working directory
WORKDIR /app/apps/api

# Expose NestJS port
EXPOSE 3000

# Set production environment
ENV NODE_ENV=production

# Start NestJS production server
CMD ["pnpm", "run", "start:prod"]
