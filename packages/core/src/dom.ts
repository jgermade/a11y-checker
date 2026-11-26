import type { NodeTarget } from './types.js';

// Duck-typed: nodes from other frames have their own ShadowRoot constructor.
const isShadowRoot = (node: Node): node is ShadowRoot => node.nodeType === 11 && 'host' in node;

function escapeIdent(value: string): string {
  const css = (globalThis as { CSS?: { escape?: (v: string) => string } }).CSS;
  if (css?.escape) return css.escape(value);
  return value.replace(/^(\d)/, '\\3$1 ').replace(/[^\w-]/g, (c) => `\\${c}`);
}

/** CSS selector for `element`, unique within its root (document or shadow root). */
function selectorWithin(element: Element, root: Document | ShadowRoot): string {
  const parts: string[] = [];
  let current: Element | null = element;
  while (current) {
    if (current.id) {
      const byId = `#${escapeIdent(current.id)}`;
      if (root.querySelectorAll(byId).length === 1) {
        parts.unshift(byId);
        break;
      }
    }
    const tag = current.localName;
    let part = escapeIdent(tag);
    const parent: Element | null = current.parentElement;
    const siblings = parent
      ? Array.from(parent.children)
      : Array.from(current.parentNode?.children ?? []);
    const sameTag = siblings.filter((s) => s.localName === tag);
    if (sameTag.length > 1) part += `:nth-of-type(${sameTag.indexOf(current) + 1})`;
    parts.unshift(part);
    current = parent;
  }
  return parts.join(' > ');
}

/**
 * Computes the `NodeTarget` of a node: CSS selectors per frame level and per shadow
 * root, outermost first. Text nodes use their parent element. Same-origin frames are
 * followed up to `top`; a document node maps to its `html` element.
 */
export function getNodeTarget(node: Node, top?: Document): NodeTarget {
  let element: Element | null =
    node.nodeType === 9
      ? (node as Document).documentElement
      : node.nodeType === 1
        ? (node as Element)
        : node.parentElement;
  const levels: NodeTarget = [];

  while (element) {
    const chain: string[] = [];
    let current: Element = element;
    for (;;) {
      const root = current.getRootNode();
      if (isShadowRoot(root)) {
        chain.unshift(selectorWithin(current, root));
        current = root.host;
        continue;
      }
      chain.unshift(selectorWithin(current, root as Document));
      break;
    }
    levels.unshift(chain);

    const doc = current.ownerDocument;
    if (doc === top) break;
    let frame: Element | null;
    try {
      frame = doc.defaultView?.frameElement ?? null;
    } catch {
      frame = null; // cross-origin parent
    }
    element = frame;
  }
  return levels;
}

/**
 * Finds the element a `NodeTarget` points to, following shadow roots and
 * same-origin frames. Returns `null` if any step cannot be resolved (for example, a
 * cross-origin frame).
 */
export function resolveTarget(doc: Document, target: NodeTarget): Element | null {
  let currentDoc: Document | null = doc;
  let element: Element | null = null;
  for (const [index, chain] of target.entries()) {
    if (!currentDoc) return null;
    let scope: Document | ShadowRoot = currentDoc;
    for (const [i, selector] of chain.entries()) {
      try {
        element = scope.querySelector(selector);
      } catch {
        return null; // invalid selector
      }
      if (!element) return null;
      if (i < chain.length - 1) {
        if (!element.shadowRoot) return null;
        scope = element.shadowRoot;
      }
    }
    if (index < target.length - 1) {
      try {
        currentDoc = (element as HTMLIFrameElement | null)?.contentDocument ?? null;
      } catch {
        currentDoc = null;
      }
    }
  }
  return element;
}
