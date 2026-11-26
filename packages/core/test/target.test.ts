import { describe, expect, it } from 'vitest';
import { formatTarget } from '../src/index.js';

describe('formatTarget', () => {
  it('joins shadow chains and frame levels', () => {
    expect(formatTarget([['img']])).toBe('img');
    expect(formatTarget([['iframe#app'], ['#host', 'button']])).toBe(
      'iframe#app → #host >>> button',
    );
  });
});
