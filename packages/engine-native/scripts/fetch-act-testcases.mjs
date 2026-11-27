// Downloads the W3C ACT test cases of the rules this engine implements into
// test/act/. Run it again after adding a rule: `pnpm fetch:act`.
//
// The test cases are published by the W3C (ACT Rules Community Group) under the
// W3C Software and Document License: https://www.w3.org/copyright/software-license/
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = 'https://www.w3.org/WAI/content-assets/wcag-act-rules/';
const OUT = fileURLToPath(new URL('../test/act/', import.meta.url));

/** ACT rule IDs implemented by this engine. Keep in sync with src/rules. */
export const RULES = [
  '23a2a8',
  '97a4e1',
  'c487ae',
  'e086e5',
  'cae760',
  'b5c3f8',
  'bf051a',
  'de46e4',
  '2779a5',
  '6cfa84',
  '674b10',
  '2ee8b8',
  '5c01ea',
  '6a7281',
  '4e8ab6',
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Fetches politely: one request at a time, retrying with backoff when rate limited. */
async function fetchWithRetry(url) {
  for (let attempt = 0; ; attempt++) {
    await sleep(250);
    const response = await fetch(url);
    if (response.ok) return response;
    if (response.status !== 429 && response.status < 500)
      throw new Error(`${response.status} ${url}`);
    if (attempt === 6) throw new Error(`${response.status} ${url} (gave up)`);
    await sleep(2000 * 2 ** attempt);
  }
}

const get = async (url) => (await fetchWithRetry(url)).text();
const exists = (file) =>
  access(file).then(
    () => true,
    () => false,
  );

const index = JSON.parse(await get(`${BASE}testcases.json`));
const cases = index.testcases.filter((t) => RULES.includes(t.ruleId) && t.approved !== false);
const assets = new Set();

for (const testcase of cases) {
  const file = join(OUT, testcase.relativePath);
  // Resume: files already downloaded are kept.
  const html = (await exists(file)) ? await readFile(file, 'utf8') : await get(testcase.url);
  for (const [, asset] of html.matchAll(
    /["'(]\/WAI\/content-assets\/wcag-act-rules\/(test-assets\/[^"')\s]+)/g,
  )) {
    assets.add(asset);
  }
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, html);
}

// Test cases reference shared assets (stylesheets, images, frames) by absolute path.
for (const asset of assets) {
  const url = new URL(asset, BASE).href;
  const file = join(OUT, asset);
  if (await exists(file)) continue;
  try {
    const body = Buffer.from(await (await fetchWithRetry(url)).arrayBuffer());
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, body);
  } catch (error) {
    console.warn(`Skipped asset ${asset}: ${error.message}`);
  }
}

const manifest = cases.map((t) => ({
  ruleId: t.ruleId,
  ruleName: t.ruleName,
  testcaseId: t.testcaseId,
  testcaseTitle: t.testcaseTitle,
  expected: t.expected,
  path: t.relativePath,
  url: t.url,
}));
await writeFile(
  join(OUT, 'testcases.json'),
  `${JSON.stringify({ source: `${BASE}testcases.json`, license: index.license, testcases: manifest }, null, 2)}\n`,
);
console.log(`${manifest.length} test cases, ${assets.size} assets`);
