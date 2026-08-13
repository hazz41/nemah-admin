import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Mirrors the `@/*` -> `./src/*` mapping in tsconfig.json so service modules
// resolve the same way under test as they do under Next.js.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
    // The current-month lookup is derived with local-clock getters, so the
    // suite pins a timezone to keep month-boundary assertions deterministic.
    // Asia/Amman (UTC+3) is the product's market.
    env: { TZ: 'Asia/Amman' },
  },
});
