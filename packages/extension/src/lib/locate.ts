import type { NodeTarget } from '@a11y-checker/core';

export const OVERLAY_ID = 'a11y-checker-highlight';

/**
 * Finds the node for a target and highlights it, or opens it in the Elements panel.
 *
 * This function is serialized and run inside the inspected page, either by
 * `scripting.executeScript` (highlight) or by `devtools.inspectedWindow.eval`
 * (inspect, which needs the DevTools `inspect()` helper). It must therefore be
 * self-contained: no imports and no references to outer variables.
 *
 * Same-origin frames are followed. For a node inside a cross-origin frame, the
 * frame element itself is used, because its document is not reachable.
 *
 * Passing `null` only removes the current highlight.
 *
 * @returns whether a node was found.
 */
export function locateNode(target: NodeTarget | null, mode: 'highlight' | 'inspect'): boolean {
  const overlayId = 'a11y-checker-highlight';
  document.getElementById(overlayId)?.remove();
  if (!target || target.length === 0) return false;

  const resolveChain = (root: Document, chain: string[]): Element | null => {
    let scope: Document | ShadowRoot = root;
    let element: Element | null = null;
    for (const [index, selector] of chain.entries()) {
      element = scope.querySelector(selector);
      if (!element) return null;
      if (index < chain.length - 1) {
        if (!element.shadowRoot) return null;
        scope = element.shadowRoot;
      }
    }
    return element;
  };

  let doc: Document = document;
  let element: Element | null = null;
  const frames: HTMLIFrameElement[] = [];
  for (const [index, chain] of target.entries()) {
    const found = resolveChain(doc, chain);
    if (!found) break;
    element = found;
    if (index === target.length - 1) break;
    let inner: Document | null;
    try {
      inner = (found as HTMLIFrameElement).contentDocument;
    } catch {
      inner = null;
    }
    if (!inner) break;
    frames.push(found as HTMLIFrameElement);
    doc = inner;
  }
  if (!element) return false;

  if (mode === 'inspect') {
    (globalThis as unknown as { inspect: (node: Element) => void }).inspect(element);
    return true;
  }

  element.scrollIntoView({ block: 'center', inline: 'nearest' });
  const rect = element.getBoundingClientRect();
  let left = rect.left;
  let top = rect.top;
  for (const frame of frames) {
    const frameRect = frame.getBoundingClientRect();
    left += frameRect.left + frame.clientLeft;
    top += frameRect.top + frame.clientTop;
  }

  const overlay = document.createElement('div');
  overlay.id = overlayId;
  overlay.setAttribute('aria-hidden', 'true');
  Object.assign(overlay.style, {
    position: 'absolute',
    left: `${left + window.scrollX}px`,
    top: `${top + window.scrollY}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    boxSizing: 'border-box',
    outline: '3px solid #d93025',
    outlineOffset: '2px',
    background: 'rgba(217, 48, 37, 0.15)',
    pointerEvents: 'none',
    zIndex: '2147483647',
  });
  document.documentElement.appendChild(overlay);
  return true;
}

/** Builds a `devtools.inspectedWindow.eval()` expression that inspects the target. */
export function inspectExpression(target: NodeTarget): string {
  return `(${locateNode.toString()})(${JSON.stringify(target)}, "inspect")`;
}
