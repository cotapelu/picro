// SPDX-License-Identifier: Apache-License-2.0
/**
 * SettingsList value cycling.
 *
 * The component kept its filtered list in state, initialised once from the
 * `items` prop, and never re-synced when that prop changed. Combined with
 * cycling from `item.currentValue`, a controlled parent's updates never reached
 * the UI, so pressing Space again advanced from the ORIGINAL value (or
 * oscillated) instead of the current one.
 */

import { describe, it, expect } from 'vitest';
import { nextCycleValue } from './settings-cycle.js';
import { truncateToWidth } from '../core/TerminalText.js';

describe('nextCycleValue', () => {
  it('advances one step', () => {
    expect(nextCycleValue(['x', 'y', 'z'], 'x')).toBe('y');
    expect(nextCycleValue(['x', 'y', 'z'], 'y')).toBe('z');
  });

  it('wraps around at the end', () => {
    expect(nextCycleValue(['x', 'y', 'z'], 'z')).toBe('x');
  });

  it('handles a two-value list', () => {
    expect(nextCycleValue(['on', 'off'], 'on')).toBe('off');
    expect(nextCycleValue(['on', 'off'], 'off')).toBe('on');
  });

  it('selects the first value when the current one is unknown', () => {
    // An unknown value has index -1, so advancing one step lands on index 0:
    // the most useful behaviour is to fall back to the first valid value.
    expect(nextCycleValue(['a', 'b'], 'nope')).toBe('a');
    expect(nextCycleValue(['a', 'b'], undefined)).toBe('a');
  });

  it('treats an empty value list as a no-op', () => {
    expect(nextCycleValue([], 'anything')).toBe('anything');
    expect(nextCycleValue([], undefined)).toBe('');
  });
});

describe('SelectList clipping (regression: ANSI-aware cut)', () => {
  // SelectList.clip() now delegates to truncateToWidth; these cases pin the
  // behaviour the previous local implementation got wrong.
  const clip = (text: string, width: number) => truncateToWidth(text, width, '', false);

  it('leaves a short plain label untouched', () => {
    expect(clip('abc', 10)).toBe('abc');
  });

  it('cuts a long plain label to the requested columns', () => {
    expect(clip('abcdefghij', 5)).toBe('abcde');
  });

  it('does not spend the width budget on escape bytes', () => {
    const coloured = '\x1b[32mvery-long-label\x1b[39m';
    expect(clip(coloured, 6)).toBe('\x1b[32mvery-l');
  });

  it('never cuts inside an escape sequence', () => {
    const clipped = clip('\x1b[38;5;120mvery long label\x1b[39m', 5);
    expect(clipped).not.toMatch(/\x1b\[[0-9;]*$/);
    expect(clipped.startsWith('\x1b[38;5;120m')).toBe(true);
  });

  it('handles a zero width', () => {
    expect(clip('abc', 0)).toBe('');
  });
});
