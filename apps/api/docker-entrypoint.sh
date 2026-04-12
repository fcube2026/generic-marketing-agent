#!/bin/sh
set -e

echo "Applying database migrations..."
cd /app

# If DIRECT_URL is not set, fall back to DATABASE_URL.
# This prevents Prisma from throwing "Environment variable not found: DIRECT_URL"
# at runtime when the app initialises the PrismaClient.
DIRECT_URL="${DIRECT_URL:-$DATABASE_URL}"
export DIRECT_URL

# The migration 20260412000000_add_doctor_verification may be recorded as
# "failed" in _prisma_migrations if a previous deployment was killed mid-run.
# Mark it as applied so that `migrate deploy` can proceed; the follow-up
# idempotent migration (20260413000000_ensure_doctor_verification_schema)
# will complete any columns/tables that were not actually created yet.
FAILED_MIGRATION="20260412000000_add_doctor_verification"
DATABASE_URL="$DIRECT_URL" npx prisma migrate resolve --applied "$FAILED_MIGRATION" \
  --schema=packages/database/prisma/schema.prisma 2>/dev/null || true

# Use DIRECT_URL for migrations (pooler connections don't support DDL migrations)
DATABASE_URL="$DIRECT_URL" npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma 2>&1 || {
  echo "Error: Migration deploy failed."
  echo "Check that migration files exist and DATABASE_URL/DIRECT_URL are correct."
  exit 1
}

echo "Database migrations applied successfully."

cd /app/apps/api
exec "$@"
