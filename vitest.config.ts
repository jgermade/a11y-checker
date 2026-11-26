import { playwright } from '@vitest/browser-playwright';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Test against package sources, so a build is not needed first.
    alias: [
      {
        find: /^@a11y-checker\/([^/]+)$/,
        replacement: fileURLToPath(new URL('./packages/$1/src/index.ts', import.meta.url)),
      },
    ],
  },
  test: {
    projects: [
      {
        // Fast DOM tests without layout (happy-dom).
        test: {
          name: 'unit',
          environment: 'happy-dom',
          include: ['packages/*/test/**/*.test.ts'],
          exclude: ['packages/*/test/**/*.browser.test.ts'],
        },
      },
      {
        // Real-browser tests for anything that needs layout or rendering
        // (contrast, visibility, target size).
        test: {
          name: 'browser',
          include: ['packages/*/test/**/*.browser.test.ts'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
