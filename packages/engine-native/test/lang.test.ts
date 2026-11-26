import { describe, expect, it } from 'vitest';
import { hasKnownPrimaryLanguage } from '../src/index.js';

describe('hasKnownPrimaryLanguage', () => {
  it.each([
    ['en', true],
    ['en-US', true],
    ['EN-gb', true],
    ['fr-CA', true],
    ['zh-Hant-TW', true],
    ['qaa', true], // private use
    ['  nl  ', true],
    ['english', false],
    ['xyz', false],
    ['', false],
    ['-en', false],
    ['e', false],
    ['en_US', false],
  ])('%j → %s', (value, expected) => {
    expect(hasKnownPrimaryLanguage(value)).toBe(expected);
  });
});
