import { describe, expect, it } from 'vitest';
import { hasLayoutSupport } from '../src/index.js';

describe('hasLayoutSupport (real browser)', () => {
  it('returns true in a real browser', () => {
    expect(hasLayoutSupport()).toBe(true);
  });

  it('removes its probe element', () => {
    const before = document.body.childElementCount;
    hasLayoutSupport();
    expect(document.body.childElementCount).toBe(before);
  });
});
