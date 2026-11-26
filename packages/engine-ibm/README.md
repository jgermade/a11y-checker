# @a11y-checker/engine-ibm

An [IBM Equal Access](https://github.com/IBMa/equal-access) (`accessibility-checker-engine`)
engine provider for [`@a11y-checker/core`](../core). Use it alone or next to axe-core:

```ts
import { check, createAxeEngine } from '@a11y-checker/sdk';
import { createIbmEngine } from '@a11y-checker/engine-ibm';

const result = await check({ engines: [createAxeEngine(), createIbmEngine()] });
```

With several engines, issues they both report on the same element are merged by default
(`dedupe`). The first engine in the list keeps the issue; the merged nodes list both
engines, and the issue lists the other engine's rule in `relatedRules`.

## How results are mapped

| IBM result                       | Outcome      | Impact     | WCAG                    |
| -------------------------------- | ------------ | ---------- | ----------------------- |
| `VIOLATION` + `FAIL`             | `violation`  | `serious`  | from the rule's mapping |
| `VIOLATION` + `POTENTIAL/MANUAL` | `incomplete` | `moderate` | from the rule's mapping |
| `RECOMMENDATION` + any           | as above     | `minor`    | none (best practice)    |
| `… + PASS`                       | `pass`       | —          |                         |
| `INFORMATION`                    | ignored      |            |                         |

- **Guideline:** `WCAG_2_0`, `WCAG_2_1` or `WCAG_2_2`, following `wcag.version`. With
  `bestPractices: true` it is `IBM_Accessibility`, a superset that includes
  recommendations. IBM's guidelines cover levels A and AA.
- **Targets** are computed from the real DOM nodes (`getNodeTarget`), through shadow roots
  and same-origin iframes. The IBM engine walks into same-origin iframes by itself.
  Cross-origin iframes are not reachable.
- **Help URLs** point to `https://able.ibm.com/rules/archives/latest/doc/en-US/<rule>.html`.
  ACT rule IDs come from the rules' `act` metadata.
- `include` and `exclude` selectors are applied to the results, crossing shadow roots and
  frames.

## Browser bundle

`@a11y-checker/engine-ibm/iife` is a self-contained script that defines
`window.A11yCheckerIbm.createIbmEngine`. Load it next to the SDK's bundle:

```ts
await page.addScriptTag({ path: require.resolve('@a11y-checker/sdk/iife') });
await page.addScriptTag({ path: require.resolve('@a11y-checker/engine-ibm/iife') });
await page.evaluate(() =>
  A11yChecker.check({
    engines: [A11yChecker.createAxeEngine(), A11yCheckerIbm.createIbmEngine()],
  }),
);
```

## License

MIT. `accessibility-checker-engine` is distributed under Apache-2.0.
