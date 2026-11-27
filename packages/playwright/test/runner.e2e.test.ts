// Runs the @playwright/test project in test/project and inspects its JSON report.
import { execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { E2E_BROWSERS } from '../../../test-browsers.js';

const require = createRequire(import.meta.url);
const CLI = require.resolve('@playwright/test/cli');
const PROJECT = fileURLToPath(new URL('./project/', import.meta.url));

interface Report {
  suites: {
    specs: {
      title: string;
      ok: boolean;
      tests: {
        projectName: string;
        results: {
          status: string;
          error?: { message?: string };
          attachments: { name: string }[];
        }[];
      }[];
    }[];
  }[];
}

describe('@playwright/test integration', () => {
  it('extends expect, attaches reports and fails with details', async () => {
    const { stdout } = await promisify(execFile)(
      process.execPath,
      [CLI, 'test', '--config', `${PROJECT}playwright.config.ts`],
      { cwd: PROJECT, maxBuffer: 50 * 1024 * 1024 },
    ).catch((error: unknown) => {
      const { stdout = '', stderr = '' } = error as { stdout?: string; stderr?: string };
      throw new Error(`Playwright run failed:\n${stderr}\n${stdout.slice(0, 2000)}`);
    });
    const report = JSON.parse(stdout) as Report;
    const specs = report.suites.flatMap((s) => s.specs);
    expect(specs.map((s) => [s.title, s.ok])).toEqual([
      ['accessible page', true],
      ['page with violations', true],
      ['failing assertion', true],
    ]);

    // Every spec ran once per browser project.
    for (const spec of specs) {
      expect(spec.tests.map((t) => t.projectName).sort()).toEqual([...E2E_BROWSERS].sort());
    }

    for (const browser of E2E_BROWSERS) {
      const results = specs.map((s) => s.tests.find((t) => t.projectName === browser)?.results[0]);
      expect(
        results[0]?.attachments.map((a) => a.name),
        browser,
      ).toEqual(['accessibility-report.html', 'accessibility-report.json']);
      // The expected failure carries the formatted violations, from both engines.
      expect(results[2]?.status, browser).toBe('failed');
      expect(results[2]?.error?.message).toContain('Expected no accessibility violations');
      expect(results[2]?.error?.message).toContain('axe/image-alt');
    }
  });
});
