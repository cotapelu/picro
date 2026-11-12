// Regression tests for key matching gaps found while auditing Keys.ts against
// the pi-mono reference (keys.ts).
import { describe, it, expect, afterEach } from 'vitest';
import { matchesKey, parseKey, setKittyProtocolActive, isKeyRelease, isKeyRepeat } from './Keys.js';

afterEach(() => setKittyProtocolActive(false));

describe('matchesKey legacy fallbacks', () => {
  it('accepts ctrl+space as NUL when Kitty is off', () => {
    expect(matchesKey('\x00', 'ctrl+space')).toBe(true);
  });

  it('accepts alt+space as ESC+space when Kitty is off', () => {
    expect(matchesKey('\x1b ', 'alt+space')).toBe(true);
  });

  it('matches ctrl+a through xterm modifyOtherKeys', () => {
    expect(matchesKey('\x1b[27;5;97~', 'ctrl+a')).toBe(true);
  });

  it('matches ctrl+shift+p through xterm modifyOtherKeys', () => {
    expect(matchesKey('\x1b[27;6;80~', 'ctrl+shift+p')).toBe(true);
  });

  it('matches shift+plus through xterm modifyOtherKeys', () => {
    // CSI 27 ; mod ; keycode~ with mod 2 (shift) and keycode 43 ("+"); the
    // binding spells the symbol itself, so the key id is "shift++".
    expect(matchesKey('\x1b[27;2;43~', 'shift++')).toBe(true);
  });

  it('keeps the physical spelling valid alongside the logical one', () => {
    // Shift held on the "=" key is reported as "=" with shift: "shift+=".
    expect(matchesKey('\x1b[27;2;61~', 'shift+=')).toBe(true);
  });
});

describe('parseKey legacy labels', () => {
  it('labels the remaining control characters', () => {
    expect(parseKey('\x1c')).toBe('ctrl+\\');
    expect(parseKey('\x1d')).toBe('ctrl+]');
    expect(parseKey('\x1f')).toBe('ctrl+-');
  });

  it('labels double-escape combinations', () => {
    expect(parseKey('\x1b\x1b')).toBe('ctrl+alt+[');
    expect(parseKey('\x1b\x1c')).toBe('ctrl+alt+\\');
    expect(parseKey('\x1b\x1d')).toBe('ctrl+alt+]');
    expect(parseKey('\x1b\x1f')).toBe('ctrl+alt+-');
  });

  it('labels legacy alt prefixes', () => {
    expect(parseKey('\x1b ')).toBe('alt+space');
    expect(parseKey('\x1bB')).toBe('alt+left');
    expect(parseKey('\x1bF')).toBe('alt+right');
  });
});

describe('kitty event types', () => {
  it('never reports release/repeat inside bracketed paste', () => {
    expect(isKeyRelease('\x1b[200~foo:3F\x1b[201~')).toBe(false);
    expect(isKeyRepeat('\x1b[200~foo:2F\x1b[201~')).toBe(false);
  });

  it('detects release and repeat suffixes', () => {
    expect(isKeyRelease('\x1b[97;1:3u')).toBe(true);
    expect(isKeyRepeat('\x1b[97;1:2u')).toBe(true);
    expect(isKeyRelease('\x1b[97;1:1u')).toBe(false);
  });
});
