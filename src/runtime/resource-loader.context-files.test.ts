// SPDX-License-Identifier: Apache-2.0
/**
 * Context file discovery (AGENTS.md / CLAUDE.md).
 *
 * The loader used to look only at "<agentDir>/AGENTS.md" and "<cwd>/.pi/AGENTS.md",
 * so a project's own AGENTS.md at its root - the documented location, and the whole
 * reason --no-context-files exists - was never read. Nested packages in a monorepo
 * were ignored too, and a UTF-8 BOM leaked straight into the system prompt.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { loadProjectContextFiles } from './resource-loader.js';

let cwd: string;
let agentDir: string;

beforeEach(() => {
  cwd = mkdtempSync(join(tmpdir(), 'picro-ctx-cwd-'));
  agentDir = mkdtempSync(join(tmpdir(), 'picro-ctx-agent-'));
});

afterEach(() => {
  rmSync(cwd, { recursive: true, force: true });
  rmSync(agentDir, { recursive: true, force: true });
});

const load = () => loadProjectContextFiles({ cwd, agentDir });

describe('loadProjectContextFiles', () => {
  it('reads AGENTS.md in the project root', () => {
    writeFileSync(join(cwd, 'AGENTS.md'), '# root rules');
    const files = load();
    expect(files.map((f) => f.path)).toEqual([join(cwd, 'AGENTS.md')]);
    expect(files[0]!.content).toBe('# root rules');
  });

  it('reads CLAUDE.md too', () => {
    writeFileSync(join(cwd, 'CLAUDE.md'), 'claude rules');
    expect(load()[0]!.content).toBe('claude rules');
  });

  it('prefers AGENTS.override.md over AGENTS.md in the same directory', () => {
    writeFileSync(join(cwd, 'AGENTS.md'), 'plain');
    writeFileSync(join(cwd, 'AGENTS.override.md'), 'override');
    expect(load()[0]!.content).toBe('override');
  });

  it('collects ancestor files, nearest last', () => {
    const sub = join(cwd, 'sub');
    mkdirSync(sub, { recursive: true });
    writeFileSync(join(cwd, 'AGENTS.md'), 'parent rules');
    const files = loadProjectContextFiles({ cwd: sub, agentDir });
    expect(files.map((f) => f.content)).toEqual(['parent rules']);
  });

  it('orders global, then ancestors from the root down to cwd', () => {
    const deep = join(cwd, 'pkg', 'sub');
    mkdirSync(deep, { recursive: true });
    writeFileSync(join(agentDir, 'AGENTS.md'), 'global');
    writeFileSync(join(cwd, 'AGENTS.md'), 'repo');
    writeFileSync(join(cwd, 'pkg', 'AGENTS.md'), 'package');
    writeFileSync(join(deep, 'AGENTS.md'), 'cwd');

    const files = loadProjectContextFiles({ cwd: deep, agentDir });
    expect(files.map((f) => f.content)).toEqual(['global', 'repo', 'package', 'cwd']);
  });

  it('lists every discovered file exactly once', () => {
    const deep = join(cwd, 'pkg', 'sub');
    mkdirSync(deep, { recursive: true });
    writeFileSync(join(cwd, 'AGENTS.md'), 'repo');
    writeFileSync(join(deep, 'AGENTS.md'), 'cwd');

    const paths = loadProjectContextFiles({ cwd: deep, agentDir }).map((f) => f.path);
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths).toHaveLength(2);
  });

  it('strips a UTF-8 BOM', () => {
    writeFileSync(join(cwd, 'AGENTS.md'), '\uFEFF# rules');
    const content = load()[0]!.content;
    expect(content.charCodeAt(0)).not.toBe(0xfeff);
    expect(content).toBe('# rules');
  });

  it('ignores directories that merely match the name', () => {
    mkdirSync(join(cwd, 'AGENTS.md'), { recursive: true });
    expect(load()).toEqual([]);
  });

  it('returns an empty list when nothing exists', () => {
    expect(load()).toEqual([]);
  });
});
