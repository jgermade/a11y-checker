import type { CheckConfig, CheckResult } from '@a11y-checker/core';
import sdkSource from '@a11y-checker/sdk/iife?raw';

interface SdkGlobal {
  check(options: object): Promise<unknown>;
  toJSON(result: unknown, options: { pretty: boolean }): string;
}

type AppWindow = Window & { A11yChecker?: SdkGlobal; eval(code: string): unknown };

/** Loads the SDK bundle into a window and its same-origin frames, once per page load. */
function inject(win: AppWindow): void {
  if (!win.A11yChecker) win.eval(`${sdkSource}\n;void 0`);
  for (let i = 0; i < win.frames.length; i++) {
    try {
      inject(win.frames[i] as AppWindow);
    } catch {
      // Cross-origin frame: not reachable from the test.
    }
  }
}

/**
 * Checks the document of the application under test, or one of its elements.
 *
 * Cypress runs specs in a different window from the application. The SDK's browser
 * bundle (axe-core included) is loaded into the application's window, and the check
 * runs there.
 */
export async function checkWindow(
  win: Window,
  config: CheckConfig = {},
  element?: Element,
): Promise<CheckResult> {
  const app = win as AppWindow;
  inject(app);
  const api = app.A11yChecker;
  if (!api) throw new Error('Could not load a11y-checker into the application window.');
  const result = await api.check(element ? { ...config, element } : config);
  // Copy the result into this window's realm, so it is a plain object here.
  return JSON.parse(api.toJSON(result, { pretty: false })) as CheckResult;
}
