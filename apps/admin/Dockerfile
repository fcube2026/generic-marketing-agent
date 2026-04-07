FROM node:18-alpine

WORKDIR /app

# Copy only the admin package.json for an isolated install.
# This avoids the monorepo pnpm hoisting conflict where the mobile app
# pins react@18.2.0 but react-dom@18.3.1 also gets hoisted, causing a
# React instance mismatch that breaks Next.js error page pre-rendering.
COPY apps/admin/package.json ./package.json

# Install dependencies in isolation so react and react-dom resolve to
# the same compatible version (^18.3.1 → 18.3.1 for both).
RUN npm install

# Copy source files (node_modules is excluded via root .dockerignore)
COPY apps/admin/ .

# Build the Next.js app
RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]
