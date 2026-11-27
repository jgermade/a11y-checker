# @a11y-checker/engine-native

a11y-checker's own accessibility engine. Every rule implements a
[W3C ACT rule](https://www.w3.org/WAI/standards-guidelines/act/rules/) and is tested
against **all of that rule's official W3C test cases**. All 204 of them are consistent.
See [ACT-REPORT.md](ACT-REPORT.md) for a comparison with axe-core and IBM Equal Access on
the same test cases.

```ts
import { check, createAxeEngine } from '@a11y-checker/sdk';
import { createNativeEngine } from '@a11y-checker/engine-native';

// On its own, or next to axe-core: shared ACT rules merge into one issue.
const result = await check({ engines: [createAxeEngine(), createNativeEngine()] });
```

## Rules

| Rule                        | ACT rule                                                                                                                                       | WCAG         | Impact   |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | -------- |
| `image-name`                | [23a2a8](https://www.w3.org/WAI/standards-guidelines/act/rules/23a2a8/) Image has non-empty accessible name                                    | 1.1.1        | critical |
| `button-name`               | [97a4e1](https://www.w3.org/WAI/standards-guidelines/act/rules/97a4e1/) Button has non-empty accessible name                                   | 4.1.2        | critical |
| `link-name`                 | [c487ae](https://www.w3.org/WAI/standards-guidelines/act/rules/c487ae/) Link has non-empty accessible name                                     | 2.4.4, 4.1.2 | serious  |
| `form-field-name`           | [e086e5](https://www.w3.org/WAI/standards-guidelines/act/rules/e086e5/) Form field has non-empty accessible name                               | 4.1.2        | critical |
| `iframe-name`               | [cae760](https://www.w3.org/WAI/standards-guidelines/act/rules/cae760/) Iframe element has non-empty accessible name                           | 4.1.2        | serious  |
| `html-has-lang`             | [b5c3f8](https://www.w3.org/WAI/standards-guidelines/act/rules/b5c3f8/) HTML page has lang attribute                                           | 3.1.1        | serious  |
| `html-lang-valid`           | [bf051a](https://www.w3.org/WAI/standards-guidelines/act/rules/bf051a/) HTML page lang attribute has valid language tag                        | 3.1.1        | serious  |
| `element-lang-valid`        | [de46e4](https://www.w3.org/WAI/standards-guidelines/act/rules/de46e4/) Element with lang attribute has valid language tag                     | 3.1.2        | serious  |
| `document-title`            | [2779a5](https://www.w3.org/WAI/standards-guidelines/act/rules/2779a5/) HTML page has non-empty title                                          | 2.4.2        | serious  |
| `aria-hidden-focus`         | [6cfa84](https://www.w3.org/WAI/standards-guidelines/act/rules/6cfa84/) Element with aria-hidden has no content in sequential focus navigation | 1.3.1, 4.1.2 | serious  |
| `role-valid`                | [674b10](https://www.w3.org/WAI/standards-guidelines/act/rules/674b10/) Role attribute has valid value                                         | 4.1.2        | critical |
| `label-in-name`             | [2ee8b8](https://www.w3.org/WAI/standards-guidelines/act/rules/2ee8b8/) Visible label is part of accessible name                               | 2.5.3        | serious  |
| `aria-required-attr`        | [4e8ab6](https://www.w3.org/WAI/standards-guidelines/act/rules/4e8ab6/) Element with role attribute has required states and properties         | 4.1.2        | critical |
| `aria-allowed-attr`         | [5c01ea](https://www.w3.org/WAI/standards-guidelines/act/rules/5c01ea/) ARIA state or property is permitted                                    | 4.1.2        | critical |
| `aria-valid-attr-value`     | [6a7281](https://www.w3.org/WAI/standards-guidelines/act/rules/6a7281/) ARIA state or property has valid value                                 | 4.1.2        | critical |
| `heading-name`              | [ffd0e9](https://www.w3.org/WAI/standards-guidelines/act/rules/ffd0e9/) Heading has non-empty accessible name                                  | 1.3.1, 2.4.6 | moderate |
| `autocomplete-valid`        | [73f2c2](https://www.w3.org/WAI/standards-guidelines/act/rules/73f2c2/) Autocomplete attribute has valid value                                 | 1.3.5        | serious  |
| `meta-viewport`             | [b4f0c3](https://www.w3.org/WAI/standards-guidelines/act/rules/b4f0c3/) Meta viewport allows for zoom                                          | 1.4.4        | critical |
| `meta-refresh`              | [bc659a](https://www.w3.org/WAI/standards-guidelines/act/rules/bc659a/) Meta element has no refresh delay                                      | 2.2.1        | critical |
| `meta-refresh-no-exception` | [bisz58](https://www.w3.org/WAI/standards-guidelines/act/rules/bisz58/) Meta element has no refresh delay (no exception)                       | 2.2.4, 3.2.5 | minor    |

## Writing rules

Rules follow the structure of ACT rules: an **applicability**, which yields the test
targets, and an **expectation**, evaluated for each target.

```ts
import {
  createNativeEngine,
  defineRule,
  failed,
  passed,
  RULES,
  a11y,
} from '@a11y-checker/engine-native';

const noAutoplay = defineRule({
  id: 'video-no-autoplay',
  actRuleIds: [],
  wcag: ['1.4.2'],
  impact: 'serious',
  description: 'Videos do not start playing by themselves.',
  help: 'Remove the autoplay attribute or mute the video',
  *applicability({ document }) {
    for (const element of a11y.composedElements(document)) {
      if (element.localName === 'video') yield element;
    }
  },
  expectation: (video) =>
    video.hasAttribute('autoplay') && !video.hasAttribute('muted')
      ? failed('The video plays sound automatically.')
      : passed(),
});

const engine = createNativeEngine({ rules: [...RULES, noAutoplay] });
```

The `a11y` namespace provides the building blocks:

- `composedElements(root)` walks the tree through open shadow roots and same-origin
  iframes.
- `semanticRole(el)` returns the role, with ARIA's presentational conflict resolution.
- `accessibleName(el)` builds on `dom-accessibility-api`.
- `isProgrammaticallyHidden(el)`, `isVisible(el)`, `isVisibleText(text)` and
  `isInSequentialFocusNavigation(el)` answer visibility and focus questions.

A rule that throws reports its targets as "can't tell" and does not stop the other rules.

## ACT conformance

- `test/act/` holds the W3C ACT test cases of the implemented rules, refreshed with
  `pnpm fetch:act`. The test cases are © W3C, used under the
  [W3C Software and Document License](https://www.w3.org/copyright/software-license/).
- `test/act.e2e.test.ts` opens each test case as a **top-level page** in Chromium, at its
  original w3.org URL served from the local files with the network blocked, and requires
  every outcome to be consistent.
- `pnpm act:report` writes `act-report.earl.json` (the EARL implementation report) and
  `ACT-REPORT.md` (the benchmark).

Language tags are validated against the primary language subtags of the IANA Language
Subtag Registry, refreshed with `pnpm fetch:languages`.

## Heuristics and limitations

- **Non-text content in labels** (`label-in-name`): a label made of a single letter, such
  as "X" for close, is treated as a symbol. Text drawn with a known icon font (Material
  Icons and Symbols, Font Awesome, Glyphicons, IcoMoon, Ionicons, Bootstrap Icons) is
  treated as an icon.
- **Focus sentinels** (`aria-hidden-focus`): focusable elements inside `aria-hidden`
  content are focused for a moment to detect elements that hand focus elsewhere at once,
  as modal dialogs do. Focus is restored afterwards.
- **Visibility** checks use the browser's rendering (`checkVisibility`, boxes, common
  visually-hidden patterns). In simulated DOMs without layout, rules that need it are
  less precise.
- Cross-origin iframes are not reachable from the page. Pair the engine with axe-core,
  which checks them when it is loaded in every frame.

## License

MIT. Uses `dom-accessibility-api` (MIT) and `aria-query` (Apache-2.0).
