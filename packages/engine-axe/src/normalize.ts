import type { Impact, Issue, IssueNode, NodeTarget, Outcome } from '@a11y-checker/core';
import type axe from 'axe-core';

export const ENGINE_ID = 'axe';

const SC_TAG = /^wcag(\d)(\d)(\d+)$/;

/** Extracts WCAG success criteria from axe tags (`wcag1410` → `1.4.10`), sorted. */
export function wcagFromTags(tags: readonly string[]): string[] {
  const criteria = new Set<string>();
  for (const tag of tags) {
    const [, principle, guideline, criterion] = SC_TAG.exec(tag) ?? [];
    if (principle && guideline && criterion) {
      criteria.add(`${principle}.${guideline}.${criterion}`);
    }
  }
  return [...criteria].sort(compareCriteria);
}

function compareCriteria(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** Converts an axe selector (strings and shadow DOM arrays) to a `NodeTarget`. */
export function normalizeTarget(target: axe.UnlabelledFrameSelector): NodeTarget {
  return target.map((level) => (Array.isArray(level) ? [...level] : [level]));
}

const IMPACTS: readonly string[] = ['minor', 'moderate', 'serious', 'critical'];
const toImpact = (value: unknown): Impact | undefined =>
  IMPACTS.includes(value as string) ? (value as Impact) : undefined;

function normalizeNode(node: axe.NodeResult, withImpact: boolean): IssueNode {
  const result: IssueNode = { target: normalizeTarget(node.target), html: node.html };
  const impact = withImpact ? toImpact(node.impact) : undefined;
  if (impact) result.impact = impact;
  if (node.failureSummary) result.message = node.failureSummary;
  return result;
}

const GROUPS: readonly [Outcome, keyof Pick<axe.AxeResults, axe.resultGroups>][] = [
  ['violation', 'violations'],
  ['incomplete', 'incomplete'],
  ['pass', 'passes'],
  ['inapplicable', 'inapplicable'],
];

/**
 * Converts axe results into normalized issues.
 *
 * @param actIds ACT rule IDs per axe rule ID, from `axe.getRules()`.
 */
export function normalizeResults(
  results: Pick<axe.AxeResults, axe.resultGroups>,
  actIds: ReadonlyMap<string, readonly string[]> = new Map(),
): Issue[] {
  const issues: Issue[] = [];
  for (const [outcome, group] of GROUPS) {
    const withImpact = outcome === 'violation' || outcome === 'incomplete';
    for (const result of results[group]) {
      const issue: Issue = {
        id: `${ENGINE_ID}/${result.id}/${outcome}`,
        ruleId: result.id,
        engine: ENGINE_ID,
        outcome,
        description: result.description,
        help: result.help,
        helpUrl: result.helpUrl,
        wcag: wcagFromTags(result.tags),
        actRuleIds: [...(actIds.get(result.id) ?? [])],
        tags: [...result.tags],
        nodes: result.nodes.map((node) => normalizeNode(node, withImpact)),
      };
      const impact = withImpact ? toImpact(result.impact) : undefined;
      if (impact) issue.impact = impact;
      issues.push(issue);
    }
  }
  return issues;
}
