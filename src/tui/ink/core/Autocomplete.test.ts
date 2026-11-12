// SPDX-License-Identifier: Apache-2.0
/**
 * Autocomplete: slash commands and file paths.
 *
 * applyCompletion() decided a completion was a slash command by checking that
 * nothing but whitespace preceded the prefix, so a command typed mid-line lost
 * its "/" ("run /he" + help completed to "run help ").
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CombinedAutocompleteProvider } from './Autocomplete.js';

const COMMANDS = [
  { name: 'help', description: 'Show help' },
  { name: 'model', description: 'Select model', argumentHint: '<id>' },
  { name: 'tree', description: 'Navigate session tree' },
];

let basePath: string;

beforeEach(() => {
  basePath = mkdtempSync(join(tmpdir(), 'picro-ac-'));
  mkdirSync(join(basePath, 'src'), { recursive: true });
  mkdirSync(join(basePath, 'docs'), { recursive: true });
  writeFileSync(join(basePath, 'README.md'), 'x');
  writeFileSync(join(basePath, 'src', 'index.ts'), 'x');
  writeFileSync(join(basePath, 'src', 'agent.ts'), 'x');
});

afterEach(() => {
  rmSync(basePath, { recursive: true, force: true });
});

const never = new AbortController().signal;

function provider() {
  return new CombinedAutocompleteProvider(COMMANDS, basePath);
}

describe('slash command completion', () => {
  it('suggests commands matching the typed prefix', async () => {
    const p = provider();
    const result = await p.getSuggestions(['/he'], 0, 3, { signal: never });
    expect(result?.items.map((i) => i.value)).toEqual(['help']);
  });

  it('suggests every command for an empty prefix', async () => {
    const p = provider();
    const result = await p.getSuggestions(['/'], 0, 1, { signal: never });
    expect(result?.items.map((i) => i.value).sort()).toEqual(['help', 'model', 'tree']);
  });

  it('returns null when nothing matches', async () => {
    const p = provider();
    const result = await p.getSuggestions(['/zzz'], 0, 4, { signal: never });
    expect(result).toBeNull();
  });

  it('does not complete a slash command once an argument has started', async () => {
    const p = provider();
    const result = await p.getSuggestions(['/model '], 0, 7, { signal: never });
    // "/model " has a space, so the slash branch is skipped entirely.
    expect(result?.items.some((i) => i.value === 'model')).toBe(false);
  });

  it('returns null for an aborted signal', async () => {
    const p = provider();
    const controller = new AbortController();
    controller.abort();
    expect(await p.getSuggestions(['/he'], 0, 3, { signal: controller.signal })).toBeNull();
  });
});

describe('applyCompletion - slash commands', () => {
  it('keeps leading whitespace and appends a space', () => {
    const p = provider();
    const result = p.applyCompletion(['  /he'], 0, 5, { value: 'help', label: 'help' }, '/he');
    expect(result.lines[0]).toBe('  /help ');
    expect(result.cursorCol).toBe(8);
  });

  it('keeps the slash for a command typed mid-line', () => {
    const p = provider();
    const result = p.applyCompletion(['run /he'], 0, 7, { value: 'help', label: 'help' }, '/he');
    expect(result.lines[0]).toBe('run /help ');
    expect(result.cursorCol).toBe('run /help '.length);
  });

  it('preserves text after the cursor', () => {
    const p = provider();
    const result = p.applyCompletion(['/h| done'], 0, 2, { value: 'help', label: 'help' }, '/h');
    expect(result.lines[0]).toBe('/help | done');
  });
});

describe('path completion', () => {
  it('lists directory entries, directories first', async () => {
    const p = provider();
    const result = await p.getSuggestions([''], 0, 0, { signal: never, force: true });
    const labels = result?.items.map((i) => i.label) ?? [];
    expect(labels[0]).toBe('docs/');
    expect(labels[1]).toBe('src/');
    expect(labels).toContain('README.md');
  });

  it('filters by the typed filename prefix', async () => {
    const p = provider();
    const result = await p.getSuggestions(['src/ag'], 0, 6, { signal: never });
    expect(result?.items.map((i) => i.value)).toEqual(['src/agent.ts']);
  });

  it('suggests nothing for a prefix with no match', async () => {
    const p = provider();
    const result = await p.getSuggestions(['src/zzz'], 0, 7, { signal: never });
    expect(result).toBeNull();
  });

  it('applies a file completion with a trailing space', () => {
    const p = provider();
    const result = p.applyCompletion(['src/ag'], 0, 6, { value: 'src/agent.ts', label: 'agent.ts' }, 'src/ag');
    expect(result.lines[0]).toBe('src/agent.ts ');
    expect(result.cursorCol).toBe('src/agent.ts '.length);
  });

  it('applies a directory completion without a trailing space', () => {
    const p = provider();
    const result = p.applyCompletion(['sr'], 0, 2, { value: 'src/', label: 'src/' }, 'sr');
    expect(result.lines[0]).toBe('src/');
    expect(result.cursorCol).toBe(4);
  });

  it('does not treat a plain word as a path unless forced', async () => {
    const p = provider();
    // Not path-ish, so no suggestions...
    expect(await p.getSuggestions(['READ'], 0, 4, { signal: never })).toBeNull();
    // ...but forcing shows the matching entry.
    const forced = await p.getSuggestions(['READ'], 0, 4, { signal: never, force: true });
    expect(forced?.items.map((i) => i.value)).toEqual(['README.md']);
  });

  it('returns null when a forced prefix matches nothing', async () => {
    const p = provider();
    expect(await p.getSuggestions(['hello'], 0, 5, { signal: never, force: true })).toBeNull();
  });

  it('takes the token after the last separator', async () => {
    const p = provider();
    const result = await p.getSuggestions(['see docs/'], 0, 9, { signal: never });
    // "docs/" has no matching entry other than files inside it.
    const values = result?.items.map((i) => i.value) ?? [];
    expect(values.every((v) => v.startsWith('docs/'))).toBe(true);
  });
});
