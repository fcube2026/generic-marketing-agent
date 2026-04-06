#!/bin/sh
set -e

echo "Pushing database schema..."
cd /app

if [ "$NODE_ENV" = "production" ]; then
  echo "Production mode: running prisma migrate deploy..."
  npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma 2>&1 || {
    echo "Warning: Migration deploy failed. Ensure migrations exist."
    exit 1
  }
else
  echo "Development mode: running prisma db push..."
  npx prisma db push --schema=packages/database/prisma/schema.prisma --skip-generate 2>&1 || {
    echo "Warning: Database push failed. The database may not be ready yet."
    echo "Retrying in 5 seconds..."
    sleep 5
    npx prisma db push --schema=packages/database/prisma/schema.prisma --skip-generate
  }
fi

echo "Database schema is up to date."

cd /app/apps/api
exec "$@"
