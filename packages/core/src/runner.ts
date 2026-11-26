import { resolveConfig, type CheckConfig, type ResolvedConfig } from './config.js';
import type { EngineProvider } from './engine.js';
import type { CheckSummary, EngineError, EngineInfo, Impact, Issue, Outcome } from './types.js';
import { isCriterionInScope } from './wcag.js';

export interface RunOptions {
  /** Engines to run, in order. At least one is required. */
  engines: EngineProvider[];
  /** Document to check. Default: the global `document`. */
  document?: Document;
  config?: CheckConfig;
}

export interface CheckResult {
  url: string;
  /** ISO 8601 timestamp of when the check started. */
  timestamp: string;
  /** Duration of the check in milliseconds. */
  duration: number;
  engines: EngineInfo[];
  config: ResolvedConfig;
  issues: Issue[];
  summary: CheckSummary;
  /** Engines that failed. The other engines' results are still reported. */
  errors: EngineError[];
}

export const IMPACTS: readonly Impact[] = ['critical', 'serious', 'moderate', 'minor'];
const OUTCOME_ORDER: readonly Outcome[] = ['violation', 'incomplete', 'pass', 'inapplicable'];

/** Reports whether an issue falls within the config's WCAG target, rules and outcomes. */
export function isIssueInScope(issue: Issue, config: ResolvedConfig): boolean {
  if (!config.outcomes.includes(issue.outcome)) return false;
  if (config.rules.exclude.includes(issue.ruleId)) return false;
  if (config.rules.include) return config.rules.include.includes(issue.ruleId);
  if (issue.wcag.length === 0) return config.bestPractices;
  return issue.wcag.some((sc) => isCriterionInScope(sc, config.wcag.version, config.wcag.level));
}

const impactRank = (impact: Impact | undefined) =>
  impact ? IMPACTS.indexOf(impact) : IMPACTS.length;

/** Sorts by outcome, then impact (most severe first), then rule ID. */
export function compareIssues(a: Issue, b: Issue): number {
  return (
    OUTCOME_ORDER.indexOf(a.outcome) - OUTCOME_ORDER.indexOf(b.outcome) ||
    impactRank(a.impact) - impactRank(b.impact) ||
    a.ruleId.localeCompare(b.ruleId) ||
    a.engine.localeCompare(b.engine)
  );
}

export function summarize(issues: Issue[]): CheckSummary {
  const summary: CheckSummary = {
    outcomes: { violation: 0, incomplete: 0, pass: 0, inapplicable: 0 },
    violationsByImpact: { critical: 0, serious: 0, moderate: 0, minor: 0 },
  };
  for (const issue of issues) {
    summary.outcomes[issue.outcome]++;
    if (issue.outcome === 'violation' && issue.impact) summary.violationsByImpact[issue.impact]++;
  }
  return summary;
}

/**
 * Runs every engine against the document and merges their normalized results.
 *
 * Engines run one after another, because some (like axe-core) cannot run
 * concurrently in the same page. An engine that throws is reported in `errors`
 * and does not stop the others.
 */
export async function runCheck(options: RunOptions): Promise<CheckResult> {
  const { engines } = options;
  if (engines.length === 0) throw new Error('runCheck: at least one engine is required');
  const ids = engines.map((e) => e.id);
  const duplicate = ids.find((id, i) => ids.indexOf(id) !== i);
  if (duplicate) throw new Error(`runCheck: engine '${duplicate}' is registered twice`);

  const config = resolveConfig(options.config);
  const doc = options.document ?? globalThis.document;
  const start = Date.now();

  const issues: Issue[] = [];
  const errors: EngineError[] = [];
  for (const engine of engines) {
    try {
      const found = await engine.run({ document: doc }, config);
      issues.push(...found.filter((issue) => isIssueInScope(issue, config)));
    } catch (error) {
      errors.push({
        engine: engine.id,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  issues.sort(compareIssues);

  return {
    url: doc.URL,
    timestamp: new Date(start).toISOString(),
    duration: Date.now() - start,
    engines: engines.map(({ id, version }) => ({ id, version })),
    config,
    issues,
    summary: summarize(issues),
    errors,
  };
}
