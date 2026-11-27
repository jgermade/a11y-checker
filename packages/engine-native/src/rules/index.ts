import type { NativeRule } from '../rule.js';
import { ariaHiddenFocus, roleValid } from './aria.js';
import { ariaAllowedAttr, ariaRequiredAttr, ariaValidAttrValue } from './aria-attributes.js';
import { autocompleteValid, headingName } from './content.js';
import { labelInName } from './label-in-name.js';
import { metaRefresh, metaRefreshNoException, metaViewport } from './meta.js';
import { buttonName, formFieldName, iframeName, imageName, linkName } from './names.js';
import { documentTitle, elementLangValid, htmlHasLang, htmlLangValid } from './page.js';

export {
  ariaAllowedAttr,
  ariaHiddenFocus,
  ariaRequiredAttr,
  ariaValidAttrValue,
  autocompleteValid,
  buttonName,
  documentTitle,
  elementLangValid,
  formFieldName,
  headingName,
  htmlHasLang,
  htmlLangValid,
  iframeName,
  imageName,
  labelInName,
  linkName,
  metaRefresh,
  metaRefreshNoException,
  metaViewport,
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
  ariaRequiredAttr,
  ariaAllowedAttr,
  ariaValidAttrValue,
  labelInName,
  headingName,
  autocompleteValid,
  metaViewport,
  metaRefresh,
  metaRefreshNoException,
];
