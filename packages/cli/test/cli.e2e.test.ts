// Runs the built CLI against a local HTTP server.
import { execFile } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const CLI = fileURLToPath(new URL('../dist/cli.js', import.meta.url));
const IMG = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
const page = (body: string) =>
  `<!doctype html><html lang="en"><head><title>T</title></head><body><main><h1>T</h1>${body}</main></body></html>`;
const PAGES: Record<string, string> = {
  '/good': page('<p>Fine</p>'),
  // One serious violation only (contrast).
  '/serious': page('<p style="color:#aaa;background:#fff">Low contrast</p>'),
  '/bad': page(`<img src="${IMG}"><button></button>`),
  '/late': page(
    '<div id="app"></div><script>setTimeout(() => { document.getElementById("app").innerHTML = \'<img id="late" src="' +
      IMG +
      '">\'; }, 300)</script>',
  ),
};

let server: Server;
let base: string;
let dir: string;

beforeAll(async () => {
  server = createServer((req, res) => {
    const body = PAGES[req.url ?? ''];
    res.writeHead(body ? 200 : 404, { 'content-type': 'text/html' }).end(body ?? 'Not found');
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('no port');
  base = `http://127.0.0.1:${address.port}`;
  dir = await mkdtemp(join(tmpdir(), 'a11y-cli-'));
});

afterAll(async () => {
  server.close();
  await rm(dir, { recursive: true, force: true });
});

function run(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [CLI, ...args],
      { maxBuffer: 20 * 1024 * 1024 },
      (error, stdout, stderr) => {
        resolve({ code: error ? Number(error.code ?? 1) : 0, stdout, stderr });
      },
    );
  });
}

describe('a11y-checker CLI', () => {
  it('exits with 0 for accessible pages and 1 with violations', async () => {
    const good = await run([`${base}/good`]);
    expect(good.code).toBe(0);
    expect(good.stdout).toContain('0 violations, 0 to review');

    const bad = await run([`${base}/bad`]);
    expect(bad.code).toBe(1);
    expect(bad.stdout).toContain('2 violations (2 critical)');
    expect(bad.stdout).toContain('✖ [critical] axe/image-alt');
  });

  it('applies --fail-on', async () => {
    expect((await run([`${base}/serious`, '--fail-on', 'critical'])).code).toBe(0);
    expect((await run([`${base}/serious`, '--fail-on', 'serious'])).code).toBe(1);
    expect((await run([`${base}/bad`, '--fail-on', 'none'])).code).toBe(0);
  });

  it('writes JSON for one URL and an array for several', async () => {
    const one = await run([`${base}/bad`, '--format', 'json']);
    expect(JSON.parse(one.stdout)).toMatchObject({
      url: `${base}/bad`,
      summary: { outcomes: { violation: 2 } },
    });

    const urls = join(dir, 'urls.txt');
    await writeFile(urls, `# pages\n${base}/good\n${base}/bad\n`);
    const many = await run(['--urls', urls, '--format', 'json', '--fail-on', 'none']);
    expect((JSON.parse(many.stdout) as { url: string }[]).map((r) => r.url)).toEqual([
      `${base}/good`,
      `${base}/bad`,
    ]);
  });

  it('merges SARIF runs into one file', async () => {
    const output = join(dir, 'report.sarif');
    const result = await run([
      `${base}/good`,
      `${base}/bad`,
      '--format',
      'sarif',
      '--output',
      output,
    ]);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain(`Wrote ${output}`);
    const sarif = JSON.parse(await readFile(output, 'utf8')) as {
      version: string;
      runs: { artifacts: { location: { uri: string } }[]; results: unknown[] }[];
    };
    expect(sarif.version).toBe('2.1.0');
    expect(sarif.runs.map((r) => [r.artifacts[0]?.location.uri, r.results.length])).toEqual([
      [`${base}/good`, 0],
      [`${base}/bad`, 2],
    ]);
  });

  it('writes one HTML report per URL into a directory', async () => {
    const output = join(dir, 'html');
    expect((await run([`${base}/good`, `${base}/bad`, '--format', 'html'])).code).toBe(2);
    const result = await run([
      `${base}/good`,
      `${base}/bad`,
      '--format',
      'html',
      '--output',
      output,
    ]);
    expect(result.code).toBe(1);
    expect((await readdir(output)).sort()).toEqual(['127.0.0.1-bad.html', '127.0.0.1-good.html']);
  });

  it('runs every engine and waits for a selector', async () => {
    const all = await run([`${base}/bad`, '--engines', 'axe,ibm,native', '--format', 'json']);
    const result = JSON.parse(all.stdout) as { engines: { id: string }[] };
    expect(result.engines.map((e) => e.id)).toEqual(['axe', 'ibm', 'native']);

    const late = await run([`${base}/late`, '--wait-for', '#late']);
    expect(late.code).toBe(1);
    expect(late.stdout).toContain('#late');
  });

  it('exits with 2 on usage errors and unreachable pages', async () => {
    const usage = await run(['--level', 'X', `${base}/good`]);
    expect(usage.code).toBe(2);
    expect(usage.stderr).toContain('--level must be one of');
    expect((await run([])).stderr).toContain('No URL to check');

    const unreachable = await run(['http://127.0.0.1:1/', `${base}/good`, '--timeout', '5000']);
    expect(unreachable.code).toBe(2);
    expect(unreachable.stderr).toContain('http://127.0.0.1:1/');
    expect(unreachable.stdout).toContain(`${base}/good`); // the other page is still reported
  });

  it('prints help and version', async () => {
    const help = await run(['--help']);
    expect(help.code).toBe(0);
    expect(help.stdout).toContain('Usage: a11y-checker [options] <url...>');
    expect((await run(['-v'])).stdout).toMatch(/^\d+\.\d+\.\d+\n$/);
  });
});
