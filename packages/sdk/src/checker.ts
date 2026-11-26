import {
  resolveConfig,
  runCheck,
  type CheckConfig,
  type CheckResult,
  type EngineInfo,
  type EngineProvider,
  type RunOptions,
} from '@a11y-checker/core';
import { createAxeEngine } from '@a11y-checker/engine-axe';

export interface CheckOptions extends CheckConfig {
  /** Engines to run. Default: axe-core. */
  engines?: EngineProvider[];
  /** Document to check. Default: the global `document`. */
  document?: Document;
}

export interface Checker {
  /** Engines this checker runs. */
  readonly engines: readonly EngineInfo[];
  /** Runs a check. `overrides` are merged over the checker's config. */
  check(overrides?: CheckConfig): Promise<CheckResult>;
}

/**
 * Merges two configs. Nested `wcag` and `rules` objects are merged key by key;
 * every other option in `override` replaces the base value.
 */
export function mergeConfig(base: CheckConfig, override: CheckConfig): CheckConfig {
  const merged: CheckConfig = { ...base, ...override };
  if (base.wcag || override.wcag) merged.wcag = { ...base.wcag, ...override.wcag };
  if (base.rules || override.rules) merged.rules = { ...base.rules, ...override.rules };
  return merged;
}

/**
 * Creates a reusable checker. The config is validated immediately, so mistakes
 * surface at setup time rather than on the first check.
 *
 * @example
 * const checker = createChecker({ wcag: { level: 'AA' }, exclude: ['.ads'] });
 * const result = await checker.check();
 */
export function createChecker(options: CheckOptions = {}): Checker {
  const { engines = [createAxeEngine()], document: doc, ...config } = options;
  resolveConfig(config);
  return {
    engines: engines.map(({ id, version }) => ({ id, version })),
    check(overrides = {}) {
      const run: RunOptions = { engines, config: mergeConfig(config, overrides) };
      if (doc) run.document = doc;
      return runCheck(run);
    },
  };
}

/**
 * Checks the page once.
 *
 * @example
 * const result = await check({ include: ['main'] });
 * console.log(result.summary.outcomes.violation);
 */
export function check(options: CheckOptions = {}): Promise<CheckResult> {
  try {
    return createChecker(options).check();
  } catch (error) {
    return Promise.reject(error instanceof Error ? error : new Error(String(error)));
  }
}
