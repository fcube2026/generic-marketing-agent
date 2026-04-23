#!/usr/bin/env bash
set -euo pipefail

# Enable corepack for pnpm
corepack enable
corepack prepare pnpm@9.4.0 --activate

# Install all dependencies
pnpm install

# Generate Prisma client so TypeScript can resolve all model types.
# A placeholder DATABASE_URL is sufficient here — prisma generate only
# reads the schema file and does not connect to the database.
DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" pnpm --filter @curex24/database db:generate
