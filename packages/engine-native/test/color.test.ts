// Color parsing, compositing and the WCAG contrast ratio behind the contrast rules.
import { describe, expect, it } from 'vitest';
import { composite, contrastRatio, parseColor, toHex, WHITE } from '../src/color.js';

describe('parseColor', () => {
  it.each([
    ['rgb(51, 51, 51)', { r: 51, g: 51, b: 51, a: 1 }],
    ['rgba(0, 0, 0, 0.3)', { r: 0, g: 0, b: 0, a: 0.3 }],
    ['rgb(0 0 0 / 50%)', { r: 0, g: 0, b: 0, a: 0.5 }],
    ['color(srgb 1 0 0)', { r: 255, g: 0, b: 0, a: 1 }],
    ['transparent', { r: 0, g: 0, b: 0, a: 0 }],
  ])('reads %s', (value, color) => {
    expect(parseColor(value)).toEqual(color);
  });
});

describe('contrastRatio', () => {
  it('matches known WCAG ratios', () => {
    expect(contrastRatio({ r: 0, g: 0, b: 0, a: 1 }, WHITE)).toBeCloseTo(21, 5);
    expect(contrastRatio(WHITE, WHITE)).toBe(1);
    // #777 on white is just below 4.5:1.
    expect(contrastRatio({ r: 0x77, g: 0x77, b: 0x77, a: 1 }, WHITE)).toBeCloseTo(4.48, 2);
  });
});

describe('composite', () => {
  it('blends a translucent color over an opaque one', () => {
    expect(toHex(composite({ r: 0, g: 0, b: 0, a: 0.3 }, WHITE))).toBe('#b3b3b3');
    expect(composite({ r: 10, g: 20, b: 30, a: 0 }, WHITE)).toEqual(WHITE);
  });
});
