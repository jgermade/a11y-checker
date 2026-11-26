import type { EngineProvider, Issue } from '@a11y-checker/core';
import axeCore from 'axe-core';
import { ENGINE_ID, normalizeResults } from './normalize.js';
import { buildContext, buildRunOptions } from './options.js';

/** The parts of the axe-core API this provider uses. */
export type AxeApi = Pick<typeof axeCore, 'version' | 'run' | 'getRules'>;

export interface AxeEngineOptions {
  /**
   * axe-core instance to use. Default: the bundled `axe-core`.
   *
   * Pass the instance that lives in the target window when checking a document
   * that is not the global one, for example a jsdom window where axe was loaded
   * with `window.eval(axeCore.source)`.
   */
  axe?: AxeApi;
}

// axe-core cannot run twice at the same time in the same window, so calls to
// each axe instance are queued.
const queues = new WeakMap<AxeApi, Promise<unknown>>();

function enqueue<T>(axe: AxeApi, task: () => Promise<T>): Promise<T> {
  const previous = queues.get(axe) ?? Promise.resolve();
  const next = previous.then(task, task);
  queues.set(
    axe,
    next.catch(() => undefined),
  );
  return next;
}

export function createAxeEngine(options: AxeEngineOptions = {}): EngineProvider {
  const axe = options.axe ?? axeCore;
  return {
    id: ENGINE_ID,
    version: axe.version,
    run({ document: doc }, config): Promise<Issue[]> {
      if (!options.axe && doc !== globalThis.document) {
        return Promise.reject(
          new Error(
            'The bundled axe-core can only check the global document. ' +
              'Pass the axe instance of the target window in the `axe` option.',
          ),
        );
      }
      return enqueue(axe, async () => {
        const rules = axe.getRules();
        const actIds = new Map(rules.map((r) => [r.ruleId, r.actIds ?? []]));
        const results = await axe.run(buildContext(config, doc), buildRunOptions(config, rules));
        return normalizeResults(results, actIds);
      });
    },
  };
}
