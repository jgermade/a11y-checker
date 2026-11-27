// Color notations that only a real browser normalizes (through a canvas).
import { describe, expect, it } from 'vitest';
import { parseColor } from '../src/color.js';

describe('parseColor in a browser', () => {
  it('normalizes other notations through a canvas', () => {
    const color = parseColor('oklch(0.628 0.2577 29.23)', document);
    expect(color).not.toBeNull();
    expect(color?.r).toBeGreaterThan(200);
    expect(parseColor('not a color', document)).toBeNull();
  });
});
