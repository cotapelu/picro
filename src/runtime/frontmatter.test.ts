// SPDX-License-Identifier: Apache-2.0
/**
 * Shared frontmatter parser.
 *
 * The callers used to ship their own /^---\n...\n---\n/ implementations, which
 * lost the entire frontmatter for CRLF files, BOM-prefixed files and files whose
 * closing fence ends the file, and collapsed multi-line values to their marker.
 */

import { describe, it, expect } from 'vitest';
import { parseFrontmatter, stripFrontmatter, stripBom } from './frontmatter.js';

describe('parseFrontmatter', () => {
  it('parses simple key/value pairs', () => {
    const { frontmatter, body } = parseFrontmatter('---\nname: a\ndescription: b\n---\nbody text');
    expect(frontmatter).toEqual({ name: 'a', description: 'b' });
    expect(body).toBe('body text');
  });

  it('accepts a closing fence at EOF with no trailing newline', () => {
    const { frontmatter, body } = parseFrontmatter('---\nname: a\n---');
    expect(frontmatter).toEqual({ name: 'a' });
    expect(body).toBe('');
  });

  it('normalises CRLF and CR line endings', () => {
    expect(parseFrontmatter('---\r\nname: a\r\n---\r\nb').frontmatter).toEqual({ name: 'a' });
    expect(parseFrontmatter('---\rname: a\r---\rb').frontmatter).toEqual({ name: 'a' });
  });

  it('strips a UTF-8 BOM', () => {
    expect(parseFrontmatter('\uFEFF---\nname: a\n---\n').frontmatter).toEqual({ name: 'a' });
  });

  it('keeps colons inside a value', () => {
    expect(parseFrontmatter('---\ndescription: Use this: when needed\n---\n').frontmatter)
      .toEqual({ description: 'Use this: when needed' });
  });

  it('reads a block scalar across indented lines', () => {
    const { frontmatter } = parseFrontmatter('---\ndescription: |\n  one\n  two\n---\n');
    expect(frontmatter.description).toBe('one\ntwo');
  });

  it('reads a folded block scalar', () => {
    const { frontmatter } = parseFrontmatter('---\ndescription: >\n  one\n  two\n---\n');
    expect(frontmatter.description).toBe('one\ntwo');
  });

  it('coerces booleans and numbers', () => {
    expect(parseFrontmatter('---\nflag: true\noff: false\nn: 42\nf: 1.5\n---\n').frontmatter)
      .toEqual({ flag: true, off: false, n: 42, f: 1.5 });
  });

  it('unquotes values', () => {
    expect(parseFrontmatter('---\na: "x"\nb: \'y\'\n---\n').frontmatter).toEqual({ a: 'x', b: 'y' });
  });

  it('returns no frontmatter when the fences are missing', () => {
    const content = 'just a body';
    expect(parseFrontmatter(content)).toEqual({ frontmatter: {}, body: content });
  });

  it('returns no frontmatter when the fence never closes', () => {
    const content = '---\nname: a\n';
    expect(parseFrontmatter(content)).toEqual({ frontmatter: {}, body: content });
  });

  it('ignores stray lines without a key', () => {
    const { frontmatter } = parseFrontmatter('---\nname: a\njust a line\nother: b\n---\n');
    expect(frontmatter).toEqual({ name: 'a', other: 'b' });
  });
});

describe('stripFrontmatter', () => {
  it('returns only the body', () => {
    expect(stripFrontmatter('---\nname: a\n---\nbody')).toBe('body');
  });
});

describe('stripBom', () => {
  it('removes a leading BOM and keeps everything else', () => {
    expect(stripBom('\uFEFFabc')).toBe('abc');
    expect(stripBom('abc')).toBe('abc');
    expect(stripBom('')).toBe('');
  });
});

describe('prompt templates with hard-to-parse frontmatter', () => {
  it('loads a CRLF template', async () => {
    const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const { loadPromptTemplates } = await import('./prompt-templates.js');

    const dir = mkdtempSync(join(tmpdir(), 'picro-tpl-'));
    try {
      const promptsDir = join(dir, 'prompts');
      mkdirSync(promptsDir, { recursive: true });
      writeFileSync(
        join(promptsDir, 'crlf.md'),
        '---\r\nargument-hint: <file>\r\n---\r\nBody for $1\r\n',
      );

      const templates = loadPromptTemplates({
        cwd: dir,
        agentDir: dir,
        promptPaths: [promptsDir],
        includeDefaults: false,
      });
      expect(templates).toHaveLength(1);
      expect(templates[0]!.argumentHint).toBe('<file>');
      expect(templates[0]!.content).toBe('Body for $1');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
