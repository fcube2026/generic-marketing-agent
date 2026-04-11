# Database Recovery Guide

## What Happened

The Supabase database connected to the production environment lost its tables. Only `_prisma_migrations` and `QuestionnaireResponse` tables remain, while the full application schema (25 tables) is missing.

### Root Cause

The database schema was being managed with `prisma db push` (in `docker-entrypoint.sh`) for non-production environments instead of proper migrations. `prisma db push` is **destructive** — when it encounters breaking changes, it can drop and recreate tables without warning. Additionally, no migration files existed in the repository, making `prisma migrate deploy` (used in CI) a no-op.

The `QuestionnaireResponse` table (which was in the database but not in the Prisma schema) suggests a separate or modified schema was pushed to the database, causing all existing tables to be replaced.

### Fixes Applied

1. **Created baseline migration** (`0_init`) — Contains SQL to create all 25 tables, enums, indexes, and foreign keys
2. **Added `QuestionnaireResponse` model** to `schema.prisma` — This model was in the DB but missing from the schema
3. **Fixed `docker-entrypoint.sh`** — Now uses `prisma migrate deploy` for all environments (never `db push`)
4. **Added `db:reset` safety warning** — The reset script now prints a warning before dropping tables
5. **Created recovery script** (`scripts/db-recover.sh`) — For easy schema recovery

---

## Recovery Steps

### Option A: Using the recovery script

```bash
# Set your Supabase connection strings
export DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"
export DIRECT_URL="$DATABASE_URL"  # Use direct URL if using connection pooling

# Run recovery (creates tables only, no data)
./scripts/db-recover.sh

# Run recovery with seed data
./scripts/db-recover.sh --seed
```

### Option B: Manual recovery

```bash
# 1. Generate Prisma client
DATABASE_URL="..." DIRECT_URL="..." pnpm --filter @curex24/database db:generate

# 2. Mark existing migration as applied (if _prisma_migrations table already exists)
cd packages/database
DATABASE_URL="..." npx prisma migrate resolve --applied 0_init

# 3. Or apply the migration fresh
DATABASE_URL="..." npx prisma migrate deploy

# 4. Seed data (optional)
DATABASE_URL="..." DIRECT_URL="..." pnpm --filter @curex24/database db:seed
```

### Option C: If `QuestionnaireResponse` table needs to be preserved

If there is existing questionnaire data you want to keep:

```bash
# 1. Back up QuestionnaireResponse data via Supabase SQL editor:
#    SELECT * FROM "QuestionnaireResponse";
#    (Save the results)

# 2. Mark the baseline migration as applied:
cd packages/database
DATABASE_URL="..." npx prisma migrate resolve --applied 0_init

# 3. The migration creates `questionnaire_responses` (lowercase, with underscores).
#    If needed, migrate data from old table:
#    INSERT INTO questionnaire_responses SELECT * FROM "QuestionnaireResponse";
#    DROP TABLE "QuestionnaireResponse";
```

---

## Staging Environment Setup

For the staging environment, after recovery:

```bash
# 1. Apply migrations
DATABASE_URL="$STAGING_DATABASE_URL" DIRECT_URL="$STAGING_DIRECT_URL" \
  pnpm --filter @curex24/database db:generate

cd packages/database
DATABASE_URL="$STAGING_DIRECT_URL" npx prisma migrate deploy

# 2. Seed staging data
DATABASE_URL="$STAGING_DATABASE_URL" DIRECT_URL="$STAGING_DIRECT_URL" \
  pnpm --filter @curex24/database db:seed:staging
```

---

## Prevention

1. **Never use `prisma db push` on staging or production** — It can destructively alter tables
2. **Always use `prisma migrate deploy`** — This only applies pending migration files
3. **The `db:reset` script is for local dev only** — It drops all tables
4. **Keep migration files in version control** — They are the source of truth for schema changes
5. **Use separate Supabase projects** for production and staging — Never share the same database
