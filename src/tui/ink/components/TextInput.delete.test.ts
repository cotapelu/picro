// SPDX-License-Identifier: Apache-2.0
/**
 * TextInput deletion keys.
 *
 * `if (key.backspace || key.delete)` ran the same backward-deletion code for
 * both, so the Delete key (forward delete) erased the character BEFORE the
 * cursor instead of the one after it - a duplicate Backspace. The grapheme-aware
 * removal is now a pure helper and both directions are covered here.
 */

import { describe, it, expect } from 'vitest';
import { removeGrapheme } from './TextInput.js';

describe('removeGrapheme', () => {
  describe('backward (Backspace)', () => {
    it('removes the character before the cursor', () => {
      expect(removeGrapheme('abc', 2, 'backward')).toEqual({ text: 'ac', cursor: 1 });
    });

    it('removes the last character when the cursor is at the end', () => {
      expect(removeGrapheme('abc', 3, 'backward')).toEqual({ text: 'ab', cursor: 2 });
    });

    it('is a no-op at the start of the text', () => {
      expect(removeGrapheme('abc', 0, 'backward')).toEqual({ text: 'abc', cursor: 0 });
    });

    it('removes a whole grapheme, not a code unit', () => {
      // "é" (precomposed) is two UTF-16 code units; cursor 2 sits before it.
      expect(removeGrapheme('a\u00e9b', 2, 'backward')).toEqual({ text: 'ab', cursor: 1 });
    });

    it('removes a whole emoji (surrogate pair)', () => {
      expect(removeGrapheme('a😀b', 3, 'backward')).toEqual({ text: 'ab', cursor: 1 });
    });

    it('removes a combining sequence as one unit', () => {
      // e + combining acute accent: two code units, one grapheme.
      const text = 'e\u0301x';
      expect(text).toHaveLength(3);
      expect(removeGrapheme(text, 2, 'backward')).toEqual({ text: 'x', cursor: 0 });
    });
  });

  describe('forward (Delete)', () => {
    it('removes the character after the cursor', () => {
      expect(removeGrapheme('abc', 1, 'forward')).toEqual({ text: 'ac', cursor: 1 });
    });

    it('keeps the cursor where it is', () => {
      const result = removeGrapheme('abcdef', 3, 'forward');
      expect(result.text).toBe('abcef');
      expect(result.cursor).toBe(3);
    });

    it('is a no-op at the end of the text', () => {
      expect(removeGrapheme('abc', 3, 'forward')).toEqual({ text: 'abc', cursor: 3 });
    });

    it('removes a whole grapheme, not a code unit', () => {
      expect(removeGrapheme('aéb', 1, 'forward')).toEqual({ text: 'ab', cursor: 1 });
    });

    it('removes a whole emoji (surrogate pair)', () => {
      expect(removeGrapheme('😀x', 0, 'forward')).toEqual({ text: 'x', cursor: 0 });
    });

    it('differs from backward deletion at the same cursor', () => {
      expect(removeGrapheme('abc', 1, 'forward').text).toBe('ac');
      expect(removeGrapheme('abc', 1, 'backward').text).toBe('bc');
    });
  });

  it('handles empty text', () => {
    expect(removeGrapheme('', 0, 'backward')).toEqual({ text: '', cursor: 0 });
    expect(removeGrapheme('', 0, 'forward')).toEqual({ text: '', cursor: 0 });
  });
});
