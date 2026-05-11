// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for keys module (keyboard handling)
 */

import { describe, it, expect } from 'vitest';
import { parseKey, matchesKey, isKeyRelease, isKeyRepeat, decodeKittyPrintable, Key } from './keys';

describe('parseKey', () => {
  describe('special keys', () => {
    it('should parse Enter', () => {
      const k = parseKey('\r');
      expect(k).not.toBeNull();
      expect(k?.name).toBe('enter');
      expect(k?.type).toBe('press');
    });

    it('should parse Escape', () => {
      const k = parseKey('\x1b');
      expect(k?.name).toBe('escape');
    });

    it('should parse Tab', () => {
      const k = parseKey('\t');
      expect(k?.name).toBe('tab');
    });

    it('should parse Backspace', () => {
      const k = parseKey('\x7f');
      expect(k?.name).toBe('backspace');
    });

    it('should parse Arrow keys', () => {
      expect(parseKey('\x1b[A')?.name).toBe('up');
      expect(parseKey('\x1b[B')?.name).toBe('down');
      expect(parseKey('\x1b[C')?.name).toBe('right');
      expect(parseKey('\x1b[D')?.name).toBe('left');
    });

    it('should parse PageUp/PageDown', () => {
      expect(parseKey('\x1b[5~')?.name).toBe('pageup');
      expect(parseKey('\x1b[6~')?.name).toBe('pagedown');
    });
  });

  describe('Ctrl+Letter', () => {
    it('should parse Ctrl+A (SOH)', () => {
      const k = parseKey('\x01');
      expect(k?.name).toBe('a');
      expect(k?.ctrl).toBe(true);
    });

    it('should parse Ctrl+Z', () => {
      const k = parseKey('\x1a');
      expect(k?.name).toBe('z');
      expect(k?.ctrl).toBe(true);
    });

    it('should not misinterpret other control codes', () => {
      // e.g., \x00 (NUL) is ctrl+@? Not in our 1-26 range.
      const k = parseKey('\x00');
      expect(k).toBeNull();
    });
  });

  describe('printable characters', () => {
    it('should parse single printable', () => {
      const k = parseKey('a');
      expect(k?.name).toBe('a');
      expect(k?.ctrl).toBe(false);
    });

    it('should return null for empty string', () => {
      const k = parseKey('');
      expect(k).toBeNull();
    });
  });

  describe('unknown sequences', () => {
    it('should return null for unknown CSI', () => {
      const k = parseKey('\x1b[1;2;3Q'); // not recognized
      expect(k).toBeNull();
    });
  });
});

describe('matchesKey', () => {
  it('should match string key to string pattern', () => {
    expect(matchesKey('a', 'a')).toBe(true);
    expect(matchesKey('b', 'a')).toBe(false);
  });

  it('should match ParsedKey to string pattern by name', () => {
    const parsed = parseKey('a')!;
    expect(matchesKey(parsed, 'a')).toBe(true);
  });

  it('should match ParsedKey to string pattern by raw', () => {
    const parsed = parseKey('\r')!;
    expect(matchesKey(parsed, '\r')).toBe(true);
    expect(matchesKey(parsed, 'enter')).toBe(true); // because key.name can match
  });

  it('should match KeyId with seq', () => {
    const keyId = { seq: 'a' };
    expect(matchesKey('a', keyId)).toBe(true);
  });

  it('should handle KeyId with name? Not used', () => {
    // None
  });
});

describe('isKeyRelease', () => {
  it('should return false for string', () => {
    expect(isKeyRelease('a')).toBe(false);
  });

  it('should return true if type is release', () => {
    expect(isKeyRelease({ type: 'release' } as any)).toBe(true);
    expect(isKeyRelease({ type: 'press' } as any)).toBe(false);
  });
});

describe('isKeyRepeat', () => {
  it('should return false for string', () => {
    expect(isKeyRepeat('a')).toBe(false);
  });

  it('should return true if type is repeat', () => {
    expect(isKeyRepeat({ type: 'repeat' } as any)).toBe(true);
    expect(isKeyRepeat({ type: 'press' } as any)).toBe(false);
  });
});

describe('decodeKittyPrintable', () => {
  it('should strip kitty wrapper', () => {
    const decoded = decodeKittyPrintable('\x1b_pi;hello\x1b\\');
    expect(decoded).toBe('hello');
  });

  it('should handle multiple chunks', () => {
    const decoded = decodeKittyPrintable('\x1b_pi;hello\x1b\\world\x1b\\');
    expect(decoded).toContain('hello');
  });
});

describe('Key constant', () => {
  it('should export Key object', () => {
    expect(Key).toBeDefined();
  });
});