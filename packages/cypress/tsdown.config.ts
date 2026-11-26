import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { defineConfig } from 'tsdown';

const require = createRequire(import.meta.url);
const RAW = '\0raw:';

export default defineConfig({
  entry: ['src/index.ts', 'src/support.ts'],
  format: ['esm', 'cjs'],
  // Bundled by Cypress for the browser; `neutral` keeps imports untouched.
  platform: 'neutral',
  dts: true,
  sourcemap: true,
  clean: true,
  // Dependencies stay external, except the inlined `?raw` files.
  deps: { alwaysBundle: [/\?raw$/] },
  plugins: [
    {
      // `import source from 'pkg/file?raw'` inlines the file as a string. The SDK's
      // browser bundle travels as text, so Cypress' bundler cannot rewrite it before
      // it is evaluated in the application window.
      name: 'raw-import',
      resolveId(source) {
        return source.endsWith('?raw') ? RAW + require.resolve(source.slice(0, -4)) : null;
      },
      load(id) {
        return id.startsWith(RAW)
          ? `export default ${JSON.stringify(readFileSync(id.slice(RAW.length), 'utf8'))};`
          : null;
      },
    },
  ],
});
