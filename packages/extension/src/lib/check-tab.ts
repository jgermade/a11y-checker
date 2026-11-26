import type { CheckConfig, CheckResult, NodeTarget } from '@a11y-checker/core';
import { browser } from 'wxt/browser';
import { ENGINES, type EngineId } from './engines.js';
import { locateNode } from './locate.js';
import type { FrameCoverage } from './messages.js';

// The functions below are serialized and run inside the page's frames (in the
// extension's isolated world). They must be self-contained.

interface FrameProbe {
  loaded: boolean;
  ibmLoaded: boolean;
  nativeLoaded: boolean;
  origin: string;
  childFrames: number;
}

function probeFrame(): FrameProbe {
  const scope = globalThis as {
    A11yChecker?: unknown;
    A11yCheckerIbm?: unknown;
    A11yCheckerNative?: unknown;
  };
  return {
    loaded: typeof scope.A11yChecker !== 'undefined',
    ibmLoaded: typeof scope.A11yCheckerIbm !== 'undefined',
    nativeLoaded: typeof scope.A11yCheckerNative !== 'undefined',
    origin: location.origin,
    childFrames: document.querySelectorAll('iframe, frame').length,
  };
}

function setAllowedOrigins(origins: string[]): void {
  const api = (globalThis as { A11yChecker?: { allowFrameOrigins(o: string[]): void } })
    .A11yChecker;
  api?.allowFrameOrigins(origins);
}

/**
 * Runs the check in the page. Errors are returned, not thrown: `executeScript` turns
 * an exception in the page into an empty result and loses its message.
 */
async function runInPage(
  configJson: string,
  engineIds: string[],
): Promise<{ json: string } | { error: string }> {
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
    const engines = engineIds.map((id) => {
      if (id === 'axe') return api.createAxeEngine();
      if (id === 'ibm' && scope.A11yCheckerIbm) return scope.A11yCheckerIbm.createIbmEngine();
      if (id === 'native' && scope.A11yCheckerNative) {
        return scope.A11yCheckerNative.createNativeEngine();
      }
      throw new Error(`Engine ${id} is not available.`);
    });
    const config = JSON.parse(configJson) as object;
    return { json: api.toJSON(await api.check({ ...config, engines }), { pretty: false }) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

const SAME_ORIGIN = '<same_origin>';

/**
 * Checks a tab: injects the engine into every frame that does not have it yet, lets
 * the frames of this tab exchange results across origins for the duration of the
 * check, runs the check from the top frame, and restores the same-origin default.
 */
export async function checkTab(
  tabId: number,
  config: CheckConfig,
  engines: readonly EngineId[],
): Promise<{ result: CheckResult; frames: FrameCoverage }> {
  // Remove any highlight first, so it is not part of the check.
  await highlightInTab(tabId, null);

  const probes = await browser.scripting.executeScript({
    target: { tabId, allFrames: true },
    func: probeFrame,
  });
  const frames = probes.flatMap((p) => (p.result ? [{ frameId: p.frameId, ...p.result }] : []));

  // The SDK (with axe-core) goes into every frame: axe-core needs an instance in each
  // frame to check it. The IBM and native engines walk same-origin frames by
  // themselves, so they only go into the top frame.
  const [sdk, ibm, native] = ENGINES;
  const missing = frames.filter((f) => !f.loaded).map((f) => f.frameId);
  if (missing.length > 0) {
    await browser.scripting.executeScript({
      target: { tabId, frameIds: missing },
      files: [sdk.script],
    });
  }
  const top = frames.find((f) => f.frameId === 0);
  if (engines.includes('ibm') && !top?.ibmLoaded) {
    await browser.scripting.executeScript({
      target: { tabId, frameIds: [0] },
      files: [ibm.script],
    });
  }
  if (engines.includes('native') && !top?.nativeLoaded) {
    await browser.scripting.executeScript({
      target: { tabId, frameIds: [0] },
      files: [native.script],
    });
  }

  // Only origins that are actually in this tab; opaque origins cannot be targeted.
  const origins = [...new Set(frames.map((f) => f.origin))].filter((o) => o !== 'null');
  await browser.scripting.executeScript({
    target: { tabId, allFrames: true },
    func: setAllowedOrigins,
    args: [[SAME_ORIGIN, ...origins]],
  });

  try {
    const [topResult] = await browser.scripting.executeScript({
      target: { tabId, frameIds: [0] },
      func: runInPage,
      args: [JSON.stringify(config), [...engines]],
    });
    const outcome = topResult?.result;
    if (!outcome) throw new Error('The check did not return a result.');
    if ('error' in outcome) throw new Error(outcome.error);
    return {
      result: JSON.parse(outcome.json) as CheckResult,
      frames: {
        total: 1 + frames.reduce((sum, f) => sum + f.childFrames, 0),
        // Frames with an opaque origin (e.g. sandboxed) get the engine injected, but
        // axe-core cannot address them, so they are skipped.
        checked: frames.filter((f) => f.frameId === 0 || f.origin !== 'null').length,
      },
    };
  } finally {
    // Results include HTML from each frame: do not leave cross-origin access open.
    await browser.scripting
      .executeScript({
        target: { tabId, allFrames: true },
        func: setAllowedOrigins,
        args: [[SAME_ORIGIN]],
      })
      .catch(() => undefined);
  }
}

/** Highlights a node in the tab's top frame, or removes the highlight (`null`). */
export async function highlightInTab(tabId: number, target: NodeTarget | null): Promise<boolean> {
  const [top] = await browser.scripting.executeScript({
    target: { tabId, frameIds: [0] },
    func: locateNode,
    args: [target, 'highlight'],
  });
  return top?.result === true;
}
