#!/bin/sh
set -e

echo "Pushing database schema..."
cd /app
npx prisma db push --schema=packages/database/prisma/schema.prisma --skip-generate --accept-data-loss 2>&1 || {
  echo "Warning: Database push failed. The database may not be ready yet."
  echo "Retrying in 5 seconds..."
  sleep 5
  npx prisma db push --schema=packages/database/prisma/schema.prisma --skip-generate --accept-data-loss
}

echo "Database schema is up to date."

cd /app/apps/api
exec "$@"
