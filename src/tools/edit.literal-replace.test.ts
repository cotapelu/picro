// SPDX-License-Identifier: Apache-2.0
/**
 * Regression tests: the edit tool must insert newString literally.
 *
 * String.prototype.replace() treats $&, $`, $', $1..$99 in the replacement as
 * substitution patterns even when the search value is a plain string, so any
 * edit containing those sequences silently produced different file content.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createEditToolDefinition } from './edit.js';

describe('edit tool - literal replacement', () => {
  let cwd: string;

  beforeEach(() => {
    cwd = mkdtempSync(join(tmpdir(), 'picro-edit-literal-'));
  });

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true });
  });

  it('inserts dollar-backtick and dollar-quote sequences literally', async () => {
    const file = join(cwd, 'a.txt');
    writeFileSync(file, 'PRICE');

    const tool = createEditToolDefinition(cwd);
    const result = await tool.execute({ path: 'a.txt', oldString: 'PRICE', newString: 'cost: $&' });

    expect(result.changed).toBe(true);
    expect(readFileSync(file, 'utf8')).toBe('cost: $&');
  });

  it('inserts dollar-backtick and dollar-quote sequences literally', async () => {
    const file = join(cwd, 'b.txt');
    writeFileSync(file, 'XX');

    const tool = createEditToolDefinition(cwd);
    const replacement = ["$`", "and", "$'"].join(' ');
    await tool.execute({ path: 'b.txt', oldString: 'XX', newString: replacement });

    expect(readFileSync(file, 'utf8')).toBe("$` and $'");
  });

  it('does not interpret numbered group references', async () => {
    const file = join(cwd, 'c.txt');
    writeFileSync(file, 'XX');

    const tool = createEditToolDefinition(cwd);
    await tool.execute({ path: 'c.txt', oldString: 'XX', newString: 'a$1b$2c' });

    expect(readFileSync(file, 'utf8')).toBe('a$1b$2c');
  });

  it('replaces only the first occurrence, as documented', async () => {
    const file = join(cwd, 'd.txt');
    writeFileSync(file, 'x x x');

    const tool = createEditToolDefinition(cwd);
    await tool.execute({ path: 'd.txt', oldString: 'x', newString: 'y' });

    expect(readFileSync(file, 'utf8')).toBe('y x x');
  });

  it('reports unchanged when oldString is missing', async () => {
    const file = join(cwd, 'e.txt');
    writeFileSync(file, 'abc');

    const tool = createEditToolDefinition(cwd);
    const result = await tool.execute({ path: 'e.txt', oldString: 'zzz', newString: 'q' });

    expect(result.changed).toBe(false);
    expect(readFileSync(file, 'utf8')).toBe('abc');
  });

  it('dryRun does not touch the file', async () => {
    const file = join(cwd, 'f.txt');
    writeFileSync(file, 'abc');

    const tool = createEditToolDefinition(cwd);
    const result = await tool.execute({ path: 'f.txt', oldString: 'abc', newString: 'xyz', dryRun: true });

    expect(result.dryRun).toBe(true);
    expect(readFileSync(file, 'utf8')).toBe('abc');
  });
});
