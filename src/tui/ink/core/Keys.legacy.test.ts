// SPDX-License-Identifier: Apache-2.0
/**
 * Legacy terminal key sequences.
 *
 * matchesKey() only handled f1-f5 in its switch, so parseKey("\x1b[17~") returned
 * "f6" while matchesKey("\x1b[17~", "f6") returned false: the two directions
 * disagreed and a keybinding on F6..F12 could never fire. The legacy tables were
 * also missing clear (and its shift/ctrl variants), which upstream carries.
 */

import { describe, it, expect } from 'vitest';
import { matchesKey, parseKey } from './Keys.js';

const LEGACY_SEQUENCES: Record<string, string[]> = {
  up: ['\x1b[A', '\x1bOA'],
  down: ['\x1b[B', '\x1bOB'],
  right: ['\x1b[C', '\x1bOC'],
  left: ['\x1b[D', '\x1bOD'],
  home: ['\x1b[H', '\x1bOH', '\x1b[1~', '\x1b[7~'],
  end: ['\x1b[F', '\x1bOF', '\x1b[4~', '\x1b[8~'],
  insert: ['\x1b[2~'],
  delete: ['\x1b[3~'],
  pageUp: ['\x1b[5~', '\x1b[[5~'],
  pageDown: ['\x1b[6~', '\x1b[[6~'],
  clear: ['\x1b[E', '\x1bOE'],
  f1: ['\x1bOP', '\x1b[11~', '\x1b[[A'],
  f2: ['\x1bOQ', '\x1b[12~', '\x1b[[B'],
  f3: ['\x1bOR', '\x1b[13~', '\x1b[[C'],
  f4: ['\x1bOS', '\x1b[14~', '\x1b[[D'],
  f5: ['\x1b[15~', '\x1b[[E'],
  f6: ['\x1b[17~'],
  f7: ['\x1b[18~'],
  f8: ['\x1b[19~'],
  f9: ['\x1b[20~'],
  f10: ['\x1b[21~'],
  f11: ['\x1b[23~'],
  f12: ['\x1b[24~'],
};

describe('matchesKey - legacy sequences', () => {
  for (const [key, sequences] of Object.entries(LEGACY_SEQUENCES)) {
    it(`matches every ${key} sequence`, () => {
      for (const sequence of sequences) {
        expect(matchesKey(sequence, key)).toBe(true);
      }
    });
  }

  it('matches shift and ctrl variants of the modified legacy keys', () => {
    expect(matchesKey('\x1b[a', 'shift+up')).toBe(true);
    expect(matchesKey('\x1b[b', 'shift+down')).toBe(true);
    expect(matchesKey('\x1b[c', 'shift+right')).toBe(true);
    expect(matchesKey('\x1b[d', 'shift+left')).toBe(true);
    expect(matchesKey('\x1bOa', 'ctrl+up')).toBe(true);
    expect(matchesKey('\x1bOb', 'ctrl+down')).toBe(true);
    expect(matchesKey('\x1bOc', 'ctrl+right')).toBe(true);
    expect(matchesKey('\x1bOd', 'ctrl+left')).toBe(true);
    expect(matchesKey('\x1b[2$', 'shift+insert')).toBe(true);
    expect(matchesKey('\x1b[3$', 'shift+delete')).toBe(true);
    expect(matchesKey('\x1b[5$', 'shift+pageUp')).toBe(true);
    expect(matchesKey('\x1b[6$', 'shift+pageDown')).toBe(true);
    expect(matchesKey('\x1b[7$', 'shift+home')).toBe(true);
    expect(matchesKey('\x1b[8$', 'shift+end')).toBe(true);
    expect(matchesKey('\x1b[2^', 'ctrl+insert')).toBe(true);
    expect(matchesKey('\x1b[3^', 'ctrl+delete')).toBe(true);
    expect(matchesKey('\x1b[5^', 'ctrl+pageUp')).toBe(true);
    expect(matchesKey('\x1b[6^', 'ctrl+pageDown')).toBe(true);
    expect(matchesKey('\x1b[7^', 'ctrl+home')).toBe(true);
    expect(matchesKey('\x1b[8^', 'ctrl+end')).toBe(true);
    // clear's modifier variants were missing entirely.
    expect(matchesKey('\x1b[e', 'shift+clear')).toBe(true);
    expect(matchesKey('\x1bOe', 'ctrl+clear')).toBe(true);
  });
});

describe('parseKey / matchesKey agree', () => {
  it('round-trips every legacy sequence', () => {
    for (const [key, sequences] of Object.entries(LEGACY_SEQUENCES)) {
      for (const sequence of sequences) {
        expect(parseKey(sequence)).toBe(key);
        expect(matchesKey(sequence, parseKey(sequence))).toBe(true);
      }
    }
  });

  it('round-trips the shift/ctrl legacy sequences', () => {
    const modified: Array<[string, string]> = [
      ['\x1b[a', 'shift+up'],
      ['\x1b[d', 'shift+left'],
      ['\x1bOa', 'ctrl+up'],
      ['\x1bOd', 'ctrl+left'],
      ['\x1b[2$', 'shift+insert'],
      ['\x1b[3^', 'ctrl+delete'],
      ['\x1b[5$', 'shift+pageUp'],
      ['\x1b[8^', 'ctrl+end'],
      ['\x1b[e', 'shift+clear'],
      ['\x1bOe', 'ctrl+clear'],
    ];
    for (const [sequence, keyId] of modified) {
      expect(parseKey(sequence)).toBe(keyId);
      expect(matchesKey(sequence, keyId)).toBe(true);
    }
  });

  it('rejects a wrong key for a sequence', () => {
    expect(matchesKey('\x1b[17~', 'f5')).toBe(false);
    expect(matchesKey('\x1b[24~', 'f11')).toBe(false);
    expect(matchesKey('\x1b[A', 'down')).toBe(false);
  });
});
