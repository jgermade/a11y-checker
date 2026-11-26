// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  normalizeUrls,
  parseCliArgs,
  parseUrlList,
  reportFileName,
  toCheckConfig,
  UsageError,
} from '../src/index.js';

describe('parseCliArgs', () => {
  it('applies defaults', () => {
    expect(parseCliArgs(['https://example.com'])).toEqual({
      urls: ['https://example.com'],
      wcag: '2.2',
      level: 'AA',
      bestPractices: false,
      engines: ['axe'],
      include: [],
      exclude: [],
      disableRules: [],
      failOn: 'minor',
      format: 'text',
      incomplete: false,
      browser: 'chromium',
      timeout: 30000,
      help: false,
      version: false,
    });
  });

  it('parses every option', () => {
    const options = parseCliArgs([
      '--wcag=2.1',
      '--level',
      'aaa',
      '--best-practices',
      '--engines',
      'axe, ibm,axe',
      '--include',
      'main',
      '--include',
      '#app',
      '--exclude',
      '.ad',
      '--rules',
      'image-alt,label',
      '--disable-rules',
      'region',
      '--fail-on',
      'none',
      '--format',
      'sarif',
      '--output',
      'out.sarif',
      '--incomplete',
      '--urls',
      'urls.txt',
      '--browser',
      'firefox',
      '--timeout',
      '5000',
      '--wait-for',
      '#ready',
      'a.test',
      'b.test',
    ]);
    expect(options).toMatchObject({
      urls: ['a.test', 'b.test'],
      wcag: '2.1',
      level: 'AAA',
      bestPractices: true,
      engines: ['axe', 'ibm'],
      include: ['main', '#app'],
      exclude: ['.ad'],
      rules: ['image-alt', 'label'],
      disableRules: ['region'],
      failOn: null,
      format: 'sarif',
      output: 'out.sarif',
      incomplete: true,
      urlsFile: 'urls.txt',
      browser: 'firefox',
      timeout: 5000,
      waitFor: '#ready',
    });
    expect(toCheckConfig(options)).toEqual({
      wcag: { version: '2.1', level: 'AAA' },
      bestPractices: true,
      include: ['main', '#app'],
      exclude: ['.ad'],
      rules: { include: ['image-alt', 'label'], exclude: ['region'] },
    });
  });

  it.each([
    [['--wcag', '3.0'], '--wcag must be one of: 2.0, 2.1, 2.2 (got "3.0")'],
    [['--engines', 'pa11y'], '--engines must be one of: axe, ibm'],
    [['--engines', ','], '--engines needs at least one engine'],
    [['--fail-on', 'high'], '--fail-on must be one of'],
    [['--format', 'xml'], '--format must be one of'],
    [['--timeout', 'abc'], '--timeout must be a positive number'],
    [['--timeout=0'], '--timeout must be a positive number'],
    [['--nope'], "Unknown option '--nope'"],
  ])('rejects %j', (argv, message) => {
    expect(() => parseCliArgs(argv)).toThrow(UsageError);
    expect(() => parseCliArgs(argv)).toThrow(message);
  });
});

describe('URLs', () => {
  it('reads URL lists with comments and blank lines', () => {
    expect(parseUrlList('https://a.test/\n\n# comment\n  b.test  # trailing\r\n')).toEqual([
      'https://a.test/',
      'b.test',
    ]);
  });

  it('normalizes URLs and rejects invalid ones', () => {
    expect(
      normalizeUrls(['example.com/docs', 'http://localhost:3000', 'file:///tmp/a.html']),
    ).toEqual(['https://example.com/docs', 'http://localhost:3000/', 'file:///tmp/a.html']);
    expect(() => normalizeUrls(['ftp://example.com'])).toThrow('Unsupported URL scheme');
    expect(() => normalizeUrls(['http://'])).toThrow('Invalid URL');
  });

  it('derives report file names', () => {
    expect(reportFileName('https://example.com/docs/a page?x=1')).toBe(
      'example.com-docs-a-page.html',
    );
    expect(reportFileName('https://example.com/')).toBe('example.com.html');
  });
});
