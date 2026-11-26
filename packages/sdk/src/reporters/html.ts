import {
  formatTarget,
  IMPACTS,
  SUCCESS_CRITERIA,
  type CheckResult,
  type Issue,
  type Outcome,
} from '@a11y-checker/core';
import { VERSION } from '../version.js';

export interface HtmlReportOptions {
  /** Page title. Default: `Accessibility report – <url>`. */
  title?: string;
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Only http(s) links are rendered, so a crafted result cannot inject `javascript:` URLs. */
const safeUrl = (value: string | undefined) =>
  value && /^https?:\/\//i.test(value) ? escapeHtml(value) : undefined;

const OUTCOME_SECTIONS: readonly { outcome: Outcome; title: string }[] = [
  { outcome: 'violation', title: 'Violations' },
  { outcome: 'incomplete', title: 'Needs review' },
  { outcome: 'pass', title: 'Passed' },
  { outcome: 'inapplicable', title: 'Not applicable' },
];

function criterionLabel(id: string): string {
  const sc = SUCCESS_CRITERIA.get(id);
  return sc ? `${id} ${sc.title} (${sc.level})` : id;
}

function renderIssue(issue: Issue): string {
  const helpUrl = safeUrl(issue.helpUrl);
  const impact = issue.impact
    ? `<span class="badge impact-${issue.impact}">${issue.impact}</span>`
    : '';
  const wcag = issue.wcag.length
    ? `<li>WCAG: ${issue.wcag.map((sc) => escapeHtml(criterionLabel(sc))).join(', ')}</li>`
    : '<li>Best practice (no WCAG criterion)</li>';
  const act = issue.actRuleIds.length
    ? `<li>ACT rules: ${issue.actRuleIds
        .map((id) => {
          const safe = escapeHtml(id);
          return `<a href="https://www.w3.org/WAI/standards-guidelines/act/rules/${encodeURIComponent(id)}/">${safe}</a>`;
        })
        .join(', ')}</li>`
    : '';
  const nodes = issue.nodes
    .map(
      (node) => `
          <li>
            <p><code>${escapeHtml(formatTarget(node.target))}</code></p>
            <pre><code>${escapeHtml(node.html)}</code></pre>
            ${node.message ? `<p class="message">${escapeHtml(node.message)}</p>` : ''}
          </li>`,
    )
    .join('');

  return `
    <article class="issue">
      <h3>${impact} ${escapeHtml(issue.help)}</h3>
      <ul class="meta">
        <li>Rule: <code>${escapeHtml(issue.ruleId)}</code> (${escapeHtml(issue.engine)})${
          helpUrl
            ? ` · <a href="${helpUrl}">Learn more<span class="visually-hidden"> about ${escapeHtml(issue.ruleId)}</span></a>`
            : ''
        }</li>
        ${wcag}
        ${act}
      </ul>
      <p>${escapeHtml(issue.description)}</p>
      ${
        issue.nodes.length
          ? `<details>
        <summary>${issue.nodes.length} ${issue.nodes.length === 1 ? 'element' : 'elements'}</summary>
        <ol class="nodes">${nodes}
        </ol>
      </details>`
          : ''
      }
    </article>`;
}

const STYLES = `
  :root {
    color-scheme: light dark;
    --bg: #ffffff; --fg: #1a1a1a; --muted: #4a4a4a; --border: #d0d0d0; --surface: #f4f4f4;
    --link: #0b57d0; --critical: #a50e0e; --serious: #b3261e; --moderate: #7a4f00; --minor: #3c4043;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #161616; --fg: #ececec; --muted: #bdbdbd; --border: #444; --surface: #222;
      --link: #8ab4f8; --critical: #ffb4ab; --serious: #ffb4ab; --moderate: #f6c26b; --minor: #d0d0d0;
    }
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--fg);
    font: 16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  header, main, footer { max-width: 60rem; margin: 0 auto; padding: 1rem; }
  a { color: var(--link); }
  code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.875rem; }
  pre { background: var(--surface); padding: 0.5rem; overflow-x: auto; white-space: pre-wrap; word-break: break-all; }
  dl.context { display: grid; grid-template-columns: max-content 1fr; gap: 0.25rem 1rem; }
  dl.context dt { font-weight: 600; }
  dl.context dd { margin: 0; overflow-wrap: anywhere; }
  .summary { display: flex; flex-wrap: wrap; gap: 0.5rem; padding: 0; list-style: none; }
  .summary li { border: 1px solid var(--border); border-radius: 0.5rem; padding: 0.5rem 1rem; }
  .summary strong { display: block; font-size: 1.5rem; }
  .issue { border: 1px solid var(--border); border-radius: 0.5rem; padding: 0 1rem 1rem; margin: 1rem 0; }
  .meta { color: var(--muted); padding-left: 1.25rem; }
  .badge { display: inline-block; border: 1px solid currentColor; border-radius: 0.25rem;
    padding: 0 0.375rem; font-size: 0.75rem; text-transform: uppercase; vertical-align: middle; }
  .impact-critical { color: var(--critical); } .impact-serious { color: var(--serious); }
  .impact-moderate { color: var(--moderate); } .impact-minor { color: var(--minor); }
  .message { white-space: pre-line; color: var(--muted); }
  .errors { border-left: 4px solid var(--critical); padding-left: 1rem; }
  .visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden;
    clip-path: inset(50%); white-space: nowrap; }
`;

/** Renders a result as a standalone, accessible HTML page (no external resources). */
export function toHTML(result: CheckResult, options: HtmlReportOptions = {}): string {
  const title = options.title ?? `Accessibility report – ${result.url}`;
  const { outcomes, violationsByImpact } = result.summary;
  const engines = result.engines.map((e) => `${e.id} ${e.version}`).join(', ');

  const sections = OUTCOME_SECTIONS.filter(({ outcome }) =>
    result.config.outcomes.includes(outcome),
  )
    .map(({ outcome, title: sectionTitle }) => {
      const issues = result.issues.filter((i) => i.outcome === outcome);
      const id = `section-${outcome}`;
      return `
    <section aria-labelledby="${id}">
      <h2 id="${id}">${sectionTitle} (${issues.length})</h2>
      ${issues.length ? issues.map(renderIssue).join('') : '<p>None.</p>'}
    </section>`;
    })
    .join('');

  const errors = result.errors.length
    ? `
    <section class="errors" aria-labelledby="section-errors">
      <h2 id="section-errors">Engine errors</h2>
      <ul>${result.errors
        .map((e) => `<li><code>${escapeHtml(e.engine)}</code>: ${escapeHtml(e.message)}</li>`)
        .join('')}</ul>
    </section>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="generator" content="a11y-checker ${escapeHtml(VERSION)}">
  <title>${escapeHtml(title)}</title>
  <style>${STYLES}</style>
</head>
<body>
  <header>
    <h1>${escapeHtml(title)}</h1>
    <dl class="context">
      <dt>URL</dt><dd>${escapeHtml(result.url)}</dd>
      <dt>Date</dt><dd><time datetime="${escapeHtml(result.timestamp)}">${escapeHtml(result.timestamp)}</time></dd>
      <dt>Target</dt><dd>WCAG ${result.config.wcag.version} ${result.config.wcag.level}${
        result.config.bestPractices ? ' + best practices' : ''
      }</dd>
      <dt>Engines</dt><dd>${escapeHtml(engines)}</dd>
    </dl>
  </header>
  <main>
    <h2 class="visually-hidden">Summary</h2>
    <ul class="summary">
      <li><strong>${outcomes.violation}</strong> violations</li>
      ${IMPACTS.map((impact) => `<li><strong>${violationsByImpact[impact]}</strong> ${impact}</li>`).join('\n      ')}
      <li><strong>${outcomes.incomplete}</strong> need review</li>
    </ul>${errors}${sections}
  </main>
  <footer>
    <p>Generated by a11y-checker ${escapeHtml(VERSION)}. Automated checks find only part of
    the accessibility issues; review the page manually as well.</p>
  </footer>
</body>
</html>
`;
}
