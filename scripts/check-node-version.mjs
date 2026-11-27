// Fails with a clear message when the local Node is older than the root
// package.json "engines.node" minimum (for example, jsdom's undici needs 22.19).
import { readFileSync } from 'node:fs';

const { engines } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const minimum = engines.node.replace(/^>=\s*/, '');

const toParts = (version) => version.split('.').map((part) => Number.parseInt(part, 10) || 0);
const [current, required] = [toParts(process.versions.node), toParts(minimum)];

for (let i = 0; i < 3; i++) {
  if ((current[i] ?? 0) > (required[i] ?? 0)) break;
  if ((current[i] ?? 0) < (required[i] ?? 0)) {
    console.error(
      `error: Node ${minimum} or newer is required (current: ${process.versions.node}).\n` +
        'Update it, for example with "nvm install 22".',
    );
    process.exit(1);
  }
}
