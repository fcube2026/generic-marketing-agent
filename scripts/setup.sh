#!/usr/bin/env bash
set -euo pipefail

# Enable corepack for pnpm
corepack enable
corepack prepare pnpm@9.4.0 --activate

# Install all dependencies
pnpm install

# Generate Prisma client so TypeScript can resolve all model types
DATABASE_URL="postgresql://user:pass@localhost:5432/dummy" pnpm --filter @curex24/database db:generate
