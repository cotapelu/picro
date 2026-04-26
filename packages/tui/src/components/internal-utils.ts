/**
 * Internal utilities for TUI Components
 *
 * These functions are used internally by components for text processing.
 * These should NOT be imported by files outside the components directory.
 */

// Grapheme segmenter (shared instance)
export const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

/**
 * Get the shared grapheme segmenter instance
 */
export function getSegmenter(): Intl.Segmenter {
  return segmenter;
}

/**
 * Calculate visible width of a string (accounting for ANSI codes and wide characters)
 */
export function visibleWidth(str: string): number {
  let width = 0;
  let inAnsi = false;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '\x1b') {
      inAnsi = true;
      continue;
    }
    if (inAnsi) {
      if (char === 'm' || char === '[') {
        // ANSI sequence end
        if (i > 0 && str.charCodeAt(i - 1) >= 0x40 && str.charCodeAt(i - 1) <= 0x5f) {
          inAnsi = false;
        }
      }
      continue;
    }
    // Check for wide characters (CJK, emojis, etc.)
    const code = str.charCodeAt(i);
    if (code >= 0x1100 && (
      (code <= 0x115f) || // Hangul Jamo
      (code >= 0x2e80 && code <= 0xa4cf) || // CJK
      (code >= 0xac00 && code <= 0xd7a3) || // Hangul Syllables
      (code >= 0xf900 && code <= 0xfaff) || // CJK Compatibility Ideographs
      (code >= 0xfe10 && code <= 0xfe19) || // Vertical forms
      (code >= 0xfe30 && code <= 0xfe6f) || // CJK Compatibility Forms
      (code >= 0xff00 && code <= 0xff60) || // Fullwidth Forms
      (code >= 0xffe0 && code <= 0xffe6) || // Fullwidth Symbols
      (code >= 0x20000 && code <= 0x2fffd) || // CJK Extensions
      (code >= 0x30000 && code <= 0x3fffd)
    )) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}

/**
 * Extract ANSI escape code from string starting at position
 */
export function extractAnsiCode(str: string, pos: number): { code: string; length: number } | null {
  if (str[pos] !== '\x1b') return null;
  let end = pos + 1;
  if (end >= str.length) return null;
  if (str[end] === '[') {
    // CSI sequence: \x1b[...m
    while (end < str.length) {
      const charCode = str.charCodeAt(end);
      if (charCode >= 0x40 && charCode <= 0x7e) {
        // Final character
        return { code: str.substring(pos, end + 1), length: end + 1 - pos };
      }
      end++;
    }
  } else if (str[end] === ']') {
    // OSC sequence: \x1b]...BEL
    while (end < str.length) {
      const char = str[end];
      if (char === '\x07' || (char === '\\' && str[end + 1] === '\x1b')) {
        return { code: str.substring(pos, end + 1), length: end + 1 - pos };
      }
      end++;
    }
  }
  return null;
}

/**
 * Extract segments from string (text with ANSI codes)
 */
export function extractSegments(str: string): Array<{ text: string; ansi: string }> {
  const segments: Array<{ text: string; ansi: string }> = [];
  let currentAnsi = '';
  let currentText = '';
  let inAnsi = false;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '\x1b') {
      if (currentText) {
        segments.push({ text: currentText, ansi: currentAnsi });
        currentText = '';
        currentAnsi = '';
      }
      inAnsi = true;
      currentAnsi += char;
      continue;
    }
    if (inAnsi) {
      currentAnsi += char;
      const ansiCode = extractAnsiCode(str, i - currentAnsi.length + 1);
      if (ansiCode) {
        inAnsi = false;
      }
      continue;
    }
    currentText += char;
  }
  if (currentText) {
    segments.push({ text: currentText, ansi: currentAnsi });
  }
  return segments;
}

/**
 * Slice string by column width (accounting for ANSI codes)
 */
export function sliceByColumn(str: string, startCol: number, endCol: number): string {
  const segments = extractSegments(str);
  let result = '';
  let currentCol = 0;
  for (const segment of segments) {
    const segWidth = visibleWidth(segment.text);
    if (currentCol + segWidth <= startCol) {
      currentCol += segWidth;
      continue;
    }
    if (currentCol >= endCol) {
      break;
    }
    const segStart = Math.max(0, startCol - currentCol);
    const segEnd = Math.min(segWidth, endCol - currentCol);
    if (segStart < segEnd) {
      result += segment.ansi + segment.text.substring(segStart, segEnd);
    }
    currentCol += segWidth;
  }
  return result;
}

/**
 * Slice string by width (accounting for ANSI codes)
 */
export function sliceWithWidth(str: string, maxWidth: number): string {
  return sliceByColumn(str, 0, maxWidth);
}

/**
 * Strip ANSI codes from a string
 */
export function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Check if a string contains ANSI codes
 */
export function hasAnsi(str: string): boolean {
  return /\x1b\[[0-9;]*m/.test(str);
}

/**
 * Wrap text to fit within a given width
 */
export function wrapText(text: string, width: number): string[] {
  const lines: string[] = [];
  const words = text.split(/\s+/);
  let currentLine = '';
  for (const word of words) {
    const wordWidth = visibleWidth(word);
    const lineWidth = visibleWidth(currentLine);
    if (lineWidth + wordWidth + (lineWidth > 0 ? 1 : 0) <= width) {
      currentLine += (lineWidth > 0 ? ' ' : '') + word;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

/**
 * Truncate text to fit within a given width
 */
export function truncateText(text: string, width: number, ellipsis = '...'): string {
  const ellipsisWidth = visibleWidth(ellipsis);
  const textWidth = visibleWidth(text);
  if (textWidth <= width) {
    return text;
  }
  if (width <= ellipsisWidth) {
    return ellipsis.substring(0, Math.floor(width / 2));
  }
  let truncated = '';
  let currentWidth = 0;
  for (const char of text) {
    const charWidth = visibleWidth(char);
    if (currentWidth + charWidth + ellipsisWidth > width) {
      break;
    }
    truncated += char;
    currentWidth += charWidth;
  }
  return truncated + ellipsis;
}

/**
 * Pad text to fill a given width
 */
export function padText(text: string, width: number, align: 'left' | 'center' | 'right' = 'left'): string {
  const textWidth = visibleWidth(text);
  if (textWidth >= width) {
    return text;
  }
  const padding = width - textWidth;
  if (align === 'left') {
    return text + ' '.repeat(padding);
  } else if (align === 'right') {
    return ' '.repeat(padding) + text;
  } else {
    const left = Math.floor(padding / 2);
    const right = padding - left;
    return ' '.repeat(left) + text + ' '.repeat(right);
  }
}

/**
 * Escape special regex characters in a string
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Split a string into array of grapheme clusters
 */
export function splitGraphemes(str: string): string[] {
  return Array.from(segmenter.segment(str)).map(s => s.segment);
}

/**
 * Get the length of a string in grapheme clusters
 */
export function graphemeLength(str: string): number {
  return Array.from(segmenter.segment(str)).length;
}

/**
 * Truncate text to fit within a given width (advanced version)
 * Respects ANSI codes and provides more options
 */
export function truncateToWidth(
  text: string,
  width: number,
  options?: { ellipsis?: string; fromEnd?: boolean; preserveAnsi?: boolean }
): string {
  const { ellipsis = '...', fromEnd = false, preserveAnsi = true } = options || {};
  const ellipsisWidth = visibleWidth(ellipsis);
  const textWidth = visibleWidth(text);

  if (textWidth <= width) {
    return text;
  }

  if (width <= ellipsisWidth) {
    return ellipsis.substring(0, Math.floor(width / 2));
  }

  if (fromEnd) {
    // Truncate from end (keep beginning)
    let result = '';
    let currentWidth = 0;
    for (const char of text) {
      const charWidth = visibleWidth(char);
      if (currentWidth + charWidth > width - ellipsisWidth) {
        break;
      }
      result += char;
      currentWidth += charWidth;
    }
    return result + ellipsis;
  } else {
    // Truncate from beginning (keep end)
    let result = '';
    let currentWidth = 0;
    const chars = Array.from(text).reverse();
    for (const char of chars) {
      const charWidth = visibleWidth(char);
      if (currentWidth + charWidth > width - ellipsisWidth) {
        break;
      }
      result = char + result;
      currentWidth += charWidth;
    }
    return ellipsis + result;
  }
}

/**
 * Expand tab characters to spaces
 */
export function expandTabs(text: string, tabSize = 2): string {
  return text.replace(/\t/g, (match, offset) => {
    const col = offset % tabSize;
    return ' '.repeat(tabSize - col);
  });
}
