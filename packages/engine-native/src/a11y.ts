// Accessibility primitives the rules are built on. They work on any document (not
// only the global one) and through open shadow roots and same-origin iframes.
import { computeAccessibleName, getRole, isInaccessible } from 'dom-accessibility-api';

const HTML_NS = 'http://www.w3.org/1999/xhtml';
const SVG_NS = 'http://www.w3.org/2000/svg';

export const isHtmlElement = (element: Element): boolean => element.namespaceURI === HTML_NS;
export const isSvgElement = (element: Element): boolean => element.namespaceURI === SVG_NS;

const viewOf = (element: Element) => element.ownerDocument.defaultView;

function computedStyle(element: Element): CSSStyleDeclaration | null {
  return viewOf(element)?.getComputedStyle(element) ?? null;
}

/** The document of a same-origin iframe, or `null`. */
export function frameDocument(element: Element): Document | null {
  if (element.localName !== 'iframe' && element.localName !== 'frame') return null;
  try {
    return (element as HTMLIFrameElement).contentDocument;
  } catch {
    return null;
  }
}

export interface WalkOptions {
  /** Walk into same-origin iframes. Default: `true`. */
  frames?: boolean;
}

/**
 * Every element under `root`, in tree order, including the content of open shadow
 * roots (and of slotted light DOM) and, by default, of same-origin iframes.
 */
export function* composedElements(
  root: Document | Element | ShadowRoot,
  options: WalkOptions = {},
): Generator<Element> {
  const frames = options.frames ?? true;
  const stack: Element[] = [];
  const pushChildren = (parent: ParentNode) => {
    const children = Array.from(parent.children);
    for (let i = children.length - 1; i >= 0; i--) stack.push(children[i] as Element);
  };
  if (root.nodeType === 1) stack.push(root as Element);
  else pushChildren(root);

  while (stack.length > 0) {
    const element = stack.pop();
    if (!element) break;
    yield element;
    pushChildren(element);
    if (element.shadowRoot) pushChildren(element.shadowRoot);
    if (frames) {
      const doc = frameDocument(element);
      if (doc?.documentElement) stack.push(doc.documentElement);
    }
  }
}

/** Parent in the flat tree: the shadow host for shadow root children. */
export function flatParent(node: Node): Element | null {
  const parent = node.parentNode;
  if (!parent) return null;
  if (parent.nodeType === 11) return (parent as ShadowRoot).host;
  return parent.nodeType === 1 ? (parent as Element) : null;
}

/** Excluded from the accessibility tree (hidden, `aria-hidden`, `display: none`...). */
export function isProgrammaticallyHidden(element: Element): boolean {
  const view = viewOf(element);
  if (!view) return true;
  // <area> elements have no box of their own: they are exposed through the image
  // that uses their map.
  if (element.localName === 'area') {
    const map = element.closest('map');
    const name = map?.getAttribute('name');
    const image = name
      ? element.ownerDocument.querySelector(`img[usemap="#${CSS.escape(name)}"]`)
      : null;
    return !image || isProgrammaticallyHidden(image);
  }
  return isInaccessible(element, { getComputedStyle: view.getComputedStyle.bind(view) });
}

export const isIncludedInAccessibilityTree = (element: Element): boolean =>
  !isProgrammaticallyHidden(element);

const PRESENTATIONAL = new Set(['none', 'presentation']);

/** Focusable at all (by mouse, script or keyboard), ignoring disabled state. */
export const isFocusableElement = (element: Element): boolean =>
  (element.hasAttribute('tabindex') || isNativelyFocusable(element)) &&
  !element.matches(':disabled');

/**
 * The semantic role: the first valid explicit role, or the implicit one. Implements
 * the presentational role conflict resolution of WAI-ARIA: `none` and `presentation`
 * are ignored on focusable elements (and on elements with global ARIA attributes).
 */
export function semanticRole(element: Element): string | null {
  const role = getRole(element);
  if (role && PRESENTATIONAL.has(role) && isFocusableElement(element)) {
    const clone = element.cloneNode(false) as Element;
    clone.removeAttribute('role');
    return getRole(clone);
  }
  return role;
}

/** Roles whose name can come from their content. */
const NAME_FROM_CONTENT = new Set([
  'button',
  'link',
  'doc-backlink',
  'doc-biblioref',
  'doc-glossref',
  'doc-noteref',
  'menuitem',
  'tab',
  'option',
]);

/** Text alternative of a subtree, for the name-from-content fallback. */
function contentText(node: Node): string {
  if (node.nodeType === 3) return (node as Text).data;
  if (node.nodeType !== 1) return '';
  const element = node as Element;
  if (isProgrammaticallyHidden(element)) return '';
  const label = element.getAttribute('aria-label')?.trim();
  if (label) return label;
  if (element.localName === 'img' || element.localName === 'area') {
    return element.getAttribute('alt')?.trim() || element.getAttribute('title')?.trim() || '';
  }
  const children = element.shadowRoot ? element.shadowRoot.childNodes : element.childNodes;
  const inner = Array.from(children).map(contentText).join(' ');
  return inner.trim() ? inner : (element.getAttribute('title')?.trim() ?? '');
}

/**
 * The accessible name, with whitespace normalized and trimmed. Falls back to
 * `placeholder` for text fields, and to the content (including image titles) for
 * roles named from content that the underlying library does not handle, such as the
 * DPUB-ARIA link roles.
 */
export function accessibleName(element: Element): string {
  const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();
  const name = normalize(computeAccessibleName(element));
  if (name) return name;
  if (element.localName === 'input' || element.localName === 'textarea') {
    const placeholder = normalize(element.getAttribute('placeholder') ?? '');
    if (placeholder) return placeholder;
  }
  if (NAME_FROM_CONTENT.has(semanticRole(element) ?? '')) {
    return normalize(contentText(element));
  }
  return '';
}

/** Rendered: the element generates boxes (no `display: none` on it or its ancestors). */
export function isRendered(element: Element): boolean {
  const html = element as HTMLElement;
  if (typeof html.checkVisibility === 'function') return html.checkVisibility();
  for (let current: Element | null = element; current; current = flatParent(current)) {
    if (computedStyle(current)?.display === 'none') return false;
  }
  return true;
}

/**
 * Visible: rendered, not `visibility: hidden`, not fully transparent, and with a
 * non-empty box that is not clipped away or moved off-screen.
 */
export function isVisible(element: Element): boolean {
  const html = element as HTMLElement;
  if (typeof html.checkVisibility === 'function') {
    if (!html.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return false;
  } else if (!isRendered(element) || computedStyle(element)?.visibility === 'hidden') {
    return false;
  }
  if (element.getClientRects().length === 0) return false;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 1 && rect.height <= 1) return false;
  const style = computedStyle(element);
  if (
    style &&
    /inset\(\s*50%|rect\(\s*0(px)?[\s,]+0(px)?[\s,]+0(px)?[\s,]+0(px)?\s*\)/.test(
      `${style.clipPath} ${style.getPropertyValue('clip')}`,
    )
  ) {
    return false;
  }
  const view = viewOf(element);
  if (view && (rect.right + view.scrollX <= 0 || rect.bottom + view.scrollY <= 0)) return false;
  return true;
}

/** Whether a text node shows any visible, non-whitespace text. */
export function isVisibleText(text: Text): boolean {
  if (!text.data.trim()) return false;
  const parent = flatParent(text) ?? text.parentElement;
  if (!parent || !isVisible(parent)) return false;
  const style = computedStyle(parent);
  if (style && (style.color === 'transparent' || /rgba\([^)]*,\s*0\)$/.test(style.color))) {
    return false;
  }
  const range = text.ownerDocument.createRange();
  range.selectNodeContents(text);
  const rect = range.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

/** Text nodes under an element, in the flat tree (shadow content included). */
export function* flatTextNodes(element: Element): Generator<Text> {
  for (const el of composedElements(element, { frames: false })) {
    for (const child of Array.from(el.childNodes)) {
      if (child.nodeType === 3) yield child as Text;
    }
  }
}

/** Focusable and part of sequential focus navigation (reachable with Tab). */
export function isInSequentialFocusNavigation(element: Element): boolean {
  const html = element as HTMLElement;
  if (typeof html.tabIndex !== 'number' || html.tabIndex < 0) return false;
  // Elements that are not focusable at all still report tabIndex -1, except when
  // they have a tabindex attribute; natively focusable ones report 0.
  if (!html.hasAttribute('tabindex') && !isNativelyFocusable(element)) return false;
  // Only native disabling removes focus; aria-disabled does not.
  if (element.matches(':disabled') || element.closest('[inert]')) return false;
  if (!isRendered(element)) return false;
  return computedStyle(element)?.visibility !== 'hidden';
}

export function isNativelyFocusable(element: Element): boolean {
  switch (element.localName) {
    case 'a':
    case 'area':
      return element.hasAttribute('href');
    case 'button':
    case 'select':
    case 'textarea':
    case 'iframe':
      return true;
    case 'input':
      return (element as HTMLInputElement).type !== 'hidden';
    case 'summary':
      return (
        element.parentElement?.localName === 'details' &&
        element.parentElement.querySelector(':scope > summary') === element
      );
    case 'audio':
    case 'video':
      return element.hasAttribute('controls');
    default:
      return (element as HTMLElement).isContentEditable;
  }
}
