import type { CheckConfig, CheckResult, NodeTarget } from '@a11y-checker/core';
import { browser } from 'wxt/browser';
import { locateNode } from './locate.js';
import type { FrameCoverage } from './messages.js';

/** Path of the SDK's IIFE bundle inside the extension. */
export const ENGINE_SCRIPT = '/a11y-checker.iife.js';

// The functions below are serialized and run inside the page's frames (in the
// extension's isolated world). They must be self-contained.

interface FrameProbe {
  loaded: boolean;
  origin: string;
  childFrames: number;
}

function probeFrame(): FrameProbe {
  return {
    loaded: typeof (globalThis as { A11yChecker?: unknown }).A11yChecker !== 'undefined',
    origin: location.origin,
    childFrames: document.querySelectorAll('iframe, frame').length,
  };
}

function setAllowedOrigins(origins: string[]): void {
  const api = (globalThis as { A11yChecker?: { allowFrameOrigins(o: string[]): void } })
    .A11yChecker;
  api?.allowFrameOrigins(origins);
}

async function runInPage(configJson: string): Promise<string> {
  const api = (
    globalThis as unknown as {
      A11yChecker: {
        check(config: unknown): Promise<unknown>;
        toJSON(result: unknown, options: { pretty: boolean }): string;
      };
    }
  ).A11yChecker;
  return api.toJSON(await api.check(JSON.parse(configJson)), { pretty: false });
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
): Promise<{ result: CheckResult; frames: FrameCoverage }> {
  // Remove any highlight first, so it is not part of the check.
  await highlightInTab(tabId, null);

  const probes = await browser.scripting.executeScript({
    target: { tabId, allFrames: true },
    func: probeFrame,
  });
  const frames = probes.flatMap((p) => (p.result ? [{ frameId: p.frameId, ...p.result }] : []));

  const missing = frames.filter((f) => !f.loaded).map((f) => f.frameId);
  if (missing.length > 0) {
    await browser.scripting.executeScript({
      target: { tabId, frameIds: missing },
      files: [ENGINE_SCRIPT],
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
    const [top] = await browser.scripting.executeScript({
      target: { tabId, frameIds: [0] },
      func: runInPage,
      args: [JSON.stringify(config)],
    });
    if (typeof top?.result !== 'string') throw new Error('The check did not return a result.');
    return {
      result: JSON.parse(top.result) as CheckResult,
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
