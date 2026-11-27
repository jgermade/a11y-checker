// Text contrast rules: minimum (afw4f7, AA) and enhanced (09o5cg, AAA) contrast.
//
// The colors come from computed styles, so the rules need a real layout engine. For
// each text node, the background is found by walking up the flat tree and stacking the
// backgrounds (with their alpha and the opacity of the elements) until an opaque one,
// or the white canvas. Gradients contribute every color stop, and a blurred text shadow
// becomes the background right behind the glyphs. Following the ACT rules, a text node
// passes when the highest possible contrast between its colors and those backgrounds
// meets the threshold.
import { roles, type ARIARoleDefinitionKey } from 'aria-query';
import {
  composedElements,
  flatParent,
  isHtmlElement,
  isVisibleText,
  semanticRole,
} from '../a11y.js';
import {
  COLOR_PATTERN,
  composite,
  contrastRatio,
  parseColor,
  toHex,
  WHITE,
  type Rgba,
} from '../color.js';
import { actUrl, defineRule, failed, passed, type Expectation, type NativeRule } from '../rule.js';

const styleOf = (element: Element) =>
  element.ownerDocument.defaultView?.getComputedStyle(element) ?? null;

// --- Text nodes ---

/** Text nodes that are children of an element in the flat tree. */
function flatTextChildren(element: Element): Text[] {
  const parent = element.shadowRoot ?? element;
  const texts: Text[] = [];
  for (const child of Array.from(parent.childNodes)) {
    if (child.nodeType === 3) texts.push(child as Text);
    // Slotted text belongs to the slot in the flat tree.
    if (child.nodeType === 1 && (child as Element).localName === 'slot') {
      for (const node of (child as HTMLSlotElement).assignedNodes({ flatten: true })) {
        if (node.nodeType === 3) texts.push(node as Text);
      }
    }
  }
  return texts;
}

/**
 * Whether the text expresses something in human language. Text without letters (such
 * as "----====" or "±") and a single letter used as a symbol (such as "X" for close)
 * do not.
 */
function isHumanLanguage(text: string): boolean {
  const letters = text.match(/\p{L}/gu) ?? [];
  if (letters.length === 0) return false;
  return !(letters.length === 1 && text.trim().length === 1);
}

// --- Disabled widgets and groups ---

const isWidgetRole = (() => {
  const cache = new Map<string, boolean>();
  const check = (role: string, seen: Set<string>): boolean => {
    if (role === 'widget') return true;
    if (seen.has(role)) return false;
    seen.add(role);
    const definition = roles.get(role as ARIARoleDefinitionKey);
    return (definition?.superClass ?? []).some((chain) => chain.some((p) => check(p, seen)));
  };
  return (role: string) => {
    let result = cache.get(role);
    if (result === undefined) {
      result = check(role, new Set());
      cache.set(role, result);
    }
    return result;
  };
})();

/** Groups whose disabled state applies to their content. */
const GROUP_ROLES = new Set(['group', 'radiogroup', 'toolbar', 'rowgroup', 'row']);

function isDisabledWidgetOrGroup(element: Element): boolean {
  const role = semanticRole(element) ?? '';
  if (!isWidgetRole(role) && !GROUP_ROLES.has(role) && element.localName !== 'fieldset') {
    return false;
  }
  return (
    element.matches(':disabled') ||
    element.getAttribute('aria-disabled')?.trim().toLowerCase() === 'true'
  );
}

/** Elements used in the accessible name of a disabled widget (labels). */
function disabledLabels(document: Document): Set<Element> {
  const labels = new Set<Element>();
  for (const element of composedElements(document)) {
    if (!isWidgetRole(semanticRole(element) ?? '') || !isDisabledWidgetOrGroup(element)) continue;
    for (const label of Array.from((element as HTMLInputElement).labels ?? [])) labels.add(label);
    const root = element.getRootNode() as Document | ShadowRoot;
    for (const id of (element.getAttribute('aria-labelledby') ?? '').split(/\s+/)) {
      const label = id ? root.getElementById(id) : null;
      if (label) labels.add(label);
    }
  }
  return labels;
}

function hasDisabledAncestor(element: Element, labels: Set<Element>): boolean {
  for (let current: Element | null = element; current; current = flatParent(current)) {
    if (labels.has(current) || isDisabledWidgetOrGroup(current)) return true;
  }
  return false;
}

// --- Colors ---

interface Colors {
  /** Text colors, already composited over each background. */
  pairs: { foreground: Rgba; background: Rgba }[];
}

const MAX_CANDIDATES = 16;

/** Every color of a background-image value (gradient color stops). */
function gradientColors(image: string, document: Document): Rgba[] {
  return (image.match(COLOR_PATTERN) ?? [])
    .map((color) => parseColor(color, document))
    .filter((color): color is Rgba => color !== null);
}

interface Layer {
  colors: Rgba[];
}

/** The possible background colors behind an element, from its flat ancestors. */
function backgroundsOf(element: Element, foregroundAlpha: { value: number }): Rgba[] {
  const document = element.ownerDocument;
  // Layers from the element up; each layer has one or more possible colors.
  const layers: Layer[] = [];
  for (let current: Element | null = element; current; current = flatParent(current)) {
    const style = styleOf(current);
    if (!style) continue;
    const added: Layer[] = [];
    const image = style.backgroundImage;
    if (image && image !== 'none' && image.includes('gradient(')) {
      const colors = gradientColors(image, document);
      if (colors.length > 0) added.push({ colors });
    }
    const color = parseColor(style.backgroundColor, document);
    if (color && color.a > 0) added.push({ colors: [color] });
    layers.push(...added);

    // Opacity makes the element's content (and its own background) see-through.
    const opacity = Number(style.opacity);
    if (Number.isFinite(opacity) && opacity < 1) {
      foregroundAlpha.value *= opacity;
      for (const layer of layers) {
        layer.colors = layer.colors.map((c) => ({ ...c, a: c.a * opacity }));
      }
    }
    const opaque = added.some((layer) => layer.colors.every((c) => c.a >= 1));
    if (opaque && foregroundAlpha.value >= 1) break;
  }

  // Composite from the bottom (the white canvas) up to the element.
  let candidates: Rgba[] = [WHITE];
  for (const layer of layers.reverse()) {
    const next: Rgba[] = [];
    for (const below of candidates) {
      for (const color of layer.colors) next.push(composite(color, below));
    }
    candidates = next.slice(0, MAX_CANDIDATES);
  }
  return candidates;
}

interface Shadow {
  color: Rgba;
  blur: number;
}

/** Parses a computed text-shadow value ("rgb(...) 1px 2px 3px, ..."). */
function textShadows(value: string, document: Document): Shadow[] {
  if (!value || value === 'none') return [];
  const shadows: Shadow[] = [];
  for (const part of value.split(/,(?![^(]*\))/)) {
    const colorText = part.match(COLOR_PATTERN)?.[0];
    const color = colorText ? parseColor(colorText, document) : null;
    const lengths = part
      .replace(COLOR_PATTERN, '')
      .trim()
      .split(/\s+/)
      .map((length) => Number.parseFloat(length))
      .filter((n) => Number.isFinite(n));
    if (color && color.a > 0) shadows.push({ color, blur: lengths[2] ?? 0 });
  }
  return shadows;
}

function textColors(parent: Element): Colors | null {
  const style = styleOf(parent);
  if (!style) return null;
  const document = parent.ownerDocument;
  const color = parseColor(style.color, document);
  if (!color) return null;
  const foregroundAlpha = { value: color.a };
  const backgrounds = backgroundsOf(parent, foregroundAlpha);
  const foreground = { ...color, a: foregroundAlpha.value };

  // A blurred text shadow surrounds the glyphs: it is the background they are read on.
  const shadows = textShadows(style.textShadow, document).filter((s) => s.blur > 0);
  const behind =
    shadows.length > 0
      ? backgrounds.flatMap((bg) => shadows.map((s) => composite(s.color, bg)))
      : backgrounds;
  return {
    pairs: behind.map((background) => ({
      foreground: composite(foreground, background),
      background,
    })),
  };
}

/** Large scale text: at least 18pt, or 14pt and bold. */
function isLargeText(parent: Element): boolean {
  const style = styleOf(parent);
  if (!style) return false;
  const px = Number.parseFloat(style.fontSize);
  const weight = Number.parseInt(style.fontWeight, 10) || (style.fontWeight === 'bold' ? 700 : 400);
  // Browsers round font sizes (14pt is 18.6667px), so compare with a small tolerance.
  const pt = (px * 72) / 96 + 0.01;
  return pt >= 18 || (pt >= 14 && weight >= 700);
}

function highestContrast(colors: Colors) {
  let best = { ratio: 0, foreground: WHITE, background: WHITE };
  for (const pair of colors.pairs) {
    const ratio = contrastRatio(pair.foreground, pair.background);
    if (ratio > best.ratio) best = { ratio, ...pair };
  }
  return best;
}

// --- Rules ---

interface Thresholds {
  normal: number;
  large: number;
}

/** The applicable text of an element: visible text nodes that are its flat children. */
function applicableTexts(element: Element, labels: Set<Element>): Text[] {
  if (!isHtmlElement(element)) return [];
  const texts = flatTextChildren(element).filter((text) => isVisibleText(text));
  if (texts.length === 0 || hasDisabledAncestor(element, labels)) return [];
  // Text in the same color as everything behind it is not visible.
  const colors = textColors(element);
  if (colors && highestContrast(colors).ratio <= 1.0001) return [];
  return texts;
}

function contrastExpectation(target: Element, thresholds: Thresholds): Expectation {
  const texts = flatTextChildren(target).filter((text) => isVisibleText(text));
  const text = texts.map((t) => t.data).join(' ');
  if (!isHumanLanguage(text)) {
    return passed('The text does not express anything in human language.');
  }
  const colors = textColors(target);
  if (!colors) return passed('The text colors could not be read.');
  const large = isLargeText(target);
  const required = large ? thresholds.large : thresholds.normal;
  const best = highestContrast(colors);
  const ratio = Math.floor(best.ratio * 100) / 100;
  const detail = `${toHex(best.foreground)} on ${toHex(best.background)}: ${ratio}:1, ${large ? 'large' : 'normal'} text needs ${required}:1`;
  return best.ratio >= required
    ? passed(`The text has enough contrast (${detail}).`)
    : failed(`The text does not have enough contrast (${detail}).`);
}

function* contrastTargets(document: Document): Generator<Element> {
  const labels = disabledLabels(document);
  for (const element of composedElements(document)) {
    if (applicableTexts(element, labels).length > 0) yield element;
  }
}

export const colorContrast: NativeRule = defineRule({
  id: 'color-contrast',
  actRuleIds: ['afw4f7'],
  wcag: ['1.4.3'],
  impact: 'serious',
  description: 'Text has a contrast ratio of at least 4.5:1 (3:1 for large text).',
  help: 'Darken or lighten the text or its background until the contrast is at least 4.5:1 (3:1 for large text)',
  helpUrl: actUrl('afw4f7'),
  applicability: ({ document }) => contrastTargets(document),
  expectation: (target) => contrastExpectation(target, { normal: 4.5, large: 3 }),
});

export const colorContrastEnhanced: NativeRule = defineRule({
  id: 'color-contrast-enhanced',
  actRuleIds: ['09o5cg'],
  wcag: ['1.4.6'],
  impact: 'serious',
  description: 'Text has a contrast ratio of at least 7:1 (4.5:1 for large text).',
  help: 'Darken or lighten the text or its background until the contrast is at least 7:1 (4.5:1 for large text)',
  helpUrl: actUrl('09o5cg'),
  applicability: ({ document }) => contrastTargets(document),
  expectation: (target) => contrastExpectation(target, { normal: 7, large: 4.5 }),
});
