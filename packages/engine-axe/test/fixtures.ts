/** Test pages. Each one is rendered inside `<main id="fixture">`. */
export const FIXTURES = {
  /** One violation per rule, plus content that passes. */
  basic: `
    <h1>Fixture</h1>
    <img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" id="no-alt">
    <img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" alt="A pixel" id="with-alt">
    <button id="no-name"></button>
    <button id="with-name">Save</button>
    <p id="low-contrast" style="color:#aaa;background:#fff">Low contrast text</p>
    <p id="aaa-contrast" style="color:#767676;background:#fff">Passes AA, fails AAA</p>
    <div class="ad"><img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" id="ad-no-alt"></div>
  `,
  /** A host element whose shadow root contains a button without a name. */
  shadow: `<div id="host"></div>`,
  /** A same-origin iframe; its content is written by `renderFrame`. */
  frame: `<iframe id="frame" title="Embedded content"></iframe>`,
} as const;

export function render(html: string): HTMLElement {
  document.getElementById('fixture')?.remove();
  document.documentElement.lang = 'en';
  document.title = 'Fixture';
  const main = document.createElement('main');
  main.id = 'fixture';
  main.innerHTML = html;
  document.body.appendChild(main);
  return main;
}

export function renderShadow(): void {
  render(FIXTURES.shadow);
  const host = document.getElementById('host');
  if (!host) throw new Error('missing #host');
  host.attachShadow({ mode: 'open' }).innerHTML = '<button></button>';
}

/** Renders an iframe with an image without `alt`, and loads axe-core inside it. */
export function renderFrame(axeSource: string): void {
  render(FIXTURES.frame);
  const frame = document.getElementById('frame') as HTMLIFrameElement;
  const doc = frame.contentDocument;
  if (!doc) throw new Error('missing iframe document');
  doc.documentElement.lang = 'en';
  doc.title = 'Frame';
  doc.body.innerHTML = '<img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" id="frame-no-alt">';
  // axe must run inside every frame it tests.
  const script = doc.createElement('script');
  script.textContent = axeSource;
  doc.head.appendChild(script);
}
