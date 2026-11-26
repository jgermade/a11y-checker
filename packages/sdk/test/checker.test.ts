import { describe, expect, it } from 'vitest';
import {
  check,
  ConfigError,
  createChecker,
  mergeConfig,
  VERSION,
  type CheckConfig,
  type EngineProvider,
} from '../src/index.js';

function render(html: string) {
  document.body.innerHTML = `<main id="fixture">${html}</main>`;
}

describe('check', () => {
  it('uses axe-core by default', async () => {
    render('<img src="a.png" id="no-alt"><button id="no-name"></button>');
    const result = await check({ include: ['#fixture'] });
    expect(result.engines.map((e) => e.id)).toEqual(['axe']);
    expect(result.issues.filter((i) => i.outcome === 'violation').map((i) => i.ruleId)).toEqual([
      'button-name',
      'image-alt',
    ]);
  });

  it('rejects an invalid config', async () => {
    await expect(check({ wcag: { level: 'X' } } as unknown as CheckConfig)).rejects.toThrow(
      ConfigError,
    );
  });
});

describe('createChecker', () => {
  it('validates the config at creation time', () => {
    expect(() => createChecker({ outcomes: [] })).toThrow(ConfigError);
  });

  it('merges per-check overrides over the base config', async () => {
    render('<img src="a.png"><button></button>');
    const seen: unknown[] = [];
    const spy: EngineProvider = {
      id: 'spy',
      version: '1',
      run: (_context, config) => {
        seen.push(config);
        return Promise.resolve([]);
      },
    };
    const checker = createChecker({
      engines: [spy],
      wcag: { version: '2.1', level: 'AA' },
      exclude: ['.ads'],
    });
    expect(checker.engines).toEqual([{ id: 'spy', version: '1' }]);

    await checker.check({ wcag: { level: 'AAA' } });
    expect(seen[0]).toMatchObject({ wcag: { version: '2.1', level: 'AAA' }, exclude: ['.ads'] });

    await checker.check();
    expect(seen[1]).toMatchObject({ wcag: { version: '2.1', level: 'AA' } });
  });

  it('checks another document when given one', async () => {
    const other = document.implementation.createHTMLDocument('other');
    const docs: Document[] = [];
    const spy: EngineProvider = {
      id: 'spy',
      version: '1',
      run: ({ document: doc }) => {
        docs.push(doc);
        return Promise.resolve([]);
      },
    };
    await createChecker({ engines: [spy], document: other }).check();
    expect(docs).toEqual([other]);
  });
});

describe('mergeConfig', () => {
  it('merges nested objects and replaces arrays', () => {
    expect(
      mergeConfig(
        { wcag: { version: '2.1' }, rules: { exclude: ['a'] }, include: ['main'] },
        { wcag: { level: 'A' }, rules: { include: ['b'] }, include: ['#app'] },
      ),
    ).toEqual({
      wcag: { version: '2.1', level: 'A' },
      rules: { exclude: ['a'], include: ['b'] },
      include: ['#app'],
    });
  });
});

describe('VERSION', () => {
  it('matches the package version', () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });
});

describe('check({ element })', () => {
  it('checks only the element and cleans up after itself', async () => {
    document.body.innerHTML =
      '<main><section id="form"><img src="a.png"><button></button></section><img src="b.png" id="outside"></main>';
    const section = document.getElementById('form');
    if (!section) throw new Error('missing');

    const result = await check({ element: section });
    const targets = result.issues.flatMap((i) => i.nodes.map((n) => n.target[0]?.join(' ')));
    expect(targets).toEqual(['button', 'img[src="a.png"]']);
    expect(targets).not.toContain('#outside');
    expect(
      result.issues.every((i) => i.nodes.every((n) => !n.html.includes('data-a11y-checker-scope'))),
    ).toBe(true);
    expect(section.hasAttribute('data-a11y-checker-scope')).toBe(false);
    expect(result.config.include).toEqual(['#form']);
  });

  it('rejects detached elements', async () => {
    await expect(check({ element: document.createElement('div') })).rejects.toThrow(
      'must be attached',
    );
  });
});
