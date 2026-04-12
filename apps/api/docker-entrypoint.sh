#!/bin/sh
set -e

echo "Applying database migrations..."
cd /app

# If DIRECT_URL is not set, fall back to DATABASE_URL.
# This prevents Prisma from throwing "Environment variable not found: DIRECT_URL"
# at runtime when the app initialises the PrismaClient.
DIRECT_URL="${DIRECT_URL:-$DATABASE_URL}"
export DIRECT_URL

# Use the locally-installed prisma binary directly instead of npx.
# npx can stall in pnpm-installed Docker containers while trying to
# resolve or download the package, eating up the healthcheck window.
PRISMA_BIN="./node_modules/.bin/prisma"

# The migration 20260412000000_add_doctor_verification may be recorded as
# "failed" in _prisma_migrations if a previous deployment was killed mid-run.
# Mark it as applied so that `migrate deploy` can proceed; the follow-up
# idempotent migration (20260413000000_ensure_doctor_verification_schema)
# will complete any columns/tables that were not actually created yet.
FAILED_MIGRATION="20260412000000_add_doctor_verification"
DATABASE_URL="$DIRECT_URL" timeout 30 "$PRISMA_BIN" migrate resolve --applied "$FAILED_MIGRATION" \
  --schema=packages/database/prisma/schema.prisma 2>/dev/null || true

# Use DIRECT_URL for migrations (pooler connections don't support DDL migrations).
# Timeout after 120s to avoid hanging indefinitely and exhausting the healthcheck window.
# Migration failure is non-fatal: the app will start so the healthcheck can pass.
# Subsequent deployments will retry the migration automatically.
if DATABASE_URL="$DIRECT_URL" timeout 120 "$PRISMA_BIN" migrate deploy --schema=packages/database/prisma/schema.prisma 2>&1; then
  echo "Database migrations applied successfully."
else
  echo "WARNING: Migration deploy failed (non-fatal). The app will start anyway."
  echo "Check that migration files exist and DATABASE_URL/DIRECT_URL are correct."
fi

cd /app/apps/api
exec "$@"
