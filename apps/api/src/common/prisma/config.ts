// prisma/config.ts
import { defineConfig } from '@prisma/cli';

export default defineConfig({
  datasource: {
    db: {
      provider: 'postgresql', // Your database provider
      url: process.env.DATABASE_URL, // This will be in your .env file
    },
  },
});
