import { describe, expect, it } from 'vitest';
import { hasLayoutSupport } from '../src/index.js';

describe('hasLayoutSupport (simulated DOM)', () => {
  it('returns false because happy-dom does not compute layout', () => {
    expect(hasLayoutSupport()).toBe(false);
  });

  it('removes its probe element', () => {
    const before = document.body.childElementCount;
    hasLayoutSupport();
    expect(document.body.childElementCount).toBe(before);
  });
});
