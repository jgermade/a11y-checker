import { SUCCESS_CRITERIA, type Issue } from '@a11y-checker/core';
import type { GroupBy } from './settings.js';

export interface IssueGroup {
  key: string;
  label: string;
  issues: Issue[];
}

const IMPACT_ORDER = ['critical', 'serious', 'moderate', 'minor'] as const;
const BEST_PRACTICE = 'best-practice';

const compareCriteria = (a: string, b: string) => {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  return (pa[0] ?? 0) - (pb[0] ?? 0) || (pa[1] ?? 0) - (pb[1] ?? 0) || (pa[2] ?? 0) - (pb[2] ?? 0);
};

function criterionLabel(id: string): string {
  const sc = SUCCESS_CRITERIA.get(id);
  return sc ? `${id} ${sc.title} (${sc.level})` : id;
}

/**
 * Groups issues for display. With `wcag`, an issue mapped to several criteria
 * appears in each of their groups; issues without a criterion go last.
 */
export function groupIssues(issues: readonly Issue[], by: GroupBy): IssueGroup[] {
  const groups = new Map<string, IssueGroup>();
  const add = (key: string, label: string, issue: Issue) => {
    let group = groups.get(key);
    if (!group) groups.set(key, (group = { key, label, issues: [] }));
    group.issues.push(issue);
  };

  for (const issue of issues) {
    if (by === 'impact') {
      const impact = issue.impact ?? 'unknown';
      add(impact, impact === 'unknown' ? 'Unknown impact' : capitalize(impact), issue);
    } else if (by === 'rule') {
      add(`${issue.engine}/${issue.ruleId}`, issue.ruleId, issue);
    } else if (issue.wcag.length === 0) {
      add(BEST_PRACTICE, 'Best practices (no WCAG criterion)', issue);
    } else {
      for (const sc of issue.wcag) add(sc, criterionLabel(sc), issue);
    }
  }

  const list = [...groups.values()];
  if (by === 'impact') {
    const rank = (key: string) => {
      const index = IMPACT_ORDER.indexOf(key as (typeof IMPACT_ORDER)[number]);
      return index === -1 ? IMPACT_ORDER.length : index;
    };
    return list.sort((a, b) => rank(a.key) - rank(b.key));
  }
  if (by === 'rule') return list.sort((a, b) => a.label.localeCompare(b.label));
  return list.sort((a, b) =>
    a.key === BEST_PRACTICE ? 1 : b.key === BEST_PRACTICE ? -1 : compareCriteria(a.key, b.key),
  );
}

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
