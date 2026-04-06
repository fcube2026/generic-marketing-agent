FROM node:18-alpine

RUN corepack enable && corepack prepare pnpm@9.4.0 --activate

WORKDIR /app

# Copy workspace configuration for dependency installation
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/admin/package.json ./apps/admin/
COPY packages/database/package.json ./packages/database/
COPY packages/types/package.json ./packages/types/

# Install all dependencies (cached layer when package.json files don't change)
RUN pnpm install --frozen-lockfile

# Copy source files
COPY packages/database/ ./packages/database/
COPY packages/types/ ./packages/types/
COPY apps/admin/ ./apps/admin/

# Build the admin panel
RUN pnpm --filter @curex24/admin build

WORKDIR /app/apps/admin

EXPOSE 3001

CMD ["pnpm", "start"]
