import type { NativeRule } from '../rule.js';
import { ariaHiddenFocus, roleValid } from './aria.js';
import { labelInName } from './label-in-name.js';
import { buttonName, formFieldName, iframeName, imageName, linkName } from './names.js';
import { documentTitle, elementLangValid, htmlHasLang, htmlLangValid } from './page.js';

export {
  ariaHiddenFocus,
  buttonName,
  documentTitle,
  elementLangValid,
  formFieldName,
  htmlHasLang,
  htmlLangValid,
  iframeName,
  imageName,
  labelInName,
  linkName,
  roleValid,
};

/** Every rule of the engine, in the order they run. */
export const RULES: readonly NativeRule[] = [
  imageName,
  buttonName,
  linkName,
  formFieldName,
  iframeName,
  htmlHasLang,
  htmlLangValid,
  elementLangValid,
  documentTitle,
  ariaHiddenFocus,
  roleValid,
  labelInName,
];
