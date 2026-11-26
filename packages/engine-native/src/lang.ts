import { isPrivateUseLanguage, LANGUAGE_SUBTAGS } from './data/language-subtags.js';

/**
 * Whether a `lang` value has a known primary language subtag (IANA Language Subtag
 * Registry, Type: language), as the ACT rules require. `en`, `en-US` and `fr-CA` are
 * valid; `english`, `xyz` and `-en` are not.
 */
export function hasKnownPrimaryLanguage(value: string): boolean {
  const tag = value.trim();
  if (!tag) return false;
  const primary = tag.split('-')[0]?.toLowerCase() ?? '';
  if (!/^[a-z]{2,3}$/.test(primary)) return false;
  return LANGUAGE_SUBTAGS.has(primary) || isPrivateUseLanguage(primary);
}
