// SPDX-License-Identifier: Apache-2.0
/**
 * Kitty keyboard protocol (CSI-u) and xterm modifyOtherKeys tests.
 * These features are missing from the current implementation and must be added
 * to match pi-mono's keyboard handling capabilities.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  matchesKey,
  parseKey,
  isKeyRelease,
  isKeyRepeat,
  decodePrintableKey,
  decodeKittyPrintable,
  decodeModifyOtherKeysPrintable,
  setKittyProtocolActive,
  isKittyProtocolActive,
  Key,
  matchesKeyId,
  parseKeyId,
} from './Keys.js';

describe('Kitty CSI-u protocol (flag 1: disambiguate)', () => {
  beforeEach(() => {
    setKittyProtocolActive(true);
  });

  it('matches basic CSI-u sequences for letters', () => {
    // \x1b[97u = 'a' (codepoint 97)
    expect(matchesKey('\x1b[97u', 'a')).toBe(true);
    // \x1b[98u = 'b'
    expect(matchesKey('\x1b[98u', 'b')).toBe(true);
    // \x1b[122u = 'z'
    expect(matchesKey('\x1b[122u', 'z')).toBe(true);
  });

  it('matches CSI-u with shift modifier (flag 1)', () => {
    // \x1b[65;2u = Shift+'A' (codepoint 65, modifier 2 = shift)
    expect(matchesKey('\x1b[65;2u', 'shift+a')).toBe(true);
    // \x1b[43;2u = Shift+'+' (codepoint 43, modifier 2)
    expect(matchesKey('\x1b[43;2u', Key.shift(Key.equals))).toBe(true);
    // \x1b[43;2u = Shift+'+' (codepoint 43, modifier 2)
    expect(matchesKey('\x1b[43;2u', Key.shift(Key.plus))).toBe(true);
  });

  it('matches CSI-u with ctrl modifier', () => {
    // \x1b[97;5u = Ctrl+'a' (codepoint 97, modifier 5 = 1+4 = ctrl)
    expect(matchesKey('\x1b[97;5u', 'ctrl+a')).toBe(true);
    // \x1b[99;5u = Ctrl+'c'
    expect(matchesKey('\x1b[99;5u', 'ctrl+c')).toBe(true);
  });

  it('matches CSI-u with alt modifier', () => {
    // \x1b[97;3u = Alt+'a' (modifier 3 = 1+2 = alt)
    expect(matchesKey('\x1b[97;3u', 'alt+a')).toBe(true);
  });

  it('matches CSI-u with ctrl+shift', () => {
    // \x1b[97;6u = Ctrl+Shift+'a' (modifier 6 = 2+4)
    expect(matchesKey('\x1b[97;6u', 'ctrl+shift+a')).toBe(true);
  });

  it('matches CSI-u for special keys', () => {
    // Enter: \x1b[13u
    expect(matchesKey('\x1b[13u', 'enter')).toBe(true);
    // Tab: \x1b[9u
    expect(matchesKey('\x1b[9u', 'tab')).toBe(true);
    // Escape: \x1b[27u
    expect(matchesKey('\x1b[27u', 'escape')).toBe(true);
    // Space: \x1b[32u
    expect(matchesKey('\x1b[32u', 'space')).toBe(true);
    // Backspace: \x1b[127u
    expect(matchesKey('\x1b[127u', 'backspace')).toBe(true);
  });

  it('matches CSI-u for arrow keys with modifiers', () => {
    // \x1b[1;2A = Shift+Up
    expect(matchesKey('\x1b[1;2A', 'shift+up')).toBe(true);
    // \x1b[1;5A = Ctrl+Up
    expect(matchesKey('\x1b[1;5A', 'ctrl+up')).toBe(true);
    // \x1b[1;3A = Alt+Up
    expect(matchesKey('\x1b[1;3A', 'alt+up')).toBe(true);
    // \x1b[1;6A = Ctrl+Shift+Up
    expect(matchesKey('\x1b[1;6A', 'ctrl+shift+up')).toBe(true);
  });

  it('matches CSI-u for function keys with modifiers', () => {
    // \x1b[1;2P = Shift+F1
    expect(matchesKey('\x1b[1;2P', 'shift+f1')).toBe(true);
    // \x1b[1;5P = Ctrl+F1
    expect(matchesKey('\x1b[1;5P', 'ctrl+f1')).toBe(true);
  });
});

describe('Kitty CSI-u protocol (flag 2: event types)', () => {
  beforeEach(() => {
    setKittyProtocolActive(true);
  });

  it('detects key press (default)', () => {
    expect(isKeyRelease('\x1b[97u')).toBe(false);
    expect(isKeyRepeat('\x1b[97u')).toBe(false);
  });

  it('detects key repeat (:2 suffix)', () => {
    // \x1b[97;1:2u = repeat
    expect(isKeyRepeat('\x1b[97;1:2u')).toBe(true);
    expect(isKeyRelease('\x1b[97;1:2u')).toBe(false);
    // Arrow repeat
    expect(isKeyRepeat('\x1b[1;1:2A')).toBe(true);
  });

  it('detects key release (:3 suffix)', () => {
    // \x1b[97;1:3u = release
    expect(isKeyRelease('\x1b[97;1:3u')).toBe(true);
    expect(isKeyRepeat('\x1b[97;1:3u')).toBe(false);
    // Arrow release
    expect(isKeyRelease('\x1b[1;1:3A')).toBe(true);
  });

  it('ignores bracketed paste content for release/repeat detection', () => {
    // Bracketed paste contains sequences like ":3F" in MAC addresses
    const pasteData = '\x1b[200~90:62:3F:A5\x1b[201~';
    expect(isKeyRelease(pasteData)).toBe(false);
    expect(isKeyRepeat(pasteData)).toBe(false);
  });

  it('parseKey returns correct keyId for press events', () => {
    expect(parseKey('\x1b[97u')).toBe('a');
    expect(parseKey('\x1b[65;2u')).toBe('shift+a');
    expect(parseKey('\x1b[97;5u')).toBe('ctrl+a');
  });
});

describe('Kitty CSI-u protocol (flag 4: alternate keys)', () => {
  beforeEach(() => {
    setKittyProtocolActive(true);
  });

  it('matches shifted key (logical symbol)', () => {
    // Terminal sends '+' (codepoint 43) as Shift+'=' (codepoint 61)
    // CSI-u: \x1b[43:61;2u = shifted=43, base=61, modifier=2 (shift)
    // matchesKey should match '+' binding
    expect(matchesKey('\x1b[43:61;2u', '+')).toBe(true);
    expect(matchesKey('\x1b[43:61;2u', Key.shift(Key.equals))).toBe(true);
  });

  it('matches base layout key for non-Latin layouts', () => {
    // User has Russian layout, presses key at 'C' position (Cyrillic 'С')
    // Terminal reports codepoint 1057 (Cyrillic), baseLayoutKey 99 ('c')
    // \x1b[1057::99;5u = Ctrl+Cyrillic, base='c', modifier=5 (ctrl)
    // Should match 'ctrl+c' binding
    expect(matchesKey('\x1b[1057::99;5u', 'ctrl+c')).toBe(true);
  });

  it('does NOT match base layout for Latin letters (authoritative codepoint)', () => {
    // Dvorak user presses key at 'C' position (which is 'I' on QWERTY)
    // Terminal reports codepoint 105 ('i'), baseLayoutKey 99 ('c')
    // Should match 'i', NOT 'c'
    expect(matchesKey('\x1b[105::99u', 'i')).toBe(true);
    expect(matchesKey('\x1b[105::99u', 'c')).toBe(false);
  });

  it('does NOT match base layout for known symbols', () => {
    // User remaps '/' to another position
    // Terminal reports codepoint for new position, baseLayoutKey 47 ('/')
    // Should match actual codepoint, not base
    expect(matchesKey('\x1b[99::47u', 'c')).toBe(true); // actual='c'
    expect(matchesKey('\x1b[99::47u', '/')).toBe(false);
  });
});

describe('xterm modifyOtherKeys (CSI 27)', () => {
  it('matches modifyOtherKeys sequences', () => {
    // \x1b[27;5;97~ = Ctrl+'a' (modifier 5, keycode 97)
    expect(matchesKey('\x1b[27;5;97~', 'ctrl+a')).toBe(true);
    // \x1b[27;3;97~ = Alt+'a'
    expect(matchesKey('\x1b[27;3;97~', 'alt+a')).toBe(true);
    // \x1b[27;2;65~ = Shift+'A'
    expect(matchesKey('\x1b[27;2;65~', 'shift+a')).toBe(true);
  });

  it('matches logical shifted symbols in modifyOtherKeys', () => {
    // Terminal reports '+' (43) as Shift+'=' (61)
    // \x1b[27;2;43~ = Shift+'+'
    expect(matchesKey('\x1b[27;2;43~', '+')).toBe(true);
    expect(matchesKey('\x1b[27;2;43~', Key.shift(Key.equals))).toBe(true);
  });
});

describe('decodePrintableKey - CSI-u printable decoding', () => {
  beforeEach(() => {
    setKittyProtocolActive(true);
  });

  it('decodes plain printable CSI-u', () => {
    expect(decodePrintableKey('\x1b[97u')).toBe('a');
    expect(decodePrintableKey('\x1b[98u')).toBe('b');
    expect(decodePrintableKey('\x1b[32u')).toBe(' ');
    expect(decodePrintableKey('\x1b[48u')).toBe('0');
  });

  it('decodes shifted printable CSI-u (uses shifted keycode)', () => {
    // \x1b[43:61;2u = '+' (shifted=43), modifier=2 (shift)
    expect(decodePrintableKey('\x1b[43:61;2u')).toBe('+');
    // \x1b[65:97;2u = 'A' (shifted=65)
    expect(decodePrintableKey('\x1b[65:97;2u')).toBe('A');
  });

  it('rejects Ctrl/Alt modified printable', () => {
    expect(decodePrintableKey('\x1b[97;5u')).toBeUndefined(); // ctrl
    expect(decodePrintableKey('\x1b[97;3u')).toBeUndefined(); // alt
    expect(decodePrintableKey('\x1b[97;9u')).toBeUndefined(); // super
  });

  it('rejects control characters', () => {
    expect(decodePrintableKey('\x1b[1u')).toBeUndefined(); // ctrl+a
    expect(decodePrintableKey('\x1b[27u')).toBeUndefined(); // escape
  });

  it('rejects Kitty functional PUA range', () => {
    expect(decodePrintableKey('\x1b[57344u')).toBeUndefined(); // F13+
  });
});

describe('decodePrintableKey - modifyOtherKeys printable decoding', () => {
  it('decodes plain modifyOtherKeys printable', () => {
    expect(decodePrintableKey('\x1b[27;1;97~')).toBe('a');
    expect(decodePrintableKey('\x1b[27;1;32~')).toBe(' ');
  });

  it('decodes shifted modifyOtherKeys', () => {
    // \x1b[27;2;43~ = Shift+'+' (keycode 43, modifier 2)
    expect(decodePrintableKey('\x1b[27;2;43~')).toBe('+');
  });

  it('rejects Ctrl/Alt modified', () => {
    expect(decodePrintableKey('\x1b[27;5;97~')).toBeUndefined();
    expect(decodePrintableKey('\x1b[27;3;97~')).toBeUndefined();
  });
});

describe('Legacy sequences - extended (missing from current)', () => {
  beforeEach(() => {
    setKittyProtocolActive(false);
  });

  it('matches ctrl+alt+symbol sequences', () => {
    // \x1c = Ctrl+\ (FS)
    expect(matchesKey('\x1c', 'ctrl+\\')).toBe(true);
    // \x1d = Ctrl+] (GS)
    expect(matchesKey('\x1d', 'ctrl+]')).toBe(true);
    // \x1f = Ctrl+- (US)
    expect(matchesKey('\x1f', 'ctrl+-')).toBe(true);
  });

  it('matches double-ESC sequences for ctrl+alt', () => {
    // \x1b\x1b = ESC ESC = Ctrl+Alt+[
    expect(matchesKey('\x1b\x1b', 'ctrl+alt+[')).toBe(true);
    // \x1b\x1c = ESC FS = Ctrl+Alt+\
    expect(matchesKey('\x1b\x1c', 'ctrl+alt+\\')).toBe(true);
    // \x1b\x1d = ESC GS = Ctrl+Alt+]
    expect(matchesKey('\x1b\x1d', 'ctrl+alt+]')).toBe(true);
    // \x1b\x1f = ESC US = Ctrl+Alt+-
    expect(matchesKey('\x1b\x1f', 'ctrl+alt+-')).toBe(true);
  });

  it('matches alt+space and alt+arrow legacy', () => {
    // \x1b  = Alt+Space
    expect(matchesKey('\x1b ', 'alt+space')).toBe(true);
    // \x1bB = Alt+Left (non-Kitty)
    expect(matchesKey('\x1bB', 'alt+left')).toBe(true);
    // \x1bF = Alt+Right (non-Kitty)
    expect(matchesKey('\x1bF', 'alt+right')).toBe(true);
  });

  it('matches ctrl+alt+letter legacy (ESC + ctrl+letter)', () => {
    // \x1b + \x01 = ESC + Ctrl+A = Ctrl+Alt+A
    expect(matchesKey('\x1b\x01', 'ctrl+alt+a')).toBe(true);
    // \x1b + \x1a = ESC + Ctrl+Z = Ctrl+Alt+Z
    expect(matchesKey('\x1b\x1a', 'ctrl+alt+z')).toBe(true);
  });

  it('matches clear key variants', () => {
    expect(matchesKey('\x1b[E', 'clear')).toBe(true);
    expect(matchesKey('\x1bOE', 'clear')).toBe(true);
    expect(matchesKey('\x1b[e', 'shift+clear')).toBe(true);
    expect(matchesKey('\x1bOe', 'ctrl+clear')).toBe(true);
  });

  it('parseKey round-trips all extended legacy sequences', () => {
    const cases: Array<[string, string]> = [
      ['\x1c', 'ctrl+\\'],
      ['\x1d', 'ctrl+]'],
      ['\x1f', 'ctrl+-'],
      ['\x1b\x1b', 'ctrl+alt+['],
      ['\x1b\x1c', 'ctrl+alt+\\'],
      ['\x1b\x1d', 'ctrl+alt+]'],
      ['\x1b\x1f', 'ctrl+alt+-'],
      ['\x1b ', 'alt+space'],
      ['\x1bB', 'alt+left'],
      ['\x1bF', 'alt+right'],
      ['\x1b\x01', 'ctrl+alt+a'],
      ['\x1b\x1a', 'ctrl+alt+z'],
      ['\x1b[E', 'clear'],
      ['\x1bOE', 'clear'],
      ['\x1b[e', 'shift+clear'],
      ['\x1bOe', 'ctrl+clear'],
    ];
    for (const [seq, keyId] of cases) {
      expect(parseKey(seq)).toBe(keyId);
      expect(matchesKey(seq, keyId)).toBe(true);
    }
  });
});

describe('Key helper object (type-safe key identifiers)', () => {
  it('provides all base keys', () => {
    expect(Key.escape).toBe('escape');
    expect(Key.enter).toBe('enter');
    expect(Key.tab).toBe('tab');
    expect(Key.space).toBe('space');
    expect(Key.backspace).toBe('backspace');
    expect(Key.up).toBe('up');
    expect(Key.down).toBe('down');
    expect(Key.left).toBe('left');
    expect(Key.right).toBe('right');
    expect(Key.home).toBe('home');
    expect(Key.end).toBe('end');
    expect(Key.pageUp).toBe('pageUp');
    expect(Key.pageDown).toBe('pageDown');
    expect(Key.delete).toBe('delete');
    expect(Key.insert).toBe('insert');
    expect(Key.clear).toBe('clear');
    for (let i = 1; i <= 12; i++) {
      expect(Key[`f${i}` as keyof typeof Key]).toBe(`f${i}`);
    }
  });

  it('provides all symbol keys', () => {
    expect(Key.backtick).toBe('`');
    expect(Key.hyphen).toBe('-');
    expect(Key.equals).toBe('=');
    expect(Key.leftbracket).toBe('[');
    expect(Key.rightbracket).toBe(']');
    expect(Key.backslash).toBe('\\');
    expect(Key.semicolon).toBe(';');
    expect(Key.quote).toBe("'");
    expect(Key.comma).toBe(',');
    expect(Key.period).toBe('.');
    expect(Key.slash).toBe('/');
    expect(Key.exclamation).toBe('!');
    expect(Key.at).toBe('@');
    expect(Key.hash).toBe('#');
    expect(Key.dollar).toBe('$');
    expect(Key.percent).toBe('%');
    expect(Key.caret).toBe('^');
    expect(Key.ampersand).toBe('&');
    expect(Key.asterisk).toBe('*');
    expect(Key.leftparen).toBe('(');
    expect(Key.rightparen).toBe(')');
    expect(Key.underscore).toBe('_');
    expect(Key.plus).toBe('+');
    expect(Key.pipe).toBe('|');
    expect(Key.tilde).toBe('~');
    expect(Key.leftbrace).toBe('{');
    expect(Key.rightbrace).toBe('}');
    expect(Key.colon).toBe(':');
    expect(Key.lessthan).toBe('<');
    expect(Key.greaterthan).toBe('>');
    expect(Key.question).toBe('?');
  });

  it('provides single modifiers', () => {
    expect(Key.ctrl('c')).toBe('ctrl+c');
    expect(Key.shift('tab')).toBe('shift+tab');
    expect(Key.alt('enter')).toBe('alt+enter');
    expect(Key.super('k')).toBe('super+k');
  });

  it('provides combined modifiers', () => {
    expect(Key.ctrlShift('p')).toBe('ctrl+shift+p');
    expect(Key.ctrlAlt('x')).toBe('ctrl+alt+x');
    expect(Key.ctrlSuper('k')).toBe('ctrl+super+k');
    expect(Key.shiftAlt('x')).toBe('shift+alt+x');
    expect(Key.altSuper('k')).toBe('alt+super+k');
    expect(Key.superShift('k')).toBe('super+shift+k');
  });

  it('provides triple modifiers', () => {
    expect(Key.ctrlShiftAlt('p')).toBe('ctrl+shift+alt+p');
    expect(Key.ctrlShiftSuper('k')).toBe('ctrl+shift+super+k');
  });
});

describe('parseKeyId / matchesKeyId (key identity matching)', () => {
  it('parses complex key identifiers', () => {
    expect(matchesKeyId('ctrl+shift+p', 'ctrl+shift+p')).toBe(true);
    expect(matchesKeyId('shift+ctrl+p', 'ctrl+shift+p')).toBe(true); // order independent
    expect(matchesKeyId('ctrl+alt+x', 'ctrl+alt+x')).toBe(true);
    expect(matchesKeyId('ctrl+shift+alt+p', 'ctrl+shift+alt+p')).toBe(true);
  });

  it('rejects invalid key identifiers', () => {
    expect(matchesKeyId('ctrl+shift', 'ctrl+shift+p')).toBe(false);
    expect(matchesKeyId('ctrl++p', 'ctrl+shift+p')).toBe(false);
  });
});

describe('Kitty protocol state management', () => {
  it('tracks active state', () => {
    setKittyProtocolActive(false);
    expect(isKittyProtocolActive()).toBe(false);
    setKittyProtocolActive(true);
    expect(isKittyProtocolActive()).toBe(true);
  });

  it('affects legacy sequence interpretation', () => {
    // With Kitty active, \x1b\r = shift+enter (not alt+enter)
    setKittyProtocolActive(true);
    expect(matchesKey('\x1b\r', 'shift+enter')).toBe(true);
    expect(matchesKey('\x1b\r', 'alt+enter')).toBe(false);
    expect(parseKey('\x1b\r')).toBe('shift+enter');

    setKittyProtocolActive(false);
    expect(matchesKey('\x1b\r', 'alt+enter')).toBe(true);
    expect(matchesKey('\x1b\r', 'shift+enter')).toBe(false);
    expect(parseKey('\x1b\r')).toBe('alt+enter');
  });
});

describe('Windows Terminal raw backspace handling', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv, WT_SESSION: '1' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('interprets raw \\x08 as ctrl+backspace on Windows Terminal', () => {
    setKittyProtocolActive(false);
    expect(matchesKey('\x08', 'ctrl+backspace')).toBe(true);
    expect(matchesKey('\x08', 'backspace')).toBe(false);
  });

  it('interprets raw \\x7f as backspace', () => {
    expect(matchesKey('\x7f', 'backspace')).toBe(true);
  });
});