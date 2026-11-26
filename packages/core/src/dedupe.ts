import { resolveTarget } from './dom.js';
import { formatTarget } from './target.js';
import type { Impact, Issue, IssueNode, RelatedRule } from './types.js';

const IMPACT_RANK: readonly Impact[] = ['minor', 'moderate', 'serious', 'critical'];

const maxImpact = (a: Impact | undefined, b: Impact | undefined): Impact | undefined =>
  !a ? b : !b ? a : IMPACT_RANK.indexOf(a) >= IMPACT_RANK.indexOf(b) ? a : b;

const relatedRule = (issue: Issue): RelatedRule => {
  const rule: RelatedRule = { engine: issue.engine, ruleId: issue.ruleId, help: issue.help };
  if (issue.helpUrl) rule.helpUrl = issue.helpUrl;
  return rule;
};

function addRelated(issue: Issue, other: Issue): void {
  const related = (issue.relatedRules ??= []);
  if (!related.some((r) => r.engine === other.engine && r.ruleId === other.ruleId)) {
    related.push(relatedRule(other));
  }
}

/** Whether two issues of different engines describe the same kind of problem. */
export function areRelated(a: Issue, b: Issue): boolean {
  return (
    a.engine !== b.engine &&
    a.outcome === b.outcome &&
    (a.actRuleIds.some((id) => b.actRuleIds.includes(id)) ||
      a.wcag.some((sc) => b.wcag.includes(sc)))
  );
}

/**
 * Merges issues that different engines report on the same elements.
 *
 * Engines earlier in `engineOrder` win: their issue keeps its rule, and matching nodes
 * of the later engine's issue move into it (the node lists both engines). Unmatched
 * nodes stay in the later issue, which is dropped only if no node is left. Both
 * issues list each other in `relatedRules`.
 *
 * Nodes are matched by element identity, using `resolve` (in the page, the element
 * the target points to). When a target cannot be resolved, the formatted target is
 * compared instead.
 */
export function mergeDuplicates(
  issues: readonly Issue[],
  engineOrder: readonly string[],
  resolve: (node: IssueNode) => Element | null,
): Issue[] {
  if (new Set(issues.map((i) => i.engine)).size < 2) return [...issues];

  const keys = new Map<IssueNode, Element | string>();
  const keyOf = (node: IssueNode) => {
    let key = keys.get(node);
    if (key === undefined) {
      key = resolve(node) ?? formatTarget(node.target);
      keys.set(node, key);
    }
    return key;
  };

  // Work on copies, so engine results are never mutated.
  const copies = issues.map((issue) => ({
    ...issue,
    nodes: issue.nodes.map((node) => ({ ...node })),
    ...(issue.relatedRules ? { relatedRules: [...issue.relatedRules] } : {}),
  }));
  const rank = (engine: string) => {
    const index = engineOrder.indexOf(engine);
    return index === -1 ? engineOrder.length : index;
  };
  const ordered = [...copies].sort((a, b) => rank(a.engine) - rank(b.engine));
  const dropped = new Set<Issue>();

  for (const [index, later] of ordered.entries()) {
    if (later.nodes.length === 0) continue;
    for (const earlier of ordered.slice(0, index)) {
      if (dropped.has(earlier) || rank(earlier.engine) >= rank(later.engine)) continue;
      if (!areRelated(earlier, later)) continue;

      const byKey = new Map(earlier.nodes.map((node) => [keyOf(node), node]));
      const remaining: IssueNode[] = [];
      for (const node of later.nodes) {
        const match = byKey.get(keyOf(node));
        if (!match) {
          remaining.push(node);
          continue;
        }
        match.engines = [
          ...new Set([...(match.engines ?? [earlier.engine]), ...(node.engines ?? [later.engine])]),
        ];
        const impact = maxImpact(match.impact, node.impact);
        if (impact) match.impact = impact;
        if (node.message && node.message !== match.message) {
          match.message = match.message
            ? `${match.message}\n\n${later.engine}: ${node.message}`
            : node.message;
        }
      }
      if (remaining.length === later.nodes.length) continue;

      addRelated(earlier, later);
      addRelated(later, earlier);
      const impact = maxImpact(earlier.impact, later.impact);
      if (impact) earlier.impact = impact;
      later.nodes = remaining;
      if (remaining.length === 0) {
        dropped.add(later);
        break;
      }
    }
  }

  return copies.filter((issue) => !dropped.has(issue));
}

/** In-page node resolver for `mergeDuplicates`. */
export const resolveInDocument =
  (doc: Document) =>
  (node: IssueNode): Element | null =>
    resolveTarget(doc, node.target);
