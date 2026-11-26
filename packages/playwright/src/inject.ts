import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import type { FrameLike } from './types.js';

const require = createRequire(import.meta.url);

/** Browser bundles this package injects, by their global name. */
export const BUNDLES = {
  A11yChecker: '@a11y-checker/sdk/iife',
  A11yCheckerIbm: '@a11y-checker/engine-ibm/iife',
} as const;

export type BundleName = keyof typeof BUNDLES;

const sources = new Map<BundleName, Promise<string>>();

function bundleSource(name: BundleName): Promise<string> {
  let source = sources.get(name);
  if (!source) {
    let path: string;
    try {
      path = require.resolve(BUNDLES[name]);
    } catch {
      throw new Error(
        name === 'A11yCheckerIbm'
          ? 'The IBM engine needs the @a11y-checker/engine-ibm package. Install it next to @a11y-checker/playwright.'
          : `Cannot find ${BUNDLES[name]}.`,
      );
    }
    source = readFile(path, 'utf8');
    sources.set(name, source);
  }
  return source;
}

/**
 * Loads a bundle into a frame unless it is already there. The source is evaluated
 * through Playwright rather than added as a `<script>`, so a page's Content Security
 * Policy cannot block it.
 */
export async function injectBundle(frame: FrameLike, name: BundleName): Promise<void> {
  const loaded = await frame.evaluate(
    (globalName: string) =>
      typeof (globalThis as Record<string, unknown>)[globalName] !== 'undefined',
    name,
  );
  if (loaded) return;
  await frame.evaluate(`${await bundleSource(name)}\n;void 0`);
}
