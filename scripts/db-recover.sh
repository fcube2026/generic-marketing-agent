#!/bin/sh
# ──────────────────────────────────────────────────────────────
# Database Recovery Script
# ──────────────────────────────────────────────────────────────
#
# This script recovers a Supabase/PostgreSQL database to the correct
# schema state. It is designed for cases where tables have been
# accidentally dropped or the schema is out of sync.
#
# Usage:
#   DATABASE_URL="postgresql://..." DIRECT_URL="postgresql://..." ./scripts/db-recover.sh [--seed]
#
# Options:
#   --seed   Also run the seed script after schema recovery
#
# Prerequisites:
#   - DATABASE_URL and DIRECT_URL environment variables must be set
#   - pnpm and Node.js must be available
#   - Run from the repository root
#
# ⚠️  SAFETY: This script uses `prisma migrate deploy` which only
#     applies pending migrations. It does NOT drop or reset any
#     existing tables/data.
# ──────────────────────────────────────────────────────────────
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "╔══════════════════════════════════════════════╗"
echo "║     curex24 Database Recovery Script         ║"
echo "╚══════════════════════════════════════════════╝"

# ── Validate environment ────────────────────────────────────
if [ -z "$DATABASE_URL" ]; then
  echo "${RED}Error: DATABASE_URL environment variable is not set.${NC}"
  echo "Set it to your PostgreSQL connection string."
  exit 1
fi

if [ -z "$DIRECT_URL" ]; then
  echo "${YELLOW}Warning: DIRECT_URL not set. Using DATABASE_URL as fallback.${NC}"
  export DIRECT_URL="$DATABASE_URL"
fi

# ── Safety confirmation ─────────────────────────────────────
echo ""
echo "${YELLOW}This will apply Prisma migrations to the database at:${NC}"
echo "  ${DATABASE_URL}" | sed 's/:[^:@]*@/:***@/g'
echo ""
printf "Continue? [y/N] "
read -r confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
  echo "Aborted."
  exit 0
fi

# ── Step 1: Generate Prisma client ──────────────────────────
echo ""
echo "Step 1/3: Generating Prisma client..."
pnpm --filter @curex24/database db:generate
echo "${GREEN}✅ Prisma client generated${NC}"

# ── Step 2: Apply migrations ───────────────────────────────
echo ""
echo "Step 2/3: Applying database migrations..."
pnpm --filter @curex24/database db:migrate:deploy
echo "${GREEN}✅ Migrations applied successfully${NC}"

# ── Step 3: Optionally seed ─────────────────────────────────
if [ "$1" = "--seed" ]; then
  echo ""
  echo "Step 3/3: Seeding database..."
  pnpm --filter @curex24/database db:seed
  echo "${GREEN}✅ Database seeded${NC}"
else
  echo ""
  echo "Step 3/3: Skipping seed (pass --seed to populate demo data)"
fi

echo ""
echo "${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo "${GREEN}║     Database recovery complete!              ║${NC}"
echo "${GREEN}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo "Next steps:"
echo "  1. Verify tables exist in Supabase Dashboard → Schema Visualizer"
echo "  2. Run the seed script if you need demo data:"
echo "     pnpm --filter @curex24/database db:seed"
echo "  3. For staging, also run:"
echo "     pnpm --filter @curex24/database db:seed:staging"
