import {
  createScopeFilter,
  type EngineProvider,
  type Issue,
  type ResolvedConfig,
} from '@a11y-checker/core';
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

/** Applies the include/exclude selectors of the config, which the IBM engine lacks. */
export const scopeFilter = (config: ResolvedConfig): ((node: Node) => boolean) =>
  createScopeFilter(config);

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
