import type { CheckResult, NodeTarget } from '@a11y-checker/core';
import { useEffect, useState } from 'preact/hooks';
import { browser } from 'wxt/browser';
import { buildReport, type ReportFormat } from '../../lib/export.js';
import type {
  CheckResponse,
  FrameCoverage,
  HighlightResponse,
  Request,
} from '../../lib/messages.js';
import {
  DEFAULT_SETTINGS,
  sanitizeSettings,
  toCheckConfig,
  type Settings,
} from '../../lib/settings.js';
import { Results } from './components/Results.js';
import { Toolbar } from './components/Toolbar.js';
import type { PanelHost } from './host.js';

type State =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'done'; result: CheckResult; frames: FrameCoverage; stale: boolean }
  | { status: 'error'; error: string };

const SETTINGS_KEY = 'settings';

const send = <T,>(request: Request) => browser.runtime.sendMessage<Request, T>(request);

const formatDuration = (ms: number) =>
  ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`;

function statusMessage(state: State): string {
  switch (state.status) {
    case 'idle':
      return 'Run a check to find accessibility issues on this page.';
    case 'running':
      return 'Checking the page…';
    case 'error':
      return `The check failed: ${state.error}`;
    case 'done': {
      const { violation, incomplete } = state.result.summary.outcomes;
      const parts = [`${violation} ${violation === 1 ? 'violation' : 'violations'}`];
      if (state.result.config.outcomes.includes('incomplete')) {
        parts.push(`${incomplete} to review`);
      }
      return `Check complete: ${parts.join(', ')} (${formatDuration(state.result.duration)}).`;
    }
  }
}

export function App({ host }: { host: PanelHost }) {
  const [settings, setSettings] = useState<Settings>({ ...DEFAULT_SETTINGS });
  const [state, setState] = useState<State>({ status: 'idle' });

  useEffect(() => {
    browser.storage.local
      .get(SETTINGS_KEY)
      .then((stored) => {
        setSettings(sanitizeSettings(stored[SETTINGS_KEY]));
      })
      .catch(() => undefined);
    host.onNavigated(() => {
      setState((current) => (current.status === 'done' ? { ...current, stale: true } : current));
    });
  }, [host]);

  const updateSettings = (next: Settings) => {
    setSettings(next);
    void browser.storage.local.set({ [SETTINGS_KEY]: next }).catch(() => undefined);
  };

  const run = async () => {
    if (host.tabId === null) return;
    setState({ status: 'running' });
    try {
      const response = await send<CheckResponse>({
        type: 'check',
        tabId: host.tabId,
        config: toCheckConfig(settings),
      });
      setState(
        response.ok
          ? { status: 'done', result: response.result, frames: response.frames, stale: false }
          : { status: 'error', error: response.error },
      );
    } catch (error) {
      setState({ status: 'error', error: error instanceof Error ? error.message : String(error) });
    }
  };

  const highlight = async (target: NodeTarget) => {
    if (host.tabId === null) return false;
    const response = await send<HighlightResponse>({
      type: 'highlight',
      tabId: host.tabId,
      target,
    });
    return response.ok && response.found;
  };

  const download = (format: ReportFormat) => {
    if (state.status !== 'done') return;
    const file = buildReport(state.result, format);
    const url = URL.createObjectURL(new Blob([file.content], { type: file.mimeType }));
    const link = document.createElement('a');
    link.href = url;
    link.download = file.filename;
    link.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  };

  if (host.tabId === null) {
    return (
      <main class="empty">
        <h1>a11y-checker</h1>
        <p>Open this panel from the browser's DevTools to check a page.</p>
      </main>
    );
  }

  const done = state.status === 'done' ? state : null;
  const unchecked = done ? done.frames.total - done.frames.checked : 0;

  return (
    <>
      <header>
        <h1 class="visually-hidden">a11y-checker</h1>
        <Toolbar
          settings={settings}
          onSettingsChange={updateSettings}
          running={state.status === 'running'}
          onRun={() => void run()}
          canExport={done !== null}
          onExport={download}
        />
      </header>
      <main>
        <p role="status" class={`status status-${state.status}`}>
          {statusMessage(state)}
        </p>
        {done?.stale && (
          <p class="notice">The page has changed since this check. Run it again to update.</p>
        )}
        {unchecked > 0 && (
          <p class="notice">
            {unchecked} {unchecked === 1 ? 'frame' : 'frames'} could not be checked (for example,
            sandboxed frames or pages the extension cannot access).
          </p>
        )}
        {done && done.result.errors.length > 0 && (
          <ul class="notice">
            {done.result.errors.map((error) => (
              <li key={error.engine}>
                Engine {error.engine} failed: {error.message}
              </li>
            ))}
          </ul>
        )}
        {done && (
          <Results
            result={done.result}
            groupBy={settings.groupBy}
            canInspect={host.canInspect}
            onHighlight={highlight}
            onInspect={(target) => host.inspect(target)}
          />
        )}
      </main>
    </>
  );
}
