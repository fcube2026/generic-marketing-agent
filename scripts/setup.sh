#!/usr/bin/env bash
set -euo pipefail

# Enable corepack for pnpm
corepack enable
corepack prepare pnpm@9.4.0 --activate

# Install all dependencies
pnpm install
