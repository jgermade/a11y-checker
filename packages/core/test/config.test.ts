import { describe, expect, it } from 'vitest';
import { ConfigError, resolveConfig, type CheckConfig } from '../src/index.js';

describe('resolveConfig', () => {
  it('applies defaults', () => {
    expect(resolveConfig()).toEqual({
      wcag: { version: '2.2', level: 'AA' },
      rules: { include: null, exclude: [] },
      include: [],
      exclude: [],
      outcomes: ['violation', 'incomplete'],
      bestPractices: false,
    });
  });

  it('keeps valid values and removes duplicates', () => {
    const config = resolveConfig({
      wcag: { version: '2.1', level: 'AAA' },
      rules: { include: ['a', 'a', 'b'], exclude: ['c'] },
      include: ['main'],
      exclude: ['.ad'],
      outcomes: ['pass'],
      bestPractices: true,
    });
    expect(config.wcag).toEqual({ version: '2.1', level: 'AAA' });
    expect(config.rules).toEqual({ include: ['a', 'b'], exclude: ['c'] });
    expect(config.outcomes).toEqual(['pass']);
    expect(config.bestPractices).toBe(true);
  });

  it.each([
    [{ wcag: { version: '3.0' } }, "wcag.version must be one of '2.0', '2.1', '2.2'"],
    [{ wcag: { level: 'B' } }, 'wcag.level must be one of'],
    [{ outcomes: ['fail'] }, 'outcomes[0] must be one of'],
    [{ outcomes: [] }, 'outcomes must not be empty'],
    [{ include: 'main' }, 'include must be an array of non-empty strings'],
    [{ rules: { exclude: [''] } }, 'rules.exclude must be an array of non-empty strings'],
    [{ bestPractices: 'yes' }, 'bestPractices must be a boolean'],
  ])('rejects %j', (input, message) => {
    expect(() => resolveConfig(input as unknown as CheckConfig)).toThrow(ConfigError);
    expect(() => resolveConfig(input as unknown as CheckConfig)).toThrow(message);
  });
});
