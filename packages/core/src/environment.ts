/**
 * Reports whether the given document computes layout.
 *
 * Simulated DOMs such as jsdom and happy-dom do not compute layout, so every
 * element reports a zero-sized bounding box. Rules that depend on rendering
 * (color contrast, visibility, target size) must check this before running.
 */
export function hasLayoutSupport(doc: Document = document): boolean {
  const body = doc.body as HTMLElement | null;
  if (!body) return false;

  const probe = doc.createElement('div');
  probe.style.cssText = 'position:absolute;top:0;left:0;width:10px;height:10px;visibility:hidden';
  body.appendChild(probe);
  try {
    const { width, height } = probe.getBoundingClientRect();
    return width > 0 && height > 0;
  } finally {
    probe.remove();
  }
}
