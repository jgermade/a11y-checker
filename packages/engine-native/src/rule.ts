import type { Impact } from '@a11y-checker/core';

/** Outcome of an ACT rule expectation for one test target. */
export type RuleOutcome = 'passed' | 'failed' | 'cantTell';

export interface Expectation {
  outcome: RuleOutcome;
  /** Why the target has this outcome. Shown for failed and cantTell targets. */
  message?: string;
}

export interface RuleContext {
  /** The document being checked (the top document of the check). */
  document: Document;
}

/**
 * A rule, structured like a W3C ACT rule: an applicability (which elements are test
 * targets) and an expectation evaluated for each target.
 */
export interface NativeRule {
  /** Stable rule ID, e.g. `image-name`. */
  id: string;
  /** W3C ACT rules this rule implements. */
  actRuleIds: string[];
  /** WCAG success criteria a failure maps to. */
  wcag: string[];
  impact: Impact;
  /** What the rule checks. */
  description: string;
  /** Short advice on how to fix a failure. */
  help: string;
  helpUrl?: string;
  /** The test targets in a document. */
  applicability(context: RuleContext): Iterable<Element>;
  /** The expectation for one test target. */
  expectation(target: Element, context: RuleContext): Expectation;
}

/** Identity helper that type-checks a rule definition. */
export const defineRule = (rule: NativeRule): NativeRule => rule;

export const actUrl = (actRuleId: string): string =>
  `https://www.w3.org/WAI/standards-guidelines/act/rules/${actRuleId}/`;

export const passed = (message?: string): Expectation =>
  message ? { outcome: 'passed', message } : { outcome: 'passed' };
export const failed = (message: string): Expectation => ({ outcome: 'failed', message });
export const cantTell = (message: string): Expectation => ({ outcome: 'cantTell', message });
