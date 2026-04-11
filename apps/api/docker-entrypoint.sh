#!/bin/sh
set -e

echo "Applying database migrations..."
cd /app

npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma 2>&1 || {
  echo "Error: Migration deploy failed."
  echo "Check that migration files exist and DATABASE_URL is correct."
  exit 1
}

echo "Database migrations applied successfully."

cd /app/apps/api
exec "$@"
