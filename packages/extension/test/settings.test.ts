import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, sanitizeSettings, toCheckConfig } from '../src/lib/settings.js';

describe('sanitizeSettings', () => {
  it('returns defaults for missing or invalid storage', () => {
    expect(sanitizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings('nope')).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps valid fields and replaces invalid ones', () => {
    expect(
      sanitizeSettings({
        wcagVersion: '2.1',
        wcagLevel: 'Z',
        bestPractices: true,
        showIncomplete: 'yes',
        groupBy: 'wcag',
      }),
    ).toEqual({
      wcagVersion: '2.1',
      wcagLevel: 'AA',
      bestPractices: true,
      showIncomplete: true,
      groupBy: 'wcag',
    });
  });
});

describe('toCheckConfig', () => {
  it('maps settings to a check config', () => {
    expect(toCheckConfig(DEFAULT_SETTINGS)).toEqual({
      wcag: { version: '2.2', level: 'AA' },
      bestPractices: false,
      outcomes: ['violation', 'incomplete'],
    });
    expect(toCheckConfig({ ...DEFAULT_SETTINGS, showIncomplete: false }).outcomes).toEqual([
      'violation',
    ]);
  });
});
