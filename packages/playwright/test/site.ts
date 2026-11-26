import type { Page } from 'playwright';

const IMG = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
export const doc = (body: string, title = 'Test') =>
  `<!doctype html><html lang="en"><head><title>${title}</title></head><body>${body}</body></html>`;

export const PAGES: Record<string, { body: string; headers?: Record<string, string> }> = {
  'http://site.test/': {
    body: doc(`<main>
      <h1>Site</h1>
      <img id="main-img" src="${IMG}">
      <form id="form"><label>Name <input></label><button></button></form>
      <iframe id="cross" src="http://widget.test/" title="Widget"></iframe>
    </main>`),
  },
  'http://site.test/good': { body: doc('<main><h1>Good</h1><p>All fine.</p></main>') },
  // A strict CSP that blocks every script, including injected <script> tags.
  'http://site.test/csp': {
    body: doc(`<main><h1>CSP</h1><img id="csp-img" src="${IMG}"></main>`),
    headers: { 'content-security-policy': "default-src 'self'; script-src 'none'" },
  },
  'http://widget.test/': { body: doc(`<img id="cross-img" src="${IMG}">`, 'Widget') },
};

export async function serve(page: Page): Promise<void> {
  await page.route(/^http:\/\/(site|widget)\.test\//, (route) => {
    const entry = PAGES[route.request().url()];
    return entry
      ? route.fulfill({ contentType: 'text/html', body: entry.body, headers: entry.headers ?? {} })
      : route.fulfill({ status: 404, body: 'Not found' });
  });
}
