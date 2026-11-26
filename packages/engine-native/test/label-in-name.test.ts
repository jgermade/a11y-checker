import { describe, expect, it } from 'vitest';
import { isContiguousSubsequence, labelIsInName, tokenize } from '../src/index.js';

describe('tokenize', () => {
  it('case-folds, removes punctuation and parenthesized text', () => {
    expect(tokenize('Next… (opens a new window)')).toEqual(['next']);
    expect(tokenize('  Search: the WEB!  ')).toEqual(['search', 'the', 'web']);
    expect(tokenize('Ⅻ ﬁle')).toEqual(['xii', 'file']); // NFKD compatibility forms
  });
});

describe('labelIsInName', () => {
  it.each([
    ['Search', 'Search the site', true],
    ['Next', 'Next page', true],
    ['the site', 'Search the site', true],
    ['Search site', 'Search the site', false], // not contiguous
    ['Click here', 'Read more', false],
    ['X', 'Close dialog', true], // a single letter is a symbol
    ['1', '1a', false], // a single digit is text
    ['', 'Anything', true],
  ])('%j in %j → %s', (label, name, expected) => {
    expect(labelIsInName(label, name)).toBe(expected);
  });

  it('checks contiguous token runs', () => {
    expect(isContiguousSubsequence(['b', 'c'], ['a', 'b', 'c'])).toBe(true);
    expect(isContiguousSubsequence(['a', 'c'], ['a', 'b', 'c'])).toBe(false);
  });
});
