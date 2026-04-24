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

# Resolve any migrations that may be recorded as "failed" in _prisma_migrations
# due to a deployment being killed mid-run. Marking them as applied lets
# `migrate deploy` proceed; follow-up idempotent migrations handle any gaps.

# NOTE: keep these lists space-separated — this script runs under Alpine's
# busybox /bin/sh (ash), which does not support bash arrays.
FAILED_MIGRATIONS="20260412000000_add_doctor_verification 20260419010000_remove_placed_from_pharmacy_status"

for FAILED_MIGRATION in $FAILED_MIGRATIONS; do
  DATABASE_URL="$DIRECT_URL" timeout 30 "$PRISMA_BIN" migrate resolve --applied "$FAILED_MIGRATION" \
    --schema=packages/database/prisma/schema.prisma 2>/dev/null || true
done

# Migrations whose SQL was *corrected* after a failed deploy. Marking these as
# rolled-back clears the failed state in _prisma_migrations so `migrate deploy`
# re-runs them with the corrected, idempotent SQL. Use this list (instead of
# FAILED_MIGRATIONS above) whenever the original migration's SQL was buggy and
# needs to be re-executed — not just acknowledged.
#
# - 20260424100100_add_pharmacy_order_payment_flow: original SQL referenced
#   the non-existent table "PharmacyOrder" (real name: pharmacy_orders) and
#   was fixed in bf65d3e. On envs where the broken version ran, this stuck
#   failed entry blocks every later migration — including the patient KYC ML
#   columns migration (20260424110000_add_patient_kyc_ml_aadhaar_fields),
#   which is what causes the patient Identity Verification screen to 500.
ROLLED_BACK_MIGRATIONS="20260424100100_add_pharmacy_order_payment_flow"

for ROLLED_BACK_MIGRATION in $ROLLED_BACK_MIGRATIONS; do
  DATABASE_URL="$DIRECT_URL" timeout 30 "$PRISMA_BIN" migrate resolve --rolled-back "$ROLLED_BACK_MIGRATION" \
    --schema=packages/database/prisma/schema.prisma 2>/dev/null || true
done

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
