import {
  formatTarget,
  getNodeTarget,
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

export interface SingleCheckOptions extends CheckOptions {
  /**
   * Check only this element and its descendants. It replaces `include`, and its
   * document becomes the checked document. It must be in its document's light DOM.
   */
  element?: Element;
}

const SCOPE_ATTRIBUTE = 'data-a11y-checker-scope';
const SCOPE_IN_HTML = new RegExp(` ${SCOPE_ATTRIBUTE}="[^"]*"`, 'g');

/**
 * Removes the temporary scope attribute from a result: from the HTML snippets, and
 * from `config.include`, which shows the element's own selector instead.
 */
function stripScope(result: CheckResult, element: Element): CheckResult {
  for (const issue of result.issues) {
    for (const node of issue.nodes) node.html = node.html.replace(SCOPE_IN_HTML, '');
  }
  result.config.include = [formatTarget(getNodeTarget(element, element.ownerDocument))];
  return result;
}

async function checkElement(element: Element, options: CheckOptions): Promise<CheckResult> {
  const doc = element.ownerDocument;
  if (element.getRootNode() !== doc) {
    throw new Error(
      'check({ element }): the element must be attached to its document, outside shadow roots.',
    );
  }
  const id = Math.random().toString(36).slice(2);
  element.setAttribute(SCOPE_ATTRIBUTE, id);
  try {
    const result = await createChecker({
      ...options,
      document: options.document ?? doc,
      include: [`[${SCOPE_ATTRIBUTE}="${id}"]`],
    }).check();
    return stripScope(result, element);
  } finally {
    element.removeAttribute(SCOPE_ATTRIBUTE);
  }
}

/**
 * Checks the page, or a single element, once.
 *
 * @example
 * const result = await check({ include: ['main'] });
 * console.log(result.summary.outcomes.violation);
 *
 * const form = await check({ element: document.querySelector('form')! });
 */
export async function check(options: SingleCheckOptions = {}): Promise<CheckResult> {
  const { element, ...rest } = options;
  if (element) return checkElement(element, rest);
  return createChecker(rest).check();
}
