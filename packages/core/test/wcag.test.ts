import { describe, expect, it } from 'vitest';
import { SUCCESS_CRITERIA, isCriterionInScope } from '../src/index.js';

describe('SUCCESS_CRITERIA', () => {
  it('lists every WCAG 2.x criterion', () => {
    const since = (v: string) => [...SUCCESS_CRITERIA.values()].filter((sc) => sc.since === v);
    expect(since('2.0')).toHaveLength(61);
    expect(since('2.1')).toHaveLength(17);
    expect(since('2.2')).toHaveLength(9);
  });
});

describe('isCriterionInScope', () => {
  it.each([
    ['1.1.1', '2.0', 'A', true],
    ['1.4.3', '2.2', 'A', false], // AA criterion, A target
    ['1.4.3', '2.0', 'AA', true],
    ['1.4.6', '2.2', 'AA', false], // AAA
    ['1.4.6', '2.2', 'AAA', true],
    ['1.4.11', '2.0', 'AA', false], // added in 2.1
    ['1.4.11', '2.1', 'AA', true],
    ['2.5.8', '2.1', 'AA', false], // added in 2.2
    ['2.5.8', '2.2', 'AA', true],
    ['4.1.1', '2.1', 'A', true],
    ['4.1.1', '2.2', 'A', false], // removed in 2.2
    ['9.9.9', '2.2', 'AAA', false], // unknown
  ] as const)('%s in WCAG %s %s → %s', (id, version, level, expected) => {
    expect(isCriterionInScope(id, version, level)).toBe(expected);
  });
});
