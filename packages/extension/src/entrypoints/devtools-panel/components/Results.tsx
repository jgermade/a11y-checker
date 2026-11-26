import {
  formatTarget,
  SUCCESS_CRITERIA,
  type CheckResult,
  type Issue,
  type IssueNode,
  type NodeTarget,
  type Outcome,
} from '@a11y-checker/core';
import { Fragment } from 'preact';
import { useState } from 'preact/hooks';
import { groupIssues } from '../../../lib/group.js';
import type { GroupBy } from '../../../lib/settings.js';

interface ResultsProps {
  result: CheckResult;
  groupBy: GroupBy;
  canInspect: boolean;
  onHighlight: (target: NodeTarget) => Promise<boolean>;
  onInspect: (target: NodeTarget) => Promise<boolean>;
}

const SECTIONS: readonly { outcome: Outcome; title: string }[] = [
  { outcome: 'violation', title: 'Violations' },
  { outcome: 'incomplete', title: 'Needs review' },
];

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function Results(props: ResultsProps) {
  const { result } = props;
  return (
    <>
      <h2 class="visually-hidden">Summary</h2>
      <ul class="summary">
        {(['critical', 'serious', 'moderate', 'minor'] as const).map((impact) => (
          <li key={impact} class={`impact-${impact}`}>
            <strong>{result.summary.violationsByImpact[impact]}</strong> {impact}
          </li>
        ))}
      </ul>
      {SECTIONS.filter(({ outcome }) => result.config.outcomes.includes(outcome)).map(
        ({ outcome, title }) => {
          const issues = result.issues.filter((i) => i.outcome === outcome);
          const id = `section-${outcome}`;
          return (
            <section key={outcome} aria-labelledby={id}>
              <h2 id={id}>
                {title} ({issues.length})
              </h2>
              {issues.length === 0 ? (
                <p>None found.</p>
              ) : (
                groupIssues(issues, props.groupBy).map((group) => (
                  <section key={group.key} class="group" aria-labelledby={`${id}-${group.key}`}>
                    <h3 id={`${id}-${group.key}`}>
                      {group.label} ({group.issues.length})
                    </h3>
                    <ul class="issues">
                      {group.issues.map((issue) => (
                        <IssueItem key={issue.id} issue={issue} {...props} />
                      ))}
                    </ul>
                  </section>
                ))
              )}
            </section>
          );
        },
      )}
    </>
  );
}

function IssueItem({ issue, ...props }: ResultsProps & { issue: Issue }) {
  return (
    <li class="issue">
      <details>
        <summary>
          {issue.impact && <span class={`badge impact-${issue.impact}`}>{issue.impact}</span>}{' '}
          <span class="issue-title">{issue.help}</span>{' '}
          <span class="count">({plural(issue.nodes.length, 'element', 'elements')})</span>
        </summary>
        <div class="issue-body">
          <p>{issue.description}</p>
          <dl class="meta">
            <dt>Rule</dt>
            <dd>
              <code>{issue.ruleId}</code> ({issue.engine})
              {issue.helpUrl && (
                <>
                  {' · '}
                  <a href={issue.helpUrl} target="_blank" rel="noreferrer">
                    Learn more<span class="visually-hidden"> about {issue.ruleId}</span>
                  </a>
                </>
              )}
            </dd>
            <dt>WCAG</dt>
            <dd>
              {issue.wcag.length
                ? issue.wcag
                    .map((sc) => {
                      const info = SUCCESS_CRITERIA.get(sc);
                      return info ? `${sc} ${info.title} (${info.level})` : sc;
                    })
                    .join(', ')
                : 'Best practice'}
            </dd>
            {issue.actRuleIds.length > 0 && (
              <>
                <dt>ACT rules</dt>
                <dd>
                  {issue.actRuleIds.map((id, index) => (
                    <Fragment key={id}>
                      {index > 0 && ', '}
                      <a
                        href={`https://www.w3.org/WAI/standards-guidelines/act/rules/${encodeURIComponent(id)}/`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {id}
                      </a>
                    </Fragment>
                  ))}
                </dd>
              </>
            )}
          </dl>
          <ol class="nodes">
            {issue.nodes.map((node, index) => (
              <NodeItem key={index} node={node} {...props} />
            ))}
          </ol>
        </div>
      </details>
    </li>
  );
}

function NodeItem({
  node,
  canInspect,
  onHighlight,
  onInspect,
}: Omit<ResultsProps, 'result' | 'groupBy'> & { node: IssueNode }) {
  const [notFound, setNotFound] = useState(false);
  const selector = formatTarget(node.target);
  const act = (fn: (target: NodeTarget) => Promise<boolean>) => () => {
    void fn(node.target).then((found) => {
      setNotFound(!found);
    });
  };

  return (
    <li class="node">
      <p class="node-target">
        <code>{selector}</code>
      </p>
      <div class="node-actions">
        <button type="button" onClick={act(onHighlight)}>
          Highlight<span class="visually-hidden"> {selector}</span>
        </button>
        {canInspect && (
          <button type="button" onClick={act(onInspect)}>
            Inspect<span class="visually-hidden"> {selector}</span>
          </button>
        )}
        {notFound && (
          <span role="status" class="not-found">
            Element not found. The page may have changed.
          </span>
        )}
      </div>
      <pre>
        <code>{node.html}</code>
      </pre>
      {node.message && <p class="message">{node.message}</p>}
    </li>
  );
}
