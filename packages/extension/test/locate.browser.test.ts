import { afterEach, describe, expect, it, vi } from 'vitest';
import { inspectExpression, locateNode, OVERLAY_ID } from '../src/lib/locate.js';

function setup() {
  document.body.innerHTML = `
    <div style="height: 2000px"></div>
    <button id="far">Far</button>
    <div id="host"></div>
    <iframe id="frame" title="Frame" style="position:absolute;top:40px;left:60px;width:300px;height:200px;border:5px solid"></iframe>
  `;
  document
    .getElementById('host')
    ?.attachShadow({ mode: 'open' })
    .append(Object.assign(document.createElement('button'), { textContent: 'In shadow' }));
  const frame = document.getElementById('frame') as HTMLIFrameElement;
  const doc = frame.contentDocument;
  if (!doc) throw new Error('no frame document');
  doc.body.style.margin = '0';
  doc.body.innerHTML = '<p id="inner" style="margin:10px;width:50px;height:20px">Inner</p>';
}

const overlay = () => document.getElementById(OVERLAY_ID);

afterEach(() => {
  locateNode(null, 'highlight');
  document.body.innerHTML = '';
  window.scrollTo(0, 0);
});

describe('locateNode', () => {
  it('highlights a node and scrolls it into view', () => {
    setup();
    expect(locateNode([['#far']], 'highlight')).toBe(true);
    const rect = document.getElementById('far')?.getBoundingClientRect();
    expect(rect && rect.top >= 0 && rect.bottom <= window.innerHeight).toBe(true);
    expect(overlay()?.getAttribute('aria-hidden')).toBe('true');
    expect(overlay()?.getBoundingClientRect().top).toBeCloseTo(rect?.top ?? -1, 0);
  });

  it('follows shadow roots', () => {
    setup();
    expect(locateNode([['#host', 'button']], 'highlight')).toBe(true);
  });

  it('follows same-origin frames and offsets the overlay by the frame position', () => {
    setup();
    window.scrollTo(0, 0);
    expect(locateNode([['#frame'], ['#inner']], 'highlight')).toBe(true);
    const box = overlay()?.getBoundingClientRect();
    const frame = document.getElementById('frame')?.getBoundingClientRect();
    // frame position + 5px border + 10px margin
    expect(box?.left).toBeCloseTo((frame?.left ?? 0) + 15, 0);
    expect(box?.top).toBeCloseTo((frame?.top ?? 0) + 15, 0);
    expect(box?.width).toBeCloseTo(50, 0);
  });

  it('replaces the previous highlight and clears it with null', () => {
    setup();
    locateNode([['#far']], 'highlight');
    locateNode([['#host', 'button']], 'highlight');
    expect(document.querySelectorAll(`#${OVERLAY_ID}`)).toHaveLength(1);
    expect(locateNode(null, 'highlight')).toBe(false);
    expect(overlay()).toBeNull();
  });

  it('returns false when the node is gone', () => {
    setup();
    expect(locateNode([['#missing']], 'highlight')).toBe(false);
    expect(overlay()).toBeNull();
  });
});

describe('inspectExpression', () => {
  it('is a self-contained expression that calls inspect() with the node', () => {
    setup();
    const inspect = vi.fn();
    (globalThis as unknown as { inspect: typeof inspect }).inspect = inspect;
    // eslint-disable-next-line @typescript-eslint/no-implied-eval -- runs like devtools eval()
    const evaluate = new Function(
      `return ${inspectExpression([['#host', 'button']])}`,
    ) as () => boolean;
    const found = evaluate();
    expect(found).toBe(true);
    expect(inspect).toHaveBeenCalledWith(
      document.getElementById('host')?.shadowRoot?.querySelector('button'),
    );
  });
});
