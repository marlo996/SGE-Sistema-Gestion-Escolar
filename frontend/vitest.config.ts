
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    include: ['app/**/*.test.tsx'],
  },
  esbuild: {
    jsx: 'automatic',
  },
});
