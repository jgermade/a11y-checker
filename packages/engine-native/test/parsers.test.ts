// Edge cases of the value parsers behind the meta and autocomplete rules. The W3C ACT
// test cases cover the rules end to end; these pin down the parsing details.
import { describe, expect, it } from 'vitest';
import { isValidAutocomplete } from '../src/rules/content.js';
import { parseViewport, refreshTime } from '../src/rules/meta.js';

describe('refreshTime (HTML shared declarative refresh steps)', () => {
  it.each([
    ['0', 0],
    ['5', 5],
    ['  30; url=https://example.com/', 30],
    ['72001', 72_001],
    ['1.5', 1],
    ['.5', 0],
    ['3,url=next.html', 3],
    ['10 url=next.html', 10],
  ])('reads %j as %d seconds', (content, time) => {
    expect(refreshTime(content)).toBe(time);
  });

  it.each(['', 'url=next.html', 'abc', '5x', '-1'])('treats %j as invalid', (content) => {
    expect(refreshTime(content)).toBeNull();
  });
});

describe('parseViewport', () => {
  it('reads key/value pairs separated by commas, semicolons or spaces', () => {
    const pairs = parseViewport('width=device-width, initial-scale = 1; USER-SCALABLE=No');
    expect(Object.fromEntries(pairs)).toEqual({
      width: 'device-width',
      'initial-scale': '1',
      'user-scalable': 'no',
    });
  });

  it('keeps the first value of a repeated key', () => {
    expect(parseViewport('maximum-scale=1, maximum-scale=5').get('maximum-scale')).toBe('1');
  });
});

describe('isValidAutocomplete', () => {
  it.each([
    'email',
    'EMAIL',
    'section-blue shipping street-address',
    'billing cc-number',
    'work email',
    'home tel-extension',
    'username webauthn',
    'section-x billing mobile tel webauthn',
  ])('accepts %j', (value) => {
    expect(isValidAutocomplete(value)).toBe(true);
  });

  it.each([
    'banner',
    'work name',
    'email work',
    'shipping section-blue street-address',
    'email email',
    'webauthn',
    'on email',
  ])('rejects %j', (value) => {
    expect(isValidAutocomplete(value)).toBe(false);
  });
});
