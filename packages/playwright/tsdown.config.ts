import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  platform: 'node',
  dts: true,
  sourcemap: true,
  clean: true,
  // `import.meta.url` in the CommonJS build.
  shims: true,
  // Same file names as the other packages (`.js` for ESM, `.cjs` for CommonJS).
  fixedExtension: false,
});
