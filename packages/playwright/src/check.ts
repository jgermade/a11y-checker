import type { CheckConfig, CheckResult } from '@a11y-checker/core';
import { injectBundle } from './inject.js';
import type { FrameLike, LocatorLike, PageLike } from './types.js';

export type EngineName = 'axe' | 'ibm' | 'native';

/** Engines that come as an extra bundle, by the global name of that bundle. */
const EXTRA_BUNDLES = { ibm: 'A11yCheckerIbm', native: 'A11yCheckerNative' } as const;

export interface PlaywrightCheckOptions extends CheckConfig {
  /** Engines to run, in order. Default: `['axe']`. */
  engines?: EngineName[];
}

export interface PlaywrightCheckResult extends CheckResult {
  /** Frames found in the page, and frames the engines could be loaded into. */
  frames: { total: number; checked: number };
}

const isLocator = (target: PageLike | LocatorLike): target is LocatorLike =>
  typeof (target as LocatorLike).page === 'function';

interface InPageArgs {
  config: CheckConfig;
  engines: EngineName[];
}

// Runs in the page and must be self-contained: Playwright sends only its source.
// `frame.evaluate(fn, args)` calls it as `fn(args)`; `locator.evaluate(fn, args)` as
// `fn(element, args)`. Errors are returned as values so their message survives.
async function runInPage(
  first: InPageArgs | Element,
  second?: InPageArgs,
): Promise<{ json: string } | { error: string }> {
  const element = second ? (first as Element) : null;
  const { config, engines } = second ?? (first as InPageArgs);
  const scope = globalThis as unknown as {
    A11yChecker: {
      check(options: object): Promise<unknown>;
      createAxeEngine(): unknown;
      toJSON(result: unknown, options: { pretty: boolean }): string;
    };
    A11yCheckerIbm?: { createIbmEngine(): unknown };
    A11yCheckerNative?: { createNativeEngine(): unknown };
  };
  try {
    const api = scope.A11yChecker;
    const list = engines.map((id) => {
      if (id === 'axe') return api.createAxeEngine();
      if (id === 'ibm' && scope.A11yCheckerIbm) return scope.A11yCheckerIbm.createIbmEngine();
      if (id === 'native' && scope.A11yCheckerNative)
        return scope.A11yCheckerNative.createNativeEngine();
      throw new Error(`Engine ${id} is not available.`);
    });
    const options = element ? { ...config, engines: list, element } : { ...config, engines: list };
    return { json: api.toJSON(await api.check(options), { pretty: false }) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

function setOrigins(origins: string[]): void {
  (
    globalThis as { A11yChecker?: { allowFrameOrigins(o: string[]): void } }
  ).A11yChecker?.allowFrameOrigins(origins);
}

const SAME_ORIGIN = '<same_origin>';

async function forEachFrame(
  frames: FrameLike[],
  action: (frame: FrameLike) => Promise<unknown>,
): Promise<FrameLike[]> {
  const ok: FrameLike[] = [];
  await Promise.all(
    frames.map(async (frame) => {
      try {
        await action(frame);
        ok.push(frame);
      } catch {
        // Detached or inaccessible frame: it is reported as unchecked.
      }
    }),
  );
  return ok;
}

/**
 * Checks a page, or the element a locator points to, for accessibility issues.
 *
 * The engines are loaded into every frame of the page (including cross-origin
 * iframes), and frames are allowed to exchange results with each other only while the
 * check runs.
 *
 * @example
 * const result = await checkA11y(page, { wcag: { level: 'AA' } });
 * const form = await checkA11y(page.getByRole('form'), { engines: ['axe', 'ibm'] });
 */
export async function checkA11y(
  target: PageLike | LocatorLike,
  options: PlaywrightCheckOptions = {},
): Promise<PlaywrightCheckResult> {
  const { engines = ['axe'], ...config } = options;
  if (engines.length === 0) throw new Error('checkA11y: at least one engine is required.');
  const page = isLocator(target) ? target.page() : target;
  const frames = page.frames();
  const main = page.mainFrame();

  const loaded = await forEachFrame(frames, (frame) => injectBundle(frame, 'A11yChecker'));
  for (const engine of engines) {
    if (engine === 'axe') continue;
    const bundle = EXTRA_BUNDLES[engine];
    // These engines walk same-origin frames by themselves, so the top frame is enough
    // for a page. A locator's check runs in the locator's own frame, maybe a child.
    if (isLocator(target)) {
      await forEachFrame(loaded, (frame) => injectBundle(frame, bundle));
    } else {
      await injectBundle(main, bundle);
    }
  }

  const origins = new Set<string>();
  for (const frame of loaded) {
    try {
      const origin = new URL(frame.url()).origin;
      if (origin !== 'null') origins.add(origin);
    } catch {
      // about:blank and similar: same origin as their parent.
    }
  }
  await forEachFrame(loaded, (frame) => frame.evaluate(setOrigins, [SAME_ORIGIN, ...origins]));

  try {
    const args: InPageArgs = { config, engines };
    const outcome = isLocator(target)
      ? await target.evaluate(runInPage, args)
      : await main.evaluate(runInPage, args);
    const value = outcome as { json: string } | { error: string } | undefined;
    if (!value) throw new Error('The check did not return a result.');
    if ('error' in value) throw new Error(value.error);
    return {
      ...(JSON.parse(value.json) as CheckResult),
      frames: { total: frames.length, checked: loaded.length },
    };
  } finally {
    await forEachFrame(loaded, (frame) => frame.evaluate(setOrigins, [SAME_ORIGIN]));
  }
}
