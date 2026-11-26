// The IBM engine in Chromium, alone and together with axe-core.
import { runCheck, type CheckConfig, type CheckResult } from '@a11y-checker/core';
import { createAxeEngine } from '@a11y-checker/engine-axe';
import { describe, expect, it } from 'vitest';
import { createIbmEngine } from '../src/index.js';

const IMG = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';

function render() {
  document.getElementById('fixture')?.remove();
  document.documentElement.lang = 'en';
  document.title = 'Fixture';
  const main = document.createElement('main');
  main.id = 'fixture';
  main.innerHTML = `
    <h1>Fixture</h1>
    <img src="${IMG}" id="no-alt">
    <img src="${IMG}" alt="ok">
    <p id="low" style="color:#aaa;background:#fff">Low contrast</p>
    <div id="host"></div>
    <iframe id="frame" title="Frame"></iframe>`;
  document.body.appendChild(main);
  const host = document.getElementById('host');
  host
    ?.attachShadow({ mode: 'open' })
    .append(Object.assign(document.createElement('img'), { src: IMG, id: 'shadow-img' }));
  const frameDoc = (document.getElementById('frame') as HTMLIFrameElement).contentDocument;
  if (frameDoc) {
    frameDoc.documentElement.lang = 'en';
    frameDoc.title = 'Frame';
    frameDoc.body.innerHTML = `<img src="${IMG}" id="frame-img">`;
  }
}

const check = (engines: Parameters<typeof runCheck>[0]['engines'], config: CheckConfig = {}) =>
  runCheck({ engines, config: { include: ['#fixture'], ...config } });

const nodesOf = (result: CheckResult, engine: string, ruleId: string) =>
  result.issues
    .find((i) => i.engine === engine && i.ruleId === ruleId && i.outcome === 'violation')
    ?.nodes.map((n) => [n.target, n.engines ?? [engine]]);

describe('IBM engine (Chromium)', () => {
  it('reports violations in the page, shadow DOM and same-origin frames', async () => {
    render();
    const result = await check([createIbmEngine()]);
    expect(result.errors).toEqual([]);
    expect(result.engines.map((e) => e.id)).toEqual(['ibm']);
    expect(result.engines[0]?.version).toMatch(/^\d+\.\d+/);
    expect(nodesOf(result, 'ibm', 'img_alt_valid')).toEqual([
      [[['#no-alt']], ['ibm']],
      [[['#host', '#shadow-img']], ['ibm']],
      [[['#frame'], ['#frame-img']], ['ibm']],
    ]);
    const contrast = result.issues.find((i) => i.ruleId === 'text_contrast_sufficient');
    expect(contrast?.wcag).toEqual(['1.4.3']);
    const imageAlt = result.issues.find((i) => i.ruleId === 'img_alt_valid');
    expect(imageAlt?.actRuleIds).toContain('23a2a8');
  });

  it('applies the include and exclude selectors', async () => {
    render();
    const result = await check([createIbmEngine()], { exclude: ['#host', '#frame'] });
    expect(nodesOf(result, 'ibm', 'img_alt_valid')).toEqual([[[['#no-alt']], ['ibm']]]);
  });

  it('merges duplicates with axe-core on the same elements', async () => {
    render();
    const engines = [createAxeEngine(), createIbmEngine()];
    const merged = await check(engines);
    expect(merged.errors).toEqual([]);

    // axe-core does not see the frame (it is not loaded there); IBM does.
    expect(nodesOf(merged, 'axe', 'image-alt')).toEqual([
      [[['#no-alt']], ['axe', 'ibm']],
      [[['#host', '#shadow-img']], ['axe', 'ibm']],
    ]);
    expect(nodesOf(merged, 'ibm', 'img_alt_valid')).toEqual([
      [[['#frame'], ['#frame-img']], ['ibm']],
    ]);
    const axeImage = merged.issues.find((i) => i.ruleId === 'image-alt');
    expect(axeImage?.relatedRules?.map((r) => `${r.engine}/${r.ruleId}`)).toEqual([
      'ibm/img_alt_valid',
    ]);
    expect(nodesOf(merged, 'axe', 'color-contrast')).toEqual([[[['#low']], ['axe', 'ibm']]]);
    expect(merged.issues.some((i) => i.ruleId === 'text_contrast_sufficient')).toBe(false);

    const separate = await check(engines, { dedupe: false });
    expect(separate.issues.length).toBeGreaterThan(merged.issues.length);
  });
});
