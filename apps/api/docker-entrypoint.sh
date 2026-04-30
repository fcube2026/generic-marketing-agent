#!/bin/sh
set -e

echo "Applying database migrations..."
cd /app

DIRECT_URL="${DIRECT_URL:-$DATABASE_URL}"
export DIRECT_URL

PRISMA_BIN="./node_modules/.bin/prisma"

# NOTE: keep these lists space-separated — this script runs under Alpine's
# busybox /bin/sh (ash), which does not support bash arrays.
FAILED_MIGRATIONS="20260412000000_add_doctor_verification 20260419010000_remove_placed_from_pharmacy_status"

# NOTE: keep these lists space-separated — this script runs under Alpine's
# busybox /bin/sh (ash), which does not support bash arrays.
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
# - 20260430000000_add_provider_kyc_face_storage: original SQL used bare
#   ADD COLUMN without IF NOT EXISTS. On envs where the column already existed
#   (e.g. from a manual apply or partial run), this left the migration in a
#   failed state, blocking all later migrations and causing a 500 on the
#   doctor face-verification step. Fixed to ADD COLUMN IF NOT EXISTS.
ROLLED_BACK_MIGRATIONS="20260424100100_add_pharmacy_order_payment_flow 20260430000000_add_provider_kyc_face_storage"

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
fi

cd /app/apps/api
exec "$@"
