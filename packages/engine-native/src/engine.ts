import {
  createScopeFilter,
  getNodeTarget,
  type EngineProvider,
  type Issue,
  type IssueNode,
  type Outcome,
} from '@a11y-checker/core';
import pkg from '../package.json' with { type: 'json' };
import type { NativeRule, RuleContext, RuleOutcome } from './rule.js';
import { RULES } from './rules/index.js';

export const ENGINE_ID = 'native';

export interface TargetResult {
  element: Element;
  outcome: RuleOutcome;
  message?: string;
}

export interface RuleResult {
  rule: NativeRule;
  /** Empty when the rule is inapplicable. */
  targets: TargetResult[];
}

/** ACT outcome of a rule for a page: failed > cantTell > passed > inapplicable. */
export function ruleOutcome(result: RuleResult): RuleOutcome | 'inapplicable' {
  const outcomes = new Set(result.targets.map((t) => t.outcome));
  if (outcomes.has('failed')) return 'failed';
  if (outcomes.has('cantTell')) return 'cantTell';
  return outcomes.has('passed') ? 'passed' : 'inapplicable';
}

/**
 * Runs rules on a document and returns raw ACT results: every test target with its
 * outcome. A rule that throws reports each target as cantTell, so one broken rule
 * cannot stop the others.
 */
export function runRules(document: Document, rules: readonly NativeRule[] = RULES): RuleResult[] {
  const context: RuleContext = { document };
  return rules.map((rule) => {
    const targets: TargetResult[] = [];
    try {
      for (const element of rule.applicability(context)) {
        try {
          const { outcome, message } = rule.expectation(element, context);
          targets.push(message ? { element, outcome, message } : { element, outcome });
        } catch (error) {
          targets.push({ element, outcome: 'cantTell', message: `Rule error: ${String(error)}` });
        }
      }
    } catch (error) {
      targets.push({
        element: document.documentElement,
        outcome: 'cantTell',
        message: `Rule error: ${String(error)}`,
      });
    }
    return { rule, targets };
  });
}

const OUTCOMES: Record<RuleOutcome, Outcome> = {
  failed: 'violation',
  cantTell: 'incomplete',
  passed: 'pass',
};

/** Converts raw rule results into normalized issues. */
export function toIssues(results: readonly RuleResult[], document: Document): Issue[] {
  const issues: Issue[] = [];
  for (const { rule, targets } of results) {
    const base = {
      ruleId: rule.id,
      engine: ENGINE_ID,
      description: rule.description,
      help: rule.help,
      wcag: [...rule.wcag],
      actRuleIds: [...rule.actRuleIds],
      tags: ['act'],
      ...(rule.helpUrl ? { helpUrl: rule.helpUrl } : {}),
    };
    if (targets.length === 0) {
      issues.push({
        ...base,
        id: `${ENGINE_ID}/${rule.id}/inapplicable`,
        outcome: 'inapplicable',
        nodes: [],
      });
      continue;
    }
    for (const outcome of ['failed', 'cantTell', 'passed'] as const) {
      const matching = targets.filter((t) => t.outcome === outcome);
      if (matching.length === 0) continue;
      const mapped = OUTCOMES[outcome];
      const nodes = matching.map(({ element, message }): IssueNode => {
        const node: IssueNode = {
          target: getNodeTarget(element, document),
          html: snippet(element),
        };
        if (mapped !== 'pass') node.impact = rule.impact;
        if (message && mapped !== 'pass') node.message = message;
        return node;
      });
      issues.push({
        ...base,
        id: `${ENGINE_ID}/${rule.id}/${mapped}`,
        outcome: mapped,
        ...(mapped !== 'pass' ? { impact: rule.impact } : {}),
        nodes,
      });
    }
  }
  return issues;
}

/** The opening tag of an element (with its text for short elements), like other engines. */
function snippet(element: Element): string {
  const html = element.outerHTML;
  if (html.length <= 300) return html;
  const end = html.indexOf('>');
  return end > 0 ? `${html.slice(0, end + 1)}…` : `${html.slice(0, 299)}…`;
}

export interface NativeEngineOptions {
  /** Rules to run. Default: all of them. */
  rules?: readonly NativeRule[];
}

/** a11y-checker's own engine: rules written and validated as W3C ACT rules. */
export function createNativeEngine(options: NativeEngineOptions = {}): EngineProvider {
  const rules = options.rules ?? RULES;
  return {
    id: ENGINE_ID,
    version: pkg.version,
    run({ document }, config) {
      const keep = createScopeFilter(config);
      const results = runRules(document, rules).map((result) => ({
        ...result,
        targets: result.targets.filter((target) => keep(target.element)),
      }));
      return Promise.resolve(toIssues(results, document));
    },
  };
}
