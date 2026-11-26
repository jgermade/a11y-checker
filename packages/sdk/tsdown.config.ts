import { defineConfig } from 'tsdown';

export default defineConfig([
  {
    // Library build: dependencies stay external.
    entry: { index: 'src/index.ts', reporters: 'src/reporters/index.ts' },
    format: ['esm', 'cjs'],
    platform: 'neutral',
    dts: true,
    sourcemap: true,
    // Both builds write to dist/ in parallel; the build script empties it first.
    clean: false,
  },
  {
    // Self-contained bundle (axe-core included) to inject into pages, e.g. from a
    // browser extension or `page.addScriptTag()`. Exposes `window.A11yChecker`.
    entry: { 'a11y-checker': 'src/iife.ts' },
    format: 'iife',
    globalName: 'A11yChecker',
    platform: 'browser',
    deps: { alwaysBundle: [/.*/] },
    minify: true,
    sourcemap: true,
    clean: false,
    dts: false,
  },
]);
