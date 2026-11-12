// SPDX-License-Identifier: Apache-2.0
/**
 * Extension entry-point resolution.
 *
 * loadExtension() used to import a directory verbatim when handed one and only
 * looked for a bare index.js, so:
 *   - a directory declaring its entries in package.json could never load
 *     (discovery resolved it correctly, loading ignored it), and
 *   - a directory with no entry point failed with a bare
 *     "Cannot find module '<dir>'".
 * Entry-point resolution is now shared between discovery and loading.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadExtension, resolveExtensionEntries } from './loader.js';
import { createExtensionRuntime } from './runner.js';

let cwd: string;

beforeEach(() => {
  cwd = mkdtempSync(join(tmpdir(), 'picro-ext-'));
});

afterEach(() => {
  rmSync(cwd, { recursive: true, force: true });
});

describe('resolveExtensionEntries', () => {
  it('prefers index.ts for development layouts', () => {
    const dir = join(cwd, 'a');
    mkdirSync(dir);
    writeFileSync(join(dir, 'index.ts'), '');
    writeFileSync(join(dir, 'index.js'), '');

    expect(resolveExtensionEntries(dir)).toEqual([join(dir, 'index.ts')]);
  });

  it('falls back to index.js', () => {
    const dir = join(cwd, 'b');
    mkdirSync(dir);
    writeFileSync(join(dir, 'index.js'), '');

    expect(resolveExtensionEntries(dir)).toEqual([join(dir, 'index.js')]);
  });

  it('uses package.json "pi.extensions" when present', () => {
    const dir = join(cwd, 'c');
    mkdirSync(dir);
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ pi: { extensions: ['./one.js', './two.js'] } }),
    );
    writeFileSync(join(dir, 'one.js'), '');
    writeFileSync(join(dir, 'two.js'), '');

    expect(resolveExtensionEntries(dir)).toEqual([join(dir, 'one.js'), join(dir, 'two.js')]);
  });

  it('ignores package.json entries that do not exist', () => {
    const dir = join(cwd, 'd');
    mkdirSync(dir);
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ pi: { extensions: ['./missing.js', './present.js'] } }),
    );
    writeFileSync(join(dir, 'present.js'), '');

    // Only the existing entry is returned, and the index fallback is not used.
    expect(resolveExtensionEntries(dir)).toEqual([join(dir, 'present.js')]);
  });

  it('returns null for a directory with no entry point', () => {
    const dir = join(cwd, 'e');
    mkdirSync(dir);
    writeFileSync(join(dir, 'README.md'), '');

    expect(resolveExtensionEntries(dir)).toBeNull();
  });

  it('ignores a malformed package.json instead of throwing', () => {
    const dir = join(cwd, 'f');
    mkdirSync(dir);
    writeFileSync(join(dir, 'package.json'), '{ not json');
    writeFileSync(join(dir, 'index.js'), '');

    expect(resolveExtensionEntries(dir)).toEqual([join(dir, 'index.js')]);
  });
});

describe('loadExtension - directory handling', () => {
  it('reports a clear error when a directory has no entry point', async () => {
    const extDir = join(cwd, 'empty');
    mkdirSync(extDir);
    writeFileSync(join(extDir, 'README.md'), 'nothing to load');

    await expect(
      loadExtension(extDir, cwd, undefined, createExtensionRuntime()),
    ).rejects.toThrow(new RegExp(`No extension entry point found in ${extDir}`));
  });
});
