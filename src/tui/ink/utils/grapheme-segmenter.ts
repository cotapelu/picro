/**
 * Simple grapheme segmenter for Unicode-aware text manipulation.
 * Uses Intl.Segmenter if available, otherwise falls back to Array.from().
 */

export interface Grapheme {
  segment: string;
  length: number; // UTF-16 code units length
}

const cachedSegmenter: ((text: string) => Grapheme[]) | null = (() => {
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    try {
      const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
      return (text: string): Grapheme[] => {
        const segments = segmenter.segment(text);
        return Array.from(segments, s => ({ segment: s.segment, length: s.segment.length }));
      };
    } catch {
      // Fallback below
    }
  }
  return null;
})();

/**
 * Segment a string into grapheme clusters.
 * Each grapheme represents a user-perceived character (may consist of multiple code points).
 */
export function segmentGraphemes(text: string): Grapheme[] {
  if (cachedSegmenter) {
    return cachedSegmenter(text);
  }
  // Basic fallback: split by UTF-16 code units (Array.from handles surrogate pairs)
  return Array.from(text, ch => ({ segment: ch, length: ch.length }));
}

/**
 * Get the grapheme at a specific UTF-16 code unit index.
 * Returns the grapheme containing that index, or undefined if out of bounds.
 */
export function getGraphemeAt(text: string, codeUnitIndex: number): Grapheme | undefined {
  const graphemes = segmentGraphemes(text);
  let currentPos = 0;
  for (const g of graphemes) {
    if (codeUnitIndex >= currentPos && codeUnitIndex < currentPos + g.length) {
      return g;
    }
    currentPos += g.length;
  }
  return undefined;
}

/**
 * Calculate the UTF-16 code unit index of a grapheme boundary.
 * @param text - The string
 * @param graphemeIndex - Index of grapheme (0-based)
 * @returns UTF-16 code unit index, or text.length if beyond end
 */
export function getCodeUnitIndexAtGrapheme(text: string, graphemeIndex: number): number {
  const graphemes = segmentGraphemes(text);
  if (graphemeIndex >= graphemes.length) {
    return text.length;
  }
  let pos = 0;
  for (let i = 0; i < graphemeIndex; i++) {
    pos += graphemes[i].length;
  }
  return pos;
}

/**
 * Count the number of grapheme clusters in a string.
 */
export function countGraphemes(text: string): number {
  return segmentGraphemes(text).length;
}
