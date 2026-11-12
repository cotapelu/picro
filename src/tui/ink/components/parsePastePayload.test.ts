// SPDX-License-Identifier: Apache-2.0
/**
 * Bracketed-paste payload extraction.
 *
 * Terminal.ts enables bracketed paste ("\x1b[?2004h") and forwards a paste to
 * Ink's input handler as "\x1b[200~<content>\x1b[201~". The Editor's handler for
 * that data sat behind a "printable input" test (data.charCodeAt(0) >= 32), and
 * the payload begins with ESC (0x1B), so pastes were silently dropped. The
 * extraction is a pure helper now, and the missing-end-marker case no longer
 * loses the payload's last character.
 */

import { describe, it, expect } from 'vitest';
import { parsePastePayload } from './Editor.js';

const START = '\x1b[200~';
const END = '\x1b[201~';

describe('parsePastePayload', () => {
  it('extracts the payload of a bracketed paste', () => {
    expect(parsePastePayload(`${START}hello${END}`)).toBe('hello');
  });

  it('keeps escape sequences inside the payload', () => {
    expect(parsePastePayload(`${START}a\x1b[Ab${END}`)).toBe('a\x1b[Ab');
  });

  it('keeps multi-line payloads', () => {
    expect(parsePastePayload(`${START}line1\nline2\nline3${END}`)).toBe('line1\nline2\nline3');
  });

  it('keeps unicode payloads', () => {
    expect(parsePastePayload(`${START}Tiếng Việt 😀${END}`)).toBe('Tiếng Việt 😀');
  });

  it('keeps an empty payload', () => {
    expect(parsePastePayload(`${START}${END}`)).toBe('');
  });

  it('takes everything after the start marker when the end marker is missing', () => {
    // The old slice(start, -1) dropped the last character here.
    expect(parsePastePayload(`${START}hello`)).toBe('hello');
  });

  it('extracts the payload when text precedes the marker', () => {
    expect(parsePastePayload(`typed${START}hello${END}`)).toBe('hello');
  });

  it('returns null for ordinary input', () => {
    expect(parsePastePayload('abc')).toBeNull();
    expect(parsePastePayload('')).toBeNull();
    // Escape sequences that are not paste markers must not be swallowed.
    expect(parsePastePayload('\x1b[A')).toBeNull();
    expect(parsePastePayload(`${END}only-end`)).toBeNull();
  });

  it('uses the first matching end marker', () => {
    expect(parsePastePayload(`${START}a${END}b${END}`)).toBe('a');
  });
});
