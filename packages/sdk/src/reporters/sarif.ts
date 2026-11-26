import {
  formatTarget,
  type CheckResult,
  type Issue,
  type Outcome,
  type RelatedRule,
} from '@a11y-checker/core';
import { VERSION } from '../version.js';

// Minimal SARIF 2.1.0 types for the parts this reporter writes.
// Spec: https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html

export type SarifLevel = 'none' | 'note' | 'warning' | 'error';
export type SarifKind = 'pass' | 'fail' | 'review' | 'notApplicable';

export interface SarifRule {
  id: string;
  name: string;
  shortDescription: { text: string };
  fullDescription: { text: string };
  helpUri?: string;
  help: { text: string };
  properties: {
    tags: string[];
    engine: string;
    wcag: string[];
    actRuleIds: string[];
    relatedRules?: RelatedRule[];
  };
}

export interface SarifResult {
  ruleId: string;
  ruleIndex: number;
  kind: SarifKind;
  level: SarifLevel;
  message: { text: string };
  locations: {
    physicalLocation: {
      artifactLocation: { uri: string };
      region: { snippet: { text: string } };
    };
    logicalLocations: { fullyQualifiedName: string; kind: 'element' }[];
  }[];
  properties: { impact?: string; target: string[][]; engines?: string[] };
}

export interface SarifLog {
  $schema: string;
  version: '2.1.0';
  runs: {
    tool: {
      driver: {
        name: string;
        version: string;
        informationUri: string;
        rules: SarifRule[];
      };
    };
    invocations: {
      executionSuccessful: boolean;
      startTimeUtc: string;
      toolExecutionNotifications: { level: 'error'; message: { text: string } }[];
    }[];
    artifacts: { location: { uri: string } }[];
    results: SarifResult[];
    properties: { engines: CheckResult['engines']; config: CheckResult['config'] };
  }[];
}

const KIND: Record<Outcome, SarifKind> = {
  violation: 'fail',
  incomplete: 'review',
  pass: 'pass',
  inapplicable: 'notApplicable',
};

/** Critical and serious violations are errors; other violations are warnings. */
function levelOf(issue: Issue): SarifLevel {
  if (issue.outcome !== 'violation') return 'none';
  return issue.impact === 'critical' || issue.impact === 'serious' ? 'error' : 'warning';
}

const sarifRuleId = (issue: Issue) => `${issue.engine}/${issue.ruleId}`;

function toRule(issue: Issue): SarifRule {
  const rule: SarifRule = {
    id: sarifRuleId(issue),
    name: issue.ruleId,
    shortDescription: { text: issue.help },
    fullDescription: { text: issue.description },
    help: { text: issue.helpUrl ? `${issue.help}\n${issue.helpUrl}` : issue.help },
    properties: {
      tags: [
        'accessibility',
        ...issue.wcag.map((sc) => `WCAG ${sc}`),
        ...issue.actRuleIds.map((id) => `ACT ${id}`),
      ],
      engine: issue.engine,
      wcag: issue.wcag,
      actRuleIds: issue.actRuleIds,
    },
  };
  if (issue.helpUrl) rule.helpUri = issue.helpUrl;
  if (issue.relatedRules?.length) rule.properties.relatedRules = issue.relatedRules;
  return rule;
}

/**
 * Converts a result into a SARIF 2.1.0 log, with one SARIF result per node.
 *
 * The page URL is the artifact location, the selector is the logical location and
 * the node's HTML is the snippet.
 */
export function toSARIF(result: CheckResult): SarifLog {
  const rules: SarifRule[] = [];
  const ruleIndex = new Map<string, number>();
  const results: SarifResult[] = [];

  for (const issue of result.issues) {
    const id = sarifRuleId(issue);
    let index = ruleIndex.get(id);
    if (index === undefined) {
      index = rules.push(toRule(issue)) - 1;
      ruleIndex.set(id, index);
    }
    for (const node of issue.nodes) {
      const properties: SarifResult['properties'] = { target: node.target };
      const impact = node.impact ?? issue.impact;
      if (impact) properties.impact = impact;
      if (node.engines) properties.engines = node.engines;
      results.push({
        ruleId: id,
        ruleIndex: index,
        kind: KIND[issue.outcome],
        level: levelOf(issue),
        message: { text: node.message ?? issue.help },
        locations: [
          {
            physicalLocation: {
              artifactLocation: { uri: result.url },
              region: { snippet: { text: node.html } },
            },
            logicalLocations: [{ fullyQualifiedName: formatTarget(node.target), kind: 'element' }],
          },
        ],
        properties,
      });
    }
  }

  return {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'a11y-checker',
            version: VERSION,
            informationUri: 'https://github.com/jgermade/a11y-checker',
            rules,
          },
        },
        invocations: [
          {
            executionSuccessful: result.errors.length === 0,
            startTimeUtc: result.timestamp,
            toolExecutionNotifications: result.errors.map((e) => ({
              level: 'error' as const,
              message: { text: `${e.engine}: ${e.message}` },
            })),
          },
        ],
        artifacts: [{ location: { uri: result.url } }],
        results,
        properties: { engines: result.engines, config: result.config },
      },
    ],
  };
}
