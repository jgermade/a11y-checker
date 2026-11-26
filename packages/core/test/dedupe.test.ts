import { describe, expect, it } from 'vitest';
import { mergeDuplicates, runCheck, type Issue } from '../src/index.js';
import { fakeEngine, makeIssue } from './helpers.js';

const node = (selector: string, message?: string) => ({
  target: [[selector]],
  html: `<${selector}>`,
  ...(message ? { message } : {}),
});
// Without a DOM, nodes are matched by their formatted target.
const byTarget = () => null;

const axeImage: Issue = makeIssue({
  ruleId: 'image-alt',
  engine: 'axe',
  impact: 'critical',
  wcag: ['1.1.1'],
  actRuleIds: ['23a2a8'],
  helpUrl: 'https://axe/image-alt',
  nodes: [node('#a', 'axe says'), node('#b')],
});
const ibmImage: Issue = makeIssue({
  ruleId: 'img_alt_valid',
  engine: 'ibm',
  impact: 'serious',
  wcag: ['1.1.1'],
  actRuleIds: ['23a2a8'],
  help: 'Images must have accessible names',
  nodes: [node('#a', 'ibm says'), node('#c')],
});

describe('mergeDuplicates', () => {
  it('moves shared nodes into the first engine issue and keeps the rest', () => {
    const merged = mergeDuplicates([ibmImage, axeImage], ['axe', 'ibm'], byTarget);
    const axe = merged.find((i) => i.engine === 'axe');
    const ibm = merged.find((i) => i.engine === 'ibm');

    expect(axe?.nodes).toEqual([
      {
        target: [['#a']],
        html: '<#a>',
        message: 'axe says\n\nibm: ibm says',
        engines: ['axe', 'ibm'],
      },
      { target: [['#b']], html: '<#b>' },
    ]);
    expect(axe?.impact).toBe('critical');
    expect(axe?.relatedRules).toEqual([
      { engine: 'ibm', ruleId: 'img_alt_valid', help: 'Images must have accessible names' },
    ]);
    expect(ibm?.nodes.map((n) => n.target)).toEqual([[['#c']]]);
    expect(ibm?.relatedRules).toEqual([
      { engine: 'axe', ruleId: 'image-alt', help: '', helpUrl: 'https://axe/image-alt' },
    ]);
  });

  it('drops the later issue when all its nodes were merged', () => {
    const ibm = { ...ibmImage, nodes: [node('#b')] };
    const merged = mergeDuplicates([axeImage, ibm], ['axe', 'ibm'], byTarget);
    expect(merged.map((i) => i.engine)).toEqual(['axe']);
    expect(merged[0]?.nodes[1]?.engines).toEqual(['axe', 'ibm']);
  });

  it('matches by WCAG criterion when there is no shared ACT rule', () => {
    const ibm = { ...ibmImage, actRuleIds: [], nodes: [node('#a')] };
    expect(mergeDuplicates([axeImage, ibm], ['axe', 'ibm'], byTarget)).toHaveLength(1);
  });

  it('keeps unrelated issues, other outcomes, and the same engine apart', () => {
    const otherSc = { ...ibmImage, wcag: ['4.1.2'], actRuleIds: [] };
    const review = { ...ibmImage, outcome: 'incomplete' as const };
    const sameEngine = { ...axeImage, ruleId: 'other', id: 'axe/other/violation' };
    for (const other of [otherSc, review, sameEngine]) {
      const merged = mergeDuplicates([axeImage, other], ['axe', 'ibm'], byTarget);
      expect(merged).toHaveLength(2);
      expect(merged[0]?.relatedRules).toBeUndefined();
    }
  });

  it('does not mutate its input', () => {
    const snapshot = JSON.stringify([axeImage, ibmImage]);
    mergeDuplicates([axeImage, ibmImage], ['axe', 'ibm'], byTarget);
    expect(JSON.stringify([axeImage, ibmImage])).toBe(snapshot);
  });

  it('matches nodes by element identity when targets differ', () => {
    document.body.innerHTML = '<main><img id="logo"></main>';
    const axe = { ...axeImage, nodes: [node('#logo')] };
    const ibm = { ...ibmImage, nodes: [node('html > body > main > img')] };
    const merged = mergeDuplicates([axe, ibm], ['axe', 'ibm'], (n) =>
      document.querySelector(n.target[0]?.[0] ?? ''),
    );
    expect(merged).toHaveLength(1);
    document.body.innerHTML = '';
  });
});

describe('runCheck dedupe', () => {
  it('merges by default and can be turned off', async () => {
    document.body.innerHTML = '<img id="a"><img id="b"><img id="c">';
    const engines = [fakeEngine('axe', [axeImage]), fakeEngine('ibm', [ibmImage])];

    const merged = await runCheck({ engines });
    expect(merged.issues.map((i) => [i.engine, i.nodes.length])).toEqual([
      ['axe', 2],
      ['ibm', 1],
    ]);
    expect(merged.summary.outcomes.violation).toBe(2);

    const separate = await runCheck({ engines, config: { dedupe: false } });
    expect(separate.issues.map((i) => [i.engine, i.nodes.length])).toEqual([
      ['axe', 2],
      ['ibm', 2],
    ]);
    document.body.innerHTML = '';
  });
});
