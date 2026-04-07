FROM node:18-alpine

RUN corepack enable && corepack prepare pnpm@9.4.0 --activate

WORKDIR /app

# Copy only the admin package.json for an isolated install.
# This avoids the monorepo pnpm hoisting conflict where the mobile app
# pins react@18.2.0 but react-dom@18.3.1 also gets hoisted, causing a
# React instance mismatch that breaks Next.js error page pre-rendering.
COPY apps/admin/package.json ./package.json

# Install dependencies in isolation (no workspace config) so react and
# react-dom both resolve to the same compatible version (^18.3.1 → 18.3.1).
RUN pnpm install

# Copy source files (node_modules is excluded via root .dockerignore)
COPY apps/admin/ .

# NEXT_PUBLIC_* vars are baked in at build time by Next.js, so they must be
# passed as build args and exported as ENV before running `pnpm build`.
ARG NEXT_PUBLIC_API_URL=http://localhost:3000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build the Next.js app
RUN pnpm build

EXPOSE 3001

CMD ["pnpm", "start"]
