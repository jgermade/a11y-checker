import { defineConfig } from 'tsdown';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    platform: 'neutral',
    dts: true,
    sourcemap: true,
    // Both builds write to dist/ in parallel; the build script empties it first.
    clean: false,
  },
  {
    // Self-contained bundle (rules included) to inject into pages next to the
    // SDK's bundle. Exposes `window.A11yCheckerNative`.
    entry: { 'engine-native': 'src/iife.ts' },
    format: 'iife',
    globalName: 'A11yCheckerNative',
    platform: 'browser',
    deps: { alwaysBundle: [/.*/] },
    minify: true,
    sourcemap: true,
    clean: false,
    dts: false,
  },
]);
