import {
  formatTarget,
  IMPACTS,
  type CheckResult,
  type Impact,
  type Issue,
} from '@a11y-checker/core';

export interface TextReportOptions {
  /** Also list issues that need review. Default: `false`. */
  incomplete?: boolean;
  /** Maximum nodes listed per issue. Default: `5`. */
  maxNodes?: number;
}

// IMPACTS is ordered from most to least severe.
const rank = (impact: Impact | undefined) => (impact ? IMPACTS.indexOf(impact) : -1);

/**
 * Violations at or above an impact threshold (`'minor'` returns all of them).
 * Violations without an impact always count.
 */
export function violationsAtLeast(result: CheckResult, failOn: Impact = 'minor'): Issue[] {
  const threshold = IMPACTS.indexOf(failOn);
  return result.issues.filter(
    (issue) => issue.outcome === 'violation' && rank(issue.impact) <= threshold,
  );
}

const truncate = (value: string, max: number) =>
  value.length > max ? `${value.slice(0, max - 1)}…` : value;

const indent = (text: string, prefix: string) =>
  text
    .split('\n')
    .map((line) => (line.trim() ? prefix + line.trim() : ''))
    .filter(Boolean)
    .join('\n');

/** Formats issues as plain text, one block per issue. */
export function formatIssues(issues: readonly Issue[], options: TextReportOptions = {}): string {
  const maxNodes = options.maxNodes ?? 5;
  return issues
    .map((issue) => {
      const mark = issue.outcome === 'violation' ? '✖' : '?';
      const impact = issue.impact ? `[${issue.impact}] ` : '';
      const wcag = issue.wcag.length ? ` (WCAG ${issue.wcag.join(', ')})` : '';
      const engines = issue.relatedRules?.length
        ? `\n    also: ${issue.relatedRules.map((r) => `${r.engine}/${r.ruleId}`).join(', ')}`
        : '';
      const lines = [
        `${mark} ${impact}${issue.engine}/${issue.ruleId}: ${issue.help}${wcag}`,
        ...(issue.helpUrl ? [`    ${issue.helpUrl}`] : []),
      ];
      const nodes = issue.nodes.slice(0, maxNodes).map((node) => {
        const parts = [`    • ${formatTarget(node.target)}`, `      ${truncate(node.html, 120)}`];
        if (node.message) parts.push(indent(node.message, '      '));
        return parts.join('\n');
      });
      if (issue.nodes.length > maxNodes) {
        nodes.push(`    … and ${issue.nodes.length - maxNodes} more`);
      }
      return lines.join('\n') + engines + (nodes.length ? `\n${nodes.join('\n')}` : '');
    })
    .join('\n\n');
}

/** Renders a result as a plain-text report, for terminals and logs. */
export function toText(result: CheckResult, options: TextReportOptions = {}): string {
  const { outcomes, violationsByImpact } = result.summary;
  const impacts = IMPACTS.filter((i) => violationsByImpact[i] > 0)
    .map((i) => `${violationsByImpact[i]} ${i}`)
    .join(', ');
  const engines = result.engines.map((e) => `${e.id} ${e.version}`).join(', ');
  const header = [
    `Accessibility check of ${result.url}`,
    `WCAG ${result.config.wcag.version} ${result.config.wcag.level} · ${engines}`,
    `${outcomes.violation} ${outcomes.violation === 1 ? 'violation' : 'violations'}${
      impacts ? ` (${impacts})` : ''
    }, ${outcomes.incomplete} to review`,
  ];
  const errors = result.errors.map((e) => `! engine ${e.engine} failed: ${e.message}`);
  const shown = result.issues.filter(
    (i) => i.outcome === 'violation' || (options.incomplete && i.outcome === 'incomplete'),
  );
  return [header.join('\n'), ...errors, ...(shown.length ? [formatIssues(shown, options)] : [])]
    .join('\n\n')
    .concat('\n');
}
