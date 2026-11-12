// SPDX-License-Identifier: Apache-2.0
/**
 * Image block layout.
 *
 * Image.tsx put the escape sequence on the first row for BOTH protocols and then
 * padded. Upstream is protocol-specific: Kitty draws on the first row and pads
 * after; iTerm2 pads first and draws on the last row after moving the cursor back
 * up. The old order drew the iTerm2 image one row too high and made the block
 * rows+1 lines tall, so the content below was overwritten.
 */

import { describe, it, expect } from 'vitest';
import {
  blankRowCount,
  imageLineWidth,
  isITerm2SequenceLast,
  isKittySequenceFirst,
  layoutImageBlock,
} from './image-layout.js';

const KITTY_SEQ = '\x1b_Ga=T,f=100;C=1;AAAA\x1b\\';
const ITERM_SEQ = '\x1b]1337;File=inline=1:QUJD\x07';

describe('layoutImageBlock - kitty', () => {
  it('puts the sequence on the first row', () => {
    const lines = layoutImageBlock({ protocol: 'kitty', sequence: KITTY_SEQ, rows: 5 });
    expect(lines).toHaveLength(5);
    expect(lines[0]!.isImageRow).toBe(true);
    expect(lines[0]!.text).toBe(KITTY_SEQ);
    expect(isKittySequenceFirst(lines)).toBe(true);
  });

  it('pads the remaining rows', () => {
    const lines = layoutImageBlock({ protocol: 'kitty', sequence: KITTY_SEQ, rows: 5 });
    expect(blankRowCount(lines)).toBe(4);
    for (const line of lines.slice(1)) expect(line.text).toBe(' ');
  });

  it('is exactly `rows` lines tall', () => {
    for (const rows of [1, 2, 5, 22]) {
      expect(layoutImageBlock({ protocol: 'kitty', sequence: KITTY_SEQ, rows })).toHaveLength(rows);
    }
  });
});

describe('layoutImageBlock - iterm2', () => {
  it('pads first and draws on the last row', () => {
    const lines = layoutImageBlock({ protocol: 'iterm2', sequence: ITERM_SEQ, rows: 5 });
    expect(lines).toHaveLength(5);
    expect(lines[4]!.isImageRow).toBe(true);
    expect(blankRowCount(lines)).toBe(4);
    expect(isITerm2SequenceLast(lines)).toBe(true);
  });

  it('moves the cursor back up by rows-1 before the escape', () => {
    const lines = layoutImageBlock({ protocol: 'iterm2', sequence: ITERM_SEQ, rows: 5 });
    expect(lines[4]!.text).toBe(`\x1b[4A${ITERM_SEQ}`);
    // The move-up must precede the escape, not follow it.
    expect(lines[4]!.text.indexOf('\x1b[')).toBeLessThan(lines[4]!.text.indexOf('\x1b]1337;'));
  });

  it('emits no move-up for a single-row image', () => {
    const lines = layoutImageBlock({ protocol: 'iterm2', sequence: ITERM_SEQ, rows: 1 });
    expect(lines).toHaveLength(1);
    expect(lines[0]!.text).toBe(ITERM_SEQ);
    expect(lines[0]!.text).not.toContain('\x1b[');
  });

  it('is exactly `rows` lines tall', () => {
    for (const rows of [1, 2, 5, 22]) {
      expect(layoutImageBlock({ protocol: 'iterm2', sequence: ITERM_SEQ, rows })).toHaveLength(rows);
    }
  });
});

describe('layoutImageBlock - invariants', () => {
  it('never emits a negative or zero-height block', () => {
    for (const rows of [0, -3, 1.9]) {
      expect(layoutImageBlock({ protocol: 'kitty', sequence: KITTY_SEQ, rows }).length).toBeGreaterThanOrEqual(1);
    }
  });

  it('has exactly one image row', () => {
    for (const rows of [1, 3, 8]) {
      for (const protocol of ['kitty', 'iterm2'] as const) {
        const lines = layoutImageBlock({ protocol, sequence: protocol === 'kitty' ? KITTY_SEQ : ITERM_SEQ, rows });
        expect(lines.filter((l) => l.isImageRow)).toHaveLength(1);
      }
    }
  });

  it('a padding row occupies exactly one column', () => {
    const lines = layoutImageBlock({ protocol: 'kitty', sequence: KITTY_SEQ, rows: 4 });
    for (const line of lines.slice(1)) {
      expect(imageLineWidth(line)).toBe(1);
    }
  });

  it('the two protocols differ for a multi-row image', () => {
    const kitty = layoutImageBlock({ protocol: 'kitty', sequence: KITTY_SEQ, rows: 4 });
    const iterm = layoutImageBlock({ protocol: 'iterm2', sequence: ITERM_SEQ, rows: 4 });
    expect(kitty[0]!.isImageRow).toBe(true);
    expect(iterm[0]!.isImageRow).toBe(false);
    expect(kitty.map((l) => l.isImageRow)).not.toEqual(iterm.map((l) => l.isImageRow));
  });
});
