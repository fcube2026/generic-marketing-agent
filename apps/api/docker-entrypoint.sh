#!/bin/sh
set -e

echo "Applying database migrations..."
cd /app

DIRECT_URL="${DIRECT_URL:-$DATABASE_URL}"
export DIRECT_URL

PRISMA_BIN="./node_modules/.bin/prisma"

FAILED_MIGRATIONS="0_init 20260412000000_add_doctor_verification 20260419010000_remove_placed_from_pharmacy_status"

for FAILED_MIGRATION in $FAILED_MIGRATIONS; do
  DATABASE_URL="$DIRECT_URL" timeout 30 "$PRISMA_BIN" migrate resolve --applied "$FAILED_MIGRATION" --schema=packages/database/prisma/schema.prisma 2>/dev/null || true
done

if DATABASE_URL="$DIRECT_URL" timeout 120 "$PRISMA_BIN" migrate deploy --schema=packages/database/prisma/schema.prisma 2>&1; then
  echo "Database migrations applied successfully."
else
  echo "WARNING: Migration deploy failed (non-fatal). The app will start anyway."
fi

cd /app/apps/api
exec "$@"
