// @vitest-environment node
// Checks a document that is not the global one, as described in the README.
import { runCheck } from '@a11y-checker/core';
import axeCore from 'axe-core';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { createAxeEngine, type AxeApi } from '../src/index.js';

describe('axe engine (jsdom window)', () => {
  it('checks a jsdom document with the axe instance loaded in that window', async () => {
    const { window } = new JSDOM(
      '<!doctype html><html lang="en"><head><title>T</title></head>' +
        '<body><main><img src="a.png"></main></body></html>',
      { runScripts: 'outside-only' },
    );
    window.eval(axeCore.source);
    const axe = (window as unknown as { axe: AxeApi }).axe;

    const result = await runCheck({
      engines: [createAxeEngine({ axe })],
      document: window.document,
    });

    expect(result.errors).toEqual([]);
    expect(result.url).toBe('about:blank');
    const imageAlt = result.issues.find((i) => i.ruleId === 'image-alt');
    expect(imageAlt?.nodes.map((n) => n.target)).toEqual([[['img']]]);
    window.close();
  });
});
