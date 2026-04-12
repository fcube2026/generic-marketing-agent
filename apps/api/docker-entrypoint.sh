#!/bin/sh
set -e

echo "Applying database migrations..."
cd /app

# Use DIRECT_URL for migrations if available (pooler connections don't support migrations)
if [ -n "$DIRECT_URL" ]; then
  DATABASE_URL="$DIRECT_URL" npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma 2>&1 || {
    echo "Error: Migration deploy failed."
    echo "Check that migration files exist and DIRECT_URL is correct."
    exit 1
  }
else
  npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma 2>&1 || {
    echo "Error: Migration deploy failed."
    echo "Check that migration files exist and DATABASE_URL is correct."
    exit 1
  }
fi

echo "Database migrations applied successfully."

cd /app/apps/api
exec "$@"
