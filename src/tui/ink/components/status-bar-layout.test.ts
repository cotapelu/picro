// SPDX-License-Identifier: Apache-2.0
/**
 * Status bar layout.
 *
 * The right-hand budget was computed from `left.length`, which counts ANSI
 * escape bytes, while the gap used the visible width: the model/thinking info
 * was truncated roughly nine columns too early on every render.
 */

import { describe, it, expect } from 'vitest';
import { composeStatusBarLine, truncateVisual, visibleTextWidth } from './status-bar-layout.js';

const ANSI = (text: string, code = '33') => `\x1b[${code}m${text}\x1b[39m`;

describe('visibleTextWidth', () => {
  it('ignores escape sequences', () => {
    expect(visibleTextWidth('plain')).toBe(5);
    expect(visibleTextWidth(ANSI('hello', '32'))).toBe(5);
    expect(visibleTextWidth(`${ANSI('ab')}cd`)).toBe(4);
  });

  it('handles an empty string', () => {
    expect(visibleTextWidth('')).toBe(0);
  });
});

describe('truncateVisual', () => {
  it('returns the text untouched when it fits', () => {
    expect(truncateVisual('abc', 5)).toBe('abc');
    expect(truncateVisual(ANSI('abc'), 3)).toBe(ANSI('abc'));
  });

  it('adds an ellipsis when it overflows', () => {
    expect(truncateVisual('abcdef', 4)).toBe('abc…');
  });

  it('measures columns, not escape bytes', () => {
    const text = ANSI('abcdefghij', '33'); // 10 visible columns
    expect(visibleTextWidth(truncateVisual(text, 5))).toBeLessThanOrEqual(5);
  });

  it('never returns more than maxWidth columns', () => {
    for (const width of [1, 2, 3, 5, 8, 13]) {
      expect(visibleTextWidth(truncateVisual(ANSI('hello world'), width))).toBeLessThanOrEqual(width);
    }
  });

  it('returns empty for a non-positive width', () => {
    expect(truncateVisual('abc', 0)).toBe('');
    expect(truncateVisual('abc', -3)).toBe('');
  });

  it('keeps escapes intact (no dangling introducer)', () => {
    const out = truncateVisual(`${ANSI('abcdefgh')}`, 3);
    // Either the escape survived whole, or nothing at all - never a lone ESC.
    expect(out).not.toMatch(/\x1b(?!\[[\d;]*m)/);
  });
});

describe('composeStatusBarLine', () => {
  it('keeps the whole right side when there is room', () => {
    const { left, right, gap } = composeStatusBarLine({
      left: '● Ready',
      rightParts: ['openai/gpt-5'],
      columns: 80,
    });
    expect(left).toBe('● Ready');
    expect(right).toBe('openai/gpt-5');
    expect(gap).toBeGreaterThanOrEqual(2);
    // The rendered line must fit the terminal.
    expect(visibleTextWidth(left) + gap + visibleTextWidth(right)).toBeLessThanOrEqual(80);
  });

  it('does not shrink the right side for the left side escape bytes', () => {
    // Regression: the budget came from left.length (escape included).
    const plain = composeStatusBarLine({ left: '● Ready', rightParts: ['model-a'], columns: 40 });
    const coloured = composeStatusBarLine({ left: ANSI('● Ready', '32'), rightParts: ['model-a'], columns: 40 });
    expect(visibleTextWidth(coloured.left)).toBe(visibleTextWidth(plain.left));
    expect(coloured.right).toBe(plain.right);
  });

  it('truncates the right side when the left side is long', () => {
    const { right } = composeStatusBarLine({
      left: 'x'.repeat(30),
      rightParts: ['model-name', 'think high'],
      columns: 40,
    });
    expect(right).not.toBe('model-name · think high');
    expect(visibleTextWidth(right)).toBeLessThanOrEqual(40 - 30 - 3);
    expect(right.endsWith('…')).toBe(true);
  });

  it('never emits a negative gap', () => {
    const { gap } = composeStatusBarLine({
      left: 'y'.repeat(200),
      rightParts: ['m'],
      columns: 40,
    });
    expect(gap).toBeGreaterThanOrEqual(2);
  });

  it('falls back to 80 columns for a non-positive width', () => {
    const { left, right } = composeStatusBarLine({ left: 'a', rightParts: ['b'], columns: 0 });
    expect(left).toBe('a');
    expect(right).toBe('b');
  });

  it('joins right parts with a separator', () => {
    const { right } = composeStatusBarLine({ left: 'l', rightParts: ['a', 'b', 'c'], columns: 80 });
    expect(right).toBe('a · b · c');
  });

  it('handles an empty right side', () => {
    const { right, gap } = composeStatusBarLine({ left: 'only left', rightParts: [], columns: 30 });
    expect(right).toBe('');
    expect(visibleTextWidth('only left') + gap).toBeLessThanOrEqual(30);
  });
});
