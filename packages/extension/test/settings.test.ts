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
        engines: ['ibm', 'nope', 'axe'],
      }),
    ).toEqual({
      wcagVersion: '2.1',
      wcagLevel: 'AA',
      bestPractices: true,
      showIncomplete: true,
      groupBy: 'wcag',
      engines: ['axe', 'ibm'],
    });
  });

  it('never leaves the engine list empty', () => {
    expect(sanitizeSettings({ engines: [] }).engines).toEqual(['axe']);
    expect(sanitizeSettings({ engines: 'ibm' }).engines).toEqual(['axe']);
    expect(sanitizeSettings({ engines: ['ibm'] }).engines).toEqual(['ibm']);
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
