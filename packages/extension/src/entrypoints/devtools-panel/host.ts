import type { NodeTarget } from '@a11y-checker/core';
import { browser } from 'wxt/browser';
import { inspectExpression } from '../../lib/locate.js';

/**
 * What the panel needs from its environment. Inside DevTools it uses the
 * `devtools.*` APIs. Opened as a normal extension page with `?tabId=<id>` (useful
 * for tests and for a detached window), DevTools-only features are unavailable.
 */
export interface PanelHost {
  tabId: number | null;
  /** Whether "Inspect in Elements panel" is available. */
  canInspect: boolean;
  theme: 'light' | 'dark' | null;
  inspect(target: NodeTarget): Promise<boolean>;
  /** Calls `listener` when the inspected page navigates. */
  onNavigated(listener: () => void): void;
}

interface DevtoolsApi {
  inspectedWindow: {
    tabId: number;
    eval(
      expression: string,
      options: object,
      callback: (result: unknown, exception?: { value?: string }) => void,
    ): void;
  };
  panels: { themeName?: string };
  network: { onNavigated: { addListener(listener: () => void): void } };
}

export function createHost(): PanelHost {
  // The callback-style `chrome.devtools` API works in Chrome and Firefox.
  const devtools = (globalThis as { chrome?: { devtools?: DevtoolsApi } }).chrome?.devtools;

  if (devtools?.inspectedWindow) {
    return {
      tabId: devtools.inspectedWindow.tabId,
      canInspect: true,
      theme: devtools.panels.themeName === 'dark' ? 'dark' : 'light',
      inspect: (target) =>
        new Promise((resolve) => {
          devtools.inspectedWindow.eval(inspectExpression(target), {}, (result, exception) => {
            resolve(!exception && result === true);
          });
        }),
      onNavigated: (listener) => {
        devtools.network.onNavigated.addListener(listener);
      },
    };
  }

  const tabId = Number(new URLSearchParams(location.search).get('tabId'));
  return {
    tabId: Number.isInteger(tabId) && tabId > 0 ? tabId : null,
    canInspect: false,
    theme: null,
    inspect: () => Promise.resolve(false),
    onNavigated: (listener) => {
      browser.tabs.onUpdated.addListener((id, info) => {
        if (id === tabId && info.status === 'loading') listener();
      });
    },
  };
}
