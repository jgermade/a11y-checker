import { createRequire } from 'node:module';
import { defineConfig } from 'wxt';

const require = createRequire(import.meta.url);
const ENGINE_SCRIPT = 'a11y-checker.iife.js';

export default defineConfig({
  srcDir: 'src',
  // Explicit imports keep the code readable and type-checked lint working.
  imports: false,
  outDir: '.output',
  // Manifest V3 for Chrome and Firefox alike.
  manifestVersion: 3,
  manifest: ({ browser }) => ({
    name: 'a11y-checker',
    description: 'Check web pages for WCAG accessibility issues from a DevTools panel.',
    permissions: ['scripting', 'storage'],
    // The check injects the engine into every frame of the inspected tab, including
    // cross-origin iframes, so it needs access to all sites.
    host_permissions: ['<all_urls>'],
    ...(browser === 'firefox'
      ? {
          browser_specific_settings: {
            gecko: {
              id: 'extension@a11y-checker.dev',
              strict_min_version: '140.0',
              // Everything runs locally; nothing is sent anywhere.
              data_collection_permissions: { required: ['none'] },
            },
          },
        }
      : {}),
  }),
  zip: {
    artifactTemplate: 'a11y-checker-{{version}}-{{browser}}.zip',
    sourcesTemplate: 'a11y-checker-{{version}}-sources.zip',
    // Firefox Add-ons reviewers rebuild the extension from sources, and it depends on
    // other workspace packages, so the sources archive is the whole monorepo.
    sourcesRoot: '../..',
    excludeSources: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.output/**',
      '**/.wxt/**',
      '.git/**',
      '.vitest/**',
      'RECORD/**',
      'ROADMAP/**',
    ],
  },
  hooks: {
    'prepare:publicPaths': (_wxt, paths) => {
      paths.push(ENGINE_SCRIPT);
    },
    // Ship the SDK's self-contained bundle (axe-core included); it is injected into pages.
    'build:publicAssets': (_wxt, files) => {
      files.push({
        absoluteSrc: require.resolve('@a11y-checker/sdk/iife'),
        relativeDest: ENGINE_SCRIPT,
      });
    },
  },
});
