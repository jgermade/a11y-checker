import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts'],
  format: ['esm'],
  platform: 'node',
  fixedExtension: false,
  dts: true,
  sourcemap: true,
  clean: true,
});
