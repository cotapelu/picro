// SPDX-License-Identifier: Apache-2.0
/**
 * Markdown line layout.
 *
 * The old clipLine() measured the ANSI-stripped line but sliced the RAW string.
 * Two consequences, both reproduced before the fix:
 *   - a coloured line lost ~5 of its 8 columns (escape bytes ate the budget),
 *   - the cut could land INSIDE an escape sequence, emitting a dangling
 *     "\\x1b[36" that corrupts terminal output.
 */

import { describe, it, expect } from 'vitest';
import {
  classifyMarkdownLine,
  clipMarkdownLine,
  padMarkdownLine,
  stripAnsiSequences,
} from './markdown-layout.js';
import { visibleWidth } from '../core/index.js';

const C = (text: string, code = "36") => `\x1b[${code}m${text}\x1b[39m`;

describe('classifyMarkdownLine', () => {
  it('classifies each markdown line kind', () => {
    expect(classifyMarkdownLine('# Title')).toBe('heading');
    expect(classifyMarkdownLine('###### Deep')).toBe('heading');
    expect(classifyMarkdownLine('   ### Indented')).toBe('heading');
    expect(classifyMarkdownLine('- bullet')).toBe('bullet');
    expect(classifyMarkdownLine('* star')).toBe('bullet');
    expect(classifyMarkdownLine('+ plus')).toBe('bullet');
    expect(classifyMarkdownLine('1. ordered')).toBe('ordered');
    expect(classifyMarkdownLine('12. twelve')).toBe('ordered');
    expect(classifyMarkdownLine('> quote')).toBe('quote');
    expect(classifyMarkdownLine('>no-space')).toBe('quote');
    expect(classifyMarkdownLine('---')).toBe('hr');
    expect(classifyMarkdownLine('***')).toBe('hr');
    expect(classifyMarkdownLine('plain text')).toBe('paragraph');
    expect(classifyMarkdownLine('#NoSpace')).toBe('paragraph');
  });

  it('classifies an empty line as a paragraph', () => {
    expect(classifyMarkdownLine('')).toBe('paragraph');
  });
});

describe('clipMarkdownLine', () => {
  it('leaves a short line untouched', () => {
    expect(clipMarkdownLine('abc', 10)).toBe('abc');
    expect(clipMarkdownLine(C('abc'), 3)).toBe(C('abc'));
  });

  it('clips a long plain line, reserving a column for the ellipsis', () => {
    // 10 visible columns into 5: four characters plus the ellipsis.
    expect(clipMarkdownLine('abcdefghij', 5)).toBe('abcd…');
    // A line that exactly fits is returned untouched, no ellipsis.
    expect(clipMarkdownLine('abcdef', 6)).toBe('abcdef');
  });

  it('spends the budget on visible columns, not escape bytes', () => {
    // Regression: the old version returned only 3 of 8 columns here.
    const out = clipMarkdownLine(C('some coloured text'), 8);
    expect(visibleWidth(out)).toBe(8);
    expect(out.startsWith('\x1b[36m')).toBe(true);
  });

  it('never cuts inside an escape sequence', () => {
    // Regression: the old version emitted a dangling "\x1b[36".
    for (const width of [1, 2, 3, 5, 8]) {
      const out = clipMarkdownLine(C('你好世界你好', '36'), width);
      expect(out).not.toMatch(/\x1b(?!\[[\d;]*m)/);
      expect(out).not.toMatch(/\x1b\[[0-9;]*$/);
    }
  });

  it('never returns more columns than requested', () => {
    for (const width of [1, 2, 3, 5, 8, 13]) {
      for (const text of ['plain text', C('plain text'), '你好世界', C('你好世界'), '😀😀😀x']) {
        expect(visibleWidth(clipMarkdownLine(text, width)), `${text} @${width}`).toBeLessThanOrEqual(width);
      }
    }
  });

  it('keeps whole graphemes', () => {
    const out = clipMarkdownLine('😀😀😀', 5);
    expect(out).toBe('😀😀…');
    expect(Buffer.from(out, 'utf8').toString('utf8')).toBe(out);
    expect(out).not.toContain('\uFFFD');
  });

  it('returns empty for a non-positive width', () => {
    expect(clipMarkdownLine('abc', 0)).toBe('');
    expect(clipMarkdownLine('abc', -1)).toBe('');
  });

  it('keeps escapes that precede the cut point', () => {
    const out = clipMarkdownLine(`${C('ab')}cdefghij`, 4);
    expect(out.startsWith('\x1b[36m')).toBe(true);
    expect(visibleWidth(out)).toBeLessThanOrEqual(4);
  });
});

describe('padMarkdownLine', () => {
  it('pads a plain line to the width', () => {
    expect(padMarkdownLine('abc', 6)).toBe('abc   ');
  });

  it('measures visible columns when padding', () => {
    const padded = padMarkdownLine(C('abc'), 8);
    expect(visibleWidth(padded)).toBe(8);
  });

  it('does not truncate a longer line', () => {
    expect(padMarkdownLine('abcdef', 3)).toBe('abcdef');
  });
});

describe('stripAnsiSequences', () => {
  it('removes colour escapes and keeps the text', () => {
    expect(stripAnsiSequences(C('hello'))).toBe('hello');
    expect(stripAnsiSequences('a\x1b[1mb\x1b[22mc')).toBe('abc');
  });

  it('leaves plain text untouched', () => {
    expect(stripAnsiSequences('no escapes')).toBe('no escapes');
  });
});
