// SPDX-License-Identifier: Apache-2.0
/**
 * Comprehensive tests for diff atom
 */

import { describe, it, expect } from 'vitest';
import { Diff, parseDiffLine, wordDiff, renderDiff, diffDefaultTheme, type DiffLineType } from './diff';
import type { RenderContext } from '../core/base';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

describe('parseDiffLine', () => {
  it('should identify diff --git header', () => {
    const result = parseDiffLine('diff --git a/file b/file');
    expect(result?.type).toBe('header');
  });

  it('should identify --- and +++ headers', () => {
    expect(parseDiffLine('--- a/file').type).toBe('header');
    expect(parseDiffLine('+++ b/file').type).toBe('header');
  });

  it('should identify hunk header', () => {
    const line = '@@ -1,5 +1,6 @@';
    const result = parseDiffLine(line);
    expect(result?.type).toBe('hunk');
    expect(result?.oldNum).toBe(1);
    expect(result?.newNum).toBe(1);
  });

  it('should identify added lines', () => {
    const result = parseDiffLine('+new content');
    expect(result?.type).toBe('added');
    expect(result?.content).toBe('new content');
  });

  it('should identify removed lines', () => {
    const result = parseDiffLine('-old content');
    expect(result?.type).toBe('removed');
  });

  it('should identify context lines', () => {
    const result = parseDiffLine(' unchanged ');
    expect(result?.type).toBe('context');
    expect(result?.content).toBe('unchanged');
  });

  it('should return null for empty? Not used', () => {
    const result = parseDiffLine('random');
    expect(result?.type).toBe('context'); // defaults to context
  });
});

describe('wordDiff', () => {
  it('should identify additions wrapped in {inverse} tags', () => {
    const result = wordDiff('hello world', 'hello brave world');
    // The algorithm marks differences with {inverse}...{/inverse}
    // New words appear within {inverse} on the new side.
    expect(result.new).toContain('{inverse}');
    expect(result.new).toContain('brave');
  });

  it('should identify deletions wrapped in {inverse} tags', () => {
    const result = wordDiff('hello big world', 'hello world');
    expect(result.old).toContain('{inverse}');
    expect(result.old).toContain('big');
  });

  it('should handle identical lines', () => {
    const result = wordDiff('same', 'same');
    expect(result.old).toBe('same');
    expect(result.new).toBe('same');
  });
});

describe('Diff', () => {
  it('should create with diffText and default theme', () => {
    const diff = new Diff({ diffText: '--- a\n+++ b\n@@ -1 +1 @@\n-old\n+new' });
    expect(diff).toBeInstanceOf(Diff);
  });

  it('should render simple diff', () => {
    const diffText = '--- a\n+++ b\n@@ -1 +1 @@\n-old\n+new';
    const diff = new Diff({ diffText });
    const result = diff.draw(defaultContext);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should apply theme colors', () => {
    const diffText = '+added\n-removed';
    const customTheme = {
      ...diffDefaultTheme,
      addedColor: (s) => `\x1b[31m${s}\x1b[0m`, // red
      removedColor: (s) => `\x1b[32m${s}\x1b[0m`, // green
    };
    const diff = new Diff({ diffText, theme: customTheme });
    const result = diff.draw(defaultContext);
    expect(result.some(l => l.includes('\x1b[31m'))).toBe(true);
    expect(result.some(l => l.includes('\x1b[32m'))).toBe(true);
  });

  it('should include line numbers when showLineNumbers true', () => {
    const diff = new Diff({ diffText: '+added', showLineNumbers: true });
    const result = diff.draw(defaultContext);
    // prefix should contain numbers
    expect(result[0]).toMatch(/^\s*\d+\s+\d+/);
  });

  it('should cache result for same width', () => {
    const diff = new Diff({ diffText: '+test' });
    const r1 = diff.draw(defaultContext);
    const r2 = diff.draw(defaultContext);
    expect(r1).toBe(r2);
  });

  it('should clear cache on clearCache', () => {
    const diff = new Diff({ diffText: '+test' });
    diff.draw(defaultContext);
    diff.clearCache();
    expect((diff as any)['cachedLines']).toBeUndefined();
  });
});

describe('renderDiff helper', () => {
  it('should render diff and return lines', () => {
    const lines = renderDiff('+hello\n-world');
    expect(Array.isArray(lines)).toBe(true);
    expect(lines.length).toBeGreaterThan(0);
  });
});