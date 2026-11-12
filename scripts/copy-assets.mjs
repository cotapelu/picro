// SPDX-License-Identifier: Apache-2.0
/**
 * Copy non-TypeScript assets into dist/.
 *
 * `tsc` only emits .ts/.tsx sources, so the built-in theme JSON files
 * (src/tui/ink/theme/{dark,light}.json) never reached dist and
 * loadBuiltinTheme() threw ENOENT for every production user. Any *.json under
 * src/ is copied, preserving its relative path.
 */

import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const DIST = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist');

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

let copied = 0;
for (const file of walk(SRC)) {
  if (!file.endsWith('.json')) continue;
  const target = join(DIST, relative(SRC, file));
  mkdirSync(dirname(target), { recursive: true });
  cpSync(file, target);
  copied++;
}

if (!existsSync(DIST)) mkdirSync(DIST, { recursive: true });
console.log(`copy-assets: ${copied} json file(s) -> dist/`);

// Sanity check: the built-in themes must be present, otherwise the UI cannot
// render a single coloured string.
for (const theme of ['dark', 'light']) {
  const expected = join(DIST, 'tui', 'ink', 'theme', `${theme}.json`);
  if (!existsSync(expected)) {
    console.error(`copy-assets: MISSING ${expected}`);
    process.exit(1);
  }
}
