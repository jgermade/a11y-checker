import type { EngineProvider, Issue, ResolvedConfig } from '@a11y-checker/core';
import { bundledAce, type AceApi, type AceChecker } from './ace.js';
import { ENGINE_ID, normalizeResults } from './normalize.js';

declare const __IBM_ENGINE_VERSION__: string | undefined;

export interface IbmEngineOptions {
  /**
   * IBM engine (`accessibility-checker-engine`) to use. Default: the bundled one.
   * Pass the instance loaded in another window to check that window's document.
   */
  ace?: AceApi;
  /** Version reported for this engine. Default: the bundled engine's version. */
  version?: string;
}

/** Guideline to run: the WCAG version, or IBM's superset when best practices are on. */
export function guidelineFor(config: ResolvedConfig): string {
  if (config.bestPractices) return 'IBM_Accessibility';
  return `WCAG_${config.wcag.version.replace('.', '_')}`;
}

/** Walks up through shadow roots and same-origin frames. */
function* composedAncestors(node: Node): Generator<Element> {
  let current: Node | null = node;
  while (current) {
    if (current.nodeType === 1) yield current as Element;
    const parent: Node | null = current.parentNode;
    if (parent && parent.nodeType === 11 && 'host' in parent) {
      current = (parent as ShadowRoot).host;
    } else if (parent && parent.nodeType === 9) {
      try {
        current = (parent as Document).defaultView?.frameElement ?? null;
      } catch {
        current = null;
      }
    } else {
      current = parent;
    }
  }
}

/** Applies the include/exclude selectors of the config, which the IBM engine lacks. */
export function scopeFilter(config: ResolvedConfig): (node: Node) => boolean {
  if (config.include.length === 0 && config.exclude.length === 0) return () => true;
  const matches = (element: Element, selectors: string[]) =>
    selectors.some((selector) => {
      try {
        return element.matches(selector);
      } catch {
        return false;
      }
    });
  return (node) => {
    const ancestors = [...composedAncestors(node)];
    if (config.exclude.length && ancestors.some((el) => matches(el, config.exclude))) return false;
    return config.include.length === 0 || ancestors.some((el) => matches(el, config.include));
  };
}

export function createIbmEngine(options: IbmEngineOptions = {}): EngineProvider {
  const ace = options.ace ?? bundledAce;
  let checker: AceChecker | undefined;
  return {
    id: ENGINE_ID,
    version:
      options.version ??
      (typeof __IBM_ENGINE_VERSION__ === 'string' ? __IBM_ENGINE_VERSION__ : 'unknown'),
    async run({ document: doc }, config): Promise<Issue[]> {
      checker ??= new ace.Checker();
      const guideline = guidelineFor(config);
      if (!checker.getGuidelineIds().includes(guideline)) {
        throw new Error(`The IBM engine does not support the ${guideline} guideline.`);
      }
      const report = await checker.check(doc, [guideline]);
      return normalizeResults(report.results, checker, guideline, doc, scopeFilter(config));
    },
  };
}
