import { createRequire } from 'node:module';
import { defineConfig } from 'tsdown';

const require = createRequire(import.meta.url);
const { version } = require('accessibility-checker-engine/package.json') as { version: string };
// Reported as the engine version in results.
const define = { __IBM_ENGINE_VERSION__: JSON.stringify(version) };

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    platform: 'neutral',
    dts: true,
    sourcemap: true,
    define,
    // Both builds write to dist/ in parallel; the build script empties it first.
    clean: false,
  },
  {
    // Self-contained bundle (IBM engine included) to inject into pages next to the
    // SDK's bundle. Exposes `window.A11yCheckerIbm`.
    entry: { 'engine-ibm': 'src/iife.ts' },
    format: 'iife',
    globalName: 'A11yCheckerIbm',
    platform: 'browser',
    deps: { alwaysBundle: [/.*/] },
    define,
    minify: true,
    sourcemap: true,
    clean: false,
    dts: false,
  },
]);
