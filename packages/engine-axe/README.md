# @a11y-checker/engine-axe

An [axe-core](https://github.com/dequelabs/axe-core) engine provider for
[`@a11y-checker/core`](../core).

```ts
import { runCheck } from '@a11y-checker/core';
import { createAxeEngine } from '@a11y-checker/engine-axe';

const result = await runCheck({ engines: [createAxeEngine()] });
```

## How it works

- The WCAG target becomes axe tags (for example, 2.1 AA becomes `wcag2a`, `wcag2aa`,
  `wcag21a`, `wcag21aa`). With `bestPractices` enabled, the `best-practice` tag is added.
- WCAG criteria come from axe's tags (`wcag1410` becomes `1.4.10`). ACT rule IDs come from
  `axe.getRules()`.
- Node targets keep axe's frame and shadow DOM structure:
  `[['iframe#app'], ['#host', 'button']]`.
- Calls to the same axe instance are queued, because axe-core cannot run twice at the
  same time.
- To check iframes, axe-core must be loaded in every frame. The browser extension does
  this by injecting the engine into all frames.

## Other windows (jsdom, iframes)

The bundled axe-core checks the global `document`. To check another window, load axe in
that window and pass the instance:

```ts
import axeCore from 'axe-core';
import { JSDOM } from 'jsdom';

const { window } = new JSDOM(html, { runScripts: 'outside-only' });
window.eval(axeCore.source);
const result = await runCheck({
  engines: [createAxeEngine({ axe: window.axe })],
  document: window.document,
});
```

## License

MIT. axe-core is distributed under MPL-2.0.
