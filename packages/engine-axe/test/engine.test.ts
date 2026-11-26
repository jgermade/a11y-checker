// Integration test in a simulated DOM (happy-dom), without layout.
import { runCheck } from '@a11y-checker/core';
import { describe, expect, it } from 'vitest';
import { createAxeEngine } from '../src/index.js';
import { FIXTURES, render } from './fixtures.js';

describe('axe engine (happy-dom)', () => {
  it('finds DOM-only violations', async () => {
    render(FIXTURES.basic);
    const result = await runCheck({
      engines: [createAxeEngine()],
      config: { include: ['#fixture'] },
    });

    expect(result.errors).toEqual([]);
    const violations = result.issues.filter((i) => i.outcome === 'violation');
    const byRule = Object.fromEntries(violations.map((i) => [i.ruleId, i]));

    expect(byRule['image-alt']?.nodes.map((n) => n.target)).toEqual([
      [['#no-alt']],
      [['#ad-no-alt']],
    ]);
    expect(byRule['image-alt']?.wcag).toEqual(['1.1.1']);
    expect(byRule['image-alt']?.actRuleIds.length).toBeGreaterThan(0);
    expect(byRule['button-name']?.nodes.map((n) => n.target)).toEqual([[['#no-name']]]);
  });

  it('rejects a non-global document without an axe instance', async () => {
    const other = document.implementation.createHTMLDocument('other');
    const result = await runCheck({ engines: [createAxeEngine()], document: other });
    expect(result.errors[0]?.message).toContain('can only check the global document');
  });
});
