#!/bin/sh
set -e

echo "Starting API development server..."

# Build the database package (in case it was modified via volume mount)
echo "Building database package..."
cd /app/packages/database
pnpm build

# Return to API directory
cd /app/apps/api

# Build the API initially to create dist folder
echo "Building API..."
pnpm build

# Start the development server with watch mode
echo "Starting development server with watch mode..."
exec pnpm run start:dev
