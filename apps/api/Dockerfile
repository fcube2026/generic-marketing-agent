FROM node:20-alpine

RUN apk add --no-cache openssl

RUN corepack enable && corepack prepare pnpm@9.4.0 --activate

WORKDIR /app

# Copy workspace configuration for dependency installation
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY scripts/fix-react-instances.js ./scripts/

# Copy ALL workspace package.json files so that the workspace structure
# matches pnpm-lock.yaml.  pnpm install --frozen-lockfile fails when the
# lockfile references workspace packages whose package.json is missing.
COPY apps/api/package.json ./apps/api/
COPY apps/admin/package.json ./apps/admin/
COPY apps/mobile/package.json ./apps/mobile/
COPY apps/marketing-agent/package.json ./apps/marketing-agent/
COPY apps/patient-app/package.json ./apps/patient-app/
COPY apps/provider-app/package.json ./apps/provider-app/
COPY packages/database/package.json ./packages/database/
COPY packages/types/package.json ./packages/types/

# Install all dependencies (cached layer when package.json files don't change)
RUN pnpm install --frozen-lockfile

# Copy source files
COPY packages/database/ ./packages/database/
COPY packages/types/ ./packages/types/
COPY apps/api/ ./apps/api/

# Generate Prisma client and build the API
RUN pnpm --filter @curex24/database db:generate
RUN pnpm --filter @curex24/api build

# Copy entrypoint script (strip Windows CRLF if present, then make executable)
COPY apps/api/docker-entrypoint.sh /docker-entrypoint.sh
RUN sed -i 's/\r$//' /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh

WORKDIR /app/apps/api

EXPOSE 3000

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "dist/main"]
