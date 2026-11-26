import { afterEach, describe, expect, it } from 'vitest';
import { getNodeTarget, resolveTarget } from '../src/index.js';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('getNodeTarget / resolveTarget', () => {
  it('uses a unique id when there is one', () => {
    document.body.innerHTML = '<main><img id="logo"></main>';
    const img = document.getElementById('logo');
    if (!img) throw new Error('missing');
    expect(getNodeTarget(img, document)).toEqual([['#logo']]);
    expect(resolveTarget(document, [['#logo']])).toBe(img);
  });

  it('builds an nth-of-type path otherwise, and round-trips', () => {
    document.body.innerHTML = '<main><p>a</p><p><span>x</span><span>y</span></p></main>';
    const span = document.querySelectorAll('span')[1];
    if (!span) throw new Error('missing');
    const target = getNodeTarget(span, document);
    expect(target).toEqual([['html > body > main > p:nth-of-type(2) > span:nth-of-type(2)']]);
    expect(resolveTarget(document, target)).toBe(span);
  });

  it('ignores duplicated ids and anchors on a unique ancestor id', () => {
    document.body.innerHTML =
      '<section id="a"><b id="dup"></b></section><section><b id="dup"></b></section>';
    const second = document.querySelectorAll('b')[0];
    if (!second) throw new Error('missing');
    const target = getNodeTarget(second, document);
    expect(target).toEqual([['#a > b']]);
    expect(resolveTarget(document, target)).toBe(second);
  });

  it('follows shadow roots', () => {
    document.body.innerHTML = '<div id="host"></div>';
    const root = document.getElementById('host')?.attachShadow({ mode: 'open' });
    if (!root) throw new Error('missing');
    root.innerHTML = '<div><button>a</button><button>b</button></div>';
    const button = root.querySelectorAll('button')[1];
    if (!button) throw new Error('missing');
    const target = getNodeTarget(button, document);
    expect(target).toEqual([['#host', 'div > button:nth-of-type(2)']]);
    expect(resolveTarget(document, target)).toBe(button);
  });

  it('uses the parent element of text nodes and html for documents', () => {
    document.body.innerHTML = '<p id="t">text</p>';
    const text = document.getElementById('t')?.firstChild;
    if (!text) throw new Error('missing');
    expect(getNodeTarget(text, document)).toEqual([['#t']]);
    expect(getNodeTarget(document, document)).toEqual([['html']]);
  });

  it('returns null for targets that do not resolve', () => {
    expect(resolveTarget(document, [['#nope']])).toBeNull();
    expect(resolveTarget(document, [['html'], ['img']])).toBeNull();
    expect(resolveTarget(document, [['::invalid(']])).toBeNull();
  });
});
