/** Severity of an issue, aligned with the impact levels used by axe-core. */
export type Impact = 'minor' | 'moderate' | 'serious' | 'critical';

/**
 * Result of evaluating a rule.
 *
 * - `violation`: the rule failed.
 * - `incomplete`: the engine could not decide; a human must review.
 * - `pass`: the rule passed.
 * - `inapplicable`: the rule did not apply to anything on the page.
 */
export type Outcome = 'violation' | 'incomplete' | 'pass' | 'inapplicable';

export type WcagVersion = '2.0' | '2.1' | '2.2';
export type WcagLevel = 'A' | 'AA' | 'AAA';

/**
 * Location of a node.
 *
 * Each entry is one frame level, outermost first. Each frame level is a chain of
 * selectors that goes through shadow roots: the first selector is resolved in the
 * frame's document, and each following one inside the previous element's shadow root.
 *
 * @example
 * // A button inside the shadow root of `#host`, inside `iframe#app`:
 * [['iframe#app'], ['#host', 'button']]
 */
export type NodeTarget = string[][];

export interface IssueNode {
  target: NodeTarget;
  /** Outer HTML snippet of the node (may be truncated by the engine). */
  html: string;
  impact?: Impact;
  /** Human-readable explanation of why this node has this outcome. */
  message?: string;
}

export interface Issue {
  /** Stable identifier: `<engine>/<ruleId>/<outcome>`. */
  id: string;
  /** Rule identifier, scoped to its engine. */
  ruleId: string;
  /** Identifier of the engine that reported the issue. */
  engine: string;
  outcome: Outcome;
  /** Highest impact among the issue's nodes. Absent for passes and inapplicable rules. */
  impact?: Impact;
  /** What the rule checks. */
  description: string;
  /** Short advice on how to fix the issue. */
  help: string;
  helpUrl?: string;
  /** WCAG success criteria, e.g. `['1.4.3']`. Empty for best-practice rules. */
  wcag: string[];
  /** W3C ACT rule IDs implemented by this rule, e.g. `['09o5cg']`. */
  actRuleIds: string[];
  /** Engine-specific tags, kept for reference. */
  tags: string[];
  nodes: IssueNode[];
}

export interface EngineInfo {
  id: string;
  version: string;
}

export interface EngineError {
  engine: string;
  message: string;
}

export interface CheckSummary {
  outcomes: Record<Outcome, number>;
  /** Number of violation issues per impact. */
  violationsByImpact: Record<Impact, number>;
}
