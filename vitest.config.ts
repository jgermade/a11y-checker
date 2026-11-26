import { playwright } from '@vitest/browser-playwright';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const E2E = 'packages/*/test/**/*.e2e.test.ts';
const BROWSER = 'packages/*/test/**/*.browser.test.ts';

const require = createRequire(import.meta.url);
const ibmEngine =
  require('./packages/engine-ibm/node_modules/accessibility-checker-engine/package.json') as {
    version: string;
  };

export default defineConfig({
  define: { __IBM_ENGINE_VERSION__: JSON.stringify(ibmEngine.version) },
  resolve: {
    // Test against package sources, so a build is not needed first.
    alias: [
      {
        find: /^@a11y-checker\/sdk\/reporters$/,
        replacement: fileURLToPath(
          new URL('./packages/sdk/src/reporters/index.ts', import.meta.url),
        ),
      },
      {
        find: /^@a11y-checker\/matchers\/(vitest|jest)$/,
        replacement: fileURLToPath(new URL('./packages/matchers/src/$1.ts', import.meta.url)),
      },
      {
        find: /^@a11y-checker\/([^/]+)$/,
        replacement: fileURLToPath(new URL('./packages/$1/src/index.ts', import.meta.url)),
      },
    ],
  },
  oxc: { jsx: { runtime: 'automatic', importSource: 'preact' } },
  test: {
    projects: [
      {
        extends: true,
        // Fast DOM tests without layout (happy-dom).
        test: {
          name: 'unit',
          environment: 'happy-dom',
          include: ['packages/*/test/**/*.test.ts'],
          exclude: [E2E, BROWSER],
        },
      },
      {
        extends: true,
        // Real-browser tests for anything that needs layout or rendering
        // (contrast, visibility, target size).
        test: {
          name: 'browser',
          include: [BROWSER],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
      {
        extends: true,
        // Tests of built artifacts (IIFE bundle, browser extension) driven by Playwright.
        test: {
          name: 'e2e',
          environment: 'node',
          include: [E2E],
          globalSetup: ['./vitest.global-setup.ts'],
          fileParallelism: false,
          testTimeout: 60_000,
          hookTimeout: 120_000,
        },
      },
    ],
  },
});
