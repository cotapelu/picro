// SPDX-License-Identifier: Apache-2.0
/**
 * SGR mouse parsing.
 *
 * Ràng buộc quan trọng: toạ độ SGR là 1-based trong khi mảng dòng/cột là
 * 0-based; nếu quên trừ 1 thì chọn text sẽ lệch một ô và mọi test render đều
 * đúng nhưng người dùng chọn sai chữ. Test dưới ghim hành vi đó.
 */

import { describe, it, expect } from 'vitest';
import {
  parseMouseEvent,
  isSgrMouseSequence,
  isX10MouseSequence,
  enableMouseSequence,
  disableMouseSequence,
  nextClickCount,
  type MouseEvent,
} from './sgr-mouse.js';

describe('isSgrMouseSequence', () => {
  it('accepts press and release forms', () => {
    expect(isSgrMouseSequence('\x1b[<0;1;1M')).toBe(true);
    expect(isSgrMouseSequence('\x1b[<0;40;12m')).toBe(true);
  });

  it('rejects other escape sequences', () => {
    expect(isSgrMouseSequence('\x1b[<0;1;1')).toBe(false);
    expect(isSgrMouseSequence('\x1b[A')).toBe(false);
    expect(isSgrMouseSequence('\x1b]11;#000000\x07')).toBe(false);
    expect(isSgrMouseSequence('plain text')).toBe(false);
  });
});

describe('isX10MouseSequence', () => {
  it('accepts exactly 6-byte sequences starting with ESC [ M', () => {
    expect(isX10MouseSequence('\x1b[M !!')).toBe(true); // button 0, x 1, y 1
  });

  it('rejects SGR and other sequences', () => {
    expect(isX10MouseSequence('\x1b[<0;1;1M')).toBe(false);
    expect(isX10MouseSequence('\x1b[M!!')).toBe(false); // too short
  });
});

describe('parseMouseEvent - buttons', () => {
  it('parses a left press', () => {
    const event = parseMouseEvent('\x1b[<0;10;5M');
    expect(event).toEqual({
      type: 'press',
      button: 'left',
      x: 9,
      y: 4,
      shift: false,
      alt: false,
      ctrl: false,
    });
  });

  it('parses middle and right buttons', () => {
    expect(parseMouseEvent('\x1b[<1;2;2M')?.button).toBe('middle');
    expect(parseMouseEvent('\x1b[<2;2;2M')?.button).toBe('right');
  });

  it('normalizes an out-of-range button code to none', () => {
    expect(parseMouseEvent('\x1b[<3;2;2M')?.button).toBe('none');
  });
});

describe('parseMouseEvent - coordinates', () => {
  it('converts 1-based SGR coordinates to 0-based', () => {
    // Column 1, row 1 must become (0,0) — the top-left cell.
    expect(parseMouseEvent('\x1b[<0;1;1M')?.x).toBe(0);
    expect(parseMouseEvent('\x1b[<0;1;1M')?.y).toBe(0);
  });

  it('clamps a bogus zero coordinate instead of going negative', () => {
    const event = parseMouseEvent('\x1b[<0;0;0M');
    expect(event?.x).toBe(0);
    expect(event?.y).toBe(0);
  });

  it('parses large coordinates', () => {
    const event = parseMouseEvent('\x1b[<0;200;60M');
    expect(event?.x).toBe(199);
    expect(event?.y).toBe(59);
  });
});

describe('parseMouseEvent - motion and modifiers', () => {
  it('parses a left drag', () => {
    const event = parseMouseEvent('\x1b[<32;15;8M');
    expect(event?.type).toBe('drag');
    expect(event?.button).toBe('left');
  });

  it('parses a bare move with no button', () => {
    const event = parseMouseEvent('\x1b[<35;15;8M');
    expect(event?.type).toBe('move');
    expect(event?.button).toBe('none');
  });

  it('parses a release', () => {
    const event = parseMouseEvent('\x1b[<0;15;8m');
    expect(event?.type).toBe('release');
  });

  it('parses modifier flags', () => {
    expect(parseMouseEvent('\x1b[<4;1;1M')?.shift).toBe(true);
    expect(parseMouseEvent('\x1b[<8;1;1M')?.alt).toBe(true);
    expect(parseMouseEvent('\x1b[<16;1;1M')?.ctrl).toBe(true);
    // 4+8+16 = 28
    const all = parseMouseEvent('\x1b[<28;1;1M');
    expect(all?.shift).toBe(true);
    expect(all?.alt).toBe(true);
    expect(all?.ctrl).toBe(true);
  });
});

describe('parseMouseEvent - wheel', () => {
  it('parses wheel up and down', () => {
    expect(parseMouseEvent('\x1b[<64;1;1M')).toEqual({
      type: 'wheel',
      button: 'none',
      x: 0,
      y: 0,
      shift: false,
      alt: false,
      ctrl: false,
      wheel: 'up',
    });
    expect(parseMouseEvent('\x1b[<65;1;1M')?.wheel).toBe('down');
  });

  it('parses horizontal wheel', () => {
    expect(parseMouseEvent('\x1b[<66;1;1M')?.wheel).toBe('left');
    expect(parseMouseEvent('\x1b[<67;1;1M')?.wheel).toBe('right');
  });

  it('keeps modifiers on wheel events (Alt+wheel scrolls faster upstream)', () => {
    // 64 (wheel) + 8 (alt) = 72
    const event = parseMouseEvent('\x1b[<72;1;1M');
    expect(event?.type).toBe('wheel');
    expect(event?.alt).toBe(true);
    expect(event?.wheel).toBe('up');
  });
});

describe('parseMouseEvent - X10 fallback', () => {
  it('parses the 6-byte X10 form as a press', () => {
    // X10 cũng mã hóa toạ độ 1-based: byte '!' = 33 = 1 + 32 nên là ô (1,1)
    // 1-based -> 0-based cho nên event trả về (0,0).
    const event = parseMouseEvent('\x1b[M !!');
    expect(event?.type).toBe('press');
    expect(event?.button).toBe('left');
    expect(event?.x).toBe(0);
    expect(event?.y).toBe(0);
  });

  it('returns undefined for a non-mouse sequence', () => {
    expect(parseMouseEvent('\x1b[A')).toBeUndefined();
    expect(parseMouseEvent('hello')).toBeUndefined();
    expect(parseMouseEvent('')).toBeUndefined();
  });
});

describe('enable/disable sequences', () => {
  it('enables SGR mode last so every reply is SGR', () => {
    const sequence = enableMouseSequence();
    expect(sequence).toContain('\x1b[?1000h');
    expect(sequence).toContain('\x1b[?1002h');
    expect(sequence).toContain('\x1b[?1006h');
    // 1006 must be the LAST enable so terminals use SGR encoding for replies.
    expect(sequence.lastIndexOf('\x1b[?1006h')).toBeGreaterThan(sequence.lastIndexOf('\x1b[?1002h'));
  });

  it('disables SGR mode first', () => {
    const sequence = disableMouseSequence();
    expect(sequence.indexOf('\x1b[?1006l')).toBeLessThan(sequence.indexOf('\x1b[?1000l'));
  });
});

describe('nextClickCount', () => {
  const at = (x: number, y: number) => ({ timestamp: 1000, count: 1, x, y });

  it('is 1 for a first click', () => {
    expect(nextClickCount(undefined, 1000, 5, 5)).toBe(1);
  });

  it('increments for a repeat at the same position in time', () => {
    expect(nextClickCount(at(5, 5), 1100, 5, 5)).toBe(2);
    expect(nextClickCount({ timestamp: 1000, count: 2, x: 5, y: 5 }, 1100, 5, 5)).toBe(3);
  });

  it('wraps back to 1 after a triple click', () => {
    expect(nextClickCount({ timestamp: 1000, count: 3, x: 5, y: 5 }, 1100, 5, 5)).toBe(1);
  });

  it('resets when the position changed', () => {
    expect(nextClickCount(at(5, 5), 1100, 6, 5)).toBe(1);
  });

  it('resets when the click was too slow', () => {
    expect(nextClickCount(at(5, 5), 2000, 5, 5)).toBe(1);
  });
});