// Colors for the contrast rules: parsing computed CSS colors, alpha compositing and the
// WCAG contrast ratio.

export interface Rgba {
  r: number;
  g: number;
  b: number;
  /** 0 to 1. */
  a: number;
}

export const WHITE: Rgba = { r: 255, g: 255, b: 255, a: 1 };
const TRANSPARENT: Rgba = { r: 0, g: 0, b: 0, a: 0 };

const clamp = (value: number, max: number) => Math.min(max, Math.max(0, value));

/** Matches the color values that browsers serialize in computed styles. */
export const COLOR_PATTERN = /rgba?\([^)]*\)|color\(srgb[^)]*\)|transparent/g;

/**
 * Parses a computed color (`rgb()`, `rgba()`, `color(srgb ...)` or `transparent`).
 * Other notations (such as `oklch()`, kept by some browsers) are normalized through a
 * canvas when one is available. Returns `null` when the color cannot be read.
 */
export function parseColor(value: string, document?: Document): Rgba | null {
  const text = value.trim().toLowerCase();
  if (text === 'transparent') return { ...TRANSPARENT };
  const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/.exec(
    text,
  );
  if (rgb) {
    const [, r = '0', g = '0', b = '0', a] = rgb;
    return {
      r: clamp(Number(r), 255),
      g: clamp(Number(g), 255),
      b: clamp(Number(b), 255),
      a: alpha(a),
    };
  }
  const srgb =
    /^color\(srgb\s+([\d.e-]+)\s+([\d.e-]+)\s+([\d.e-]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/.exec(text);
  if (srgb) {
    const [, r = '0', g = '0', b = '0', a] = srgb;
    return {
      r: clamp(Number(r) * 255, 255),
      g: clamp(Number(g) * 255, 255),
      b: clamp(Number(b) * 255, 255),
      a: alpha(a),
    };
  }
  return paintedColor(text, document);
}

/** Any other valid CSS color, read back as sRGB from a 1×1 canvas. */
function paintedColor(text: string, document?: Document): Rgba | null {
  const css = document?.defaultView?.CSS;
  if (!css?.supports('color', text)) return null;
  const canvas = document?.createElement('canvas');
  if (!canvas) return null;
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;
  context.fillStyle = text;
  context.fillRect(0, 0, 1, 1);
  const [r = 0, g = 0, b = 0, a = 255] = context.getImageData(0, 0, 1, 1).data;
  return { r, g, b, a: a / 255 };
}

function alpha(value: string | undefined): number {
  if (value === undefined) return 1;
  const number = value.endsWith('%') ? Number(value.slice(0, -1)) / 100 : Number(value);
  return Number.isFinite(number) ? clamp(number, 1) : 1;
}

/** `top` drawn over `bottom` (source-over compositing). */
export function composite(top: Rgba, bottom: Rgba): Rgba {
  const a = top.a + bottom.a * (1 - top.a);
  if (a === 0) return { ...TRANSPARENT };
  const mix = (t: number, b: number) => (t * top.a + b * bottom.a * (1 - top.a)) / a;
  return { r: mix(top.r, bottom.r), g: mix(top.g, bottom.g), b: mix(top.b, bottom.b), a };
}

/** WCAG relative luminance of an opaque color. */
export function luminance({ r, g, b }: Rgba): number {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio between two opaque colors, from 1 to 21. */
export function contrastRatio(a: Rgba, b: Rgba): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

export const toHex = ({ r, g, b }: Rgba): string =>
  `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;
