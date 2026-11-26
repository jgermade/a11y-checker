import {
  getNodeTarget,
  SUCCESS_CRITERIA,
  type Impact,
  type Issue,
  type IssueNode,
  type Outcome,
} from '@a11y-checker/core';
import type { AceChecker, AceResult, AceRule } from './ace.js';

export const ENGINE_ID = 'ibm';
const LOCALE = 'en-US';
const HELP_BASE = 'https://able.ibm.com/rules/archives/latest/doc/en-US/';

/** IBM policy and confidence → our outcome, impact and whether it is a WCAG requirement. */
export function classify(
  value: readonly [string, string],
): { outcome: Outcome; impact?: Impact; requirement: boolean } | null {
  const [policy, confidence] = value;
  if (policy !== 'VIOLATION' && policy !== 'RECOMMENDATION') return null; // INFORMATION
  const requirement = policy === 'VIOLATION';
  switch (confidence) {
    case 'FAIL':
      return { outcome: 'violation', impact: requirement ? 'serious' : 'minor', requirement };
    case 'POTENTIAL':
    case 'MANUAL':
      return { outcome: 'incomplete', impact: requirement ? 'moderate' : 'minor', requirement };
    case 'PASS':
      return { outcome: 'pass', requirement };
    default:
      return null;
  }
}

/** Normalizes the `act` field of an IBM rule to a list of ACT rule IDs. */
export function actIdsOf(rule: AceRule | undefined): string[] {
  const act = rule?.act;
  if (!act) return [];
  const ids = (Array.isArray(act) ? act : [act]).flatMap((entry) =>
    typeof entry === 'string' ? [entry] : Object.keys(entry),
  );
  return [...new Set(ids)];
}

/** WCAG criteria a rule maps to in a guideline, keeping only real WCAG 2.x numbers. */
export function wcagOf(rule: AceRule | undefined, guidelineId: string): string[] {
  const criteria = new Set<string>();
  for (const ruleset of rule?.rulesets ?? []) {
    const ids = Array.isArray(ruleset.id) ? ruleset.id : [ruleset.id];
    if (!ids.includes(guidelineId)) continue;
    for (const num of Array.isArray(ruleset.num) ? ruleset.num : [ruleset.num]) {
      if (SUCCESS_CRITERIA.has(num)) criteria.add(num);
    }
  }
  return [...criteria];
}

export function helpUrlOf(rule: AceRule | undefined, ruleId: string): string {
  const file = rule?.help?.[LOCALE]?.group ?? `${ruleId}.html`;
  return HELP_BASE + encodeURIComponent(file).replace(/%2F/g, '/');
}

const IMPACT_ORDER: readonly Impact[] = ['minor', 'moderate', 'serious', 'critical'];

/**
 * Groups IBM results into normalized issues, one per rule and outcome.
 *
 * @param keep - optional node filter (for the include/exclude selectors).
 */
export function normalizeResults(
  results: readonly AceResult[],
  checker: Pick<AceChecker, 'engine'>,
  guidelineId: string,
  top: Document,
  keep: (node: Node) => boolean = () => true,
): Issue[] {
  const issues = new Map<string, Issue>();
  for (const result of results) {
    const kind = classify(result.value);
    if (!kind || !keep(result.node)) continue;

    const id = `${ENGINE_ID}/${result.ruleId}/${kind.outcome}`;
    let issue = issues.get(id);
    if (!issue) {
      const rule = checker.engine.getRule(result.ruleId);
      const summary = rule?.messages?.[LOCALE]?.group ?? result.ruleId;
      issue = {
        id,
        ruleId: result.ruleId,
        engine: ENGINE_ID,
        outcome: kind.outcome,
        description: summary,
        help: summary,
        helpUrl: helpUrlOf(rule, result.ruleId),
        // IBM recommendations are not WCAG requirements: report them as best practices.
        wcag: kind.requirement ? wcagOf(rule, guidelineId) : [],
        actRuleIds: actIdsOf(rule),
        tags: [result.value[0].toLowerCase(), result.value[1].toLowerCase()],
        nodes: [],
      };
      issues.set(id, issue);
    }

    const node: IssueNode = { target: getNodeTarget(result.node, top), html: result.snippet };
    if (kind.impact) {
      node.impact = kind.impact;
      if (!issue.impact || IMPACT_ORDER.indexOf(kind.impact) > IMPACT_ORDER.indexOf(issue.impact)) {
        issue.impact = kind.impact;
      }
    }
    if (kind.outcome !== 'pass' && result.message) node.message = result.message;
    issue.nodes.push(node);
  }
  return [...issues.values()];
}
