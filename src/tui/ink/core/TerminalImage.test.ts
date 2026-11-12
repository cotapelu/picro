// SPDX-License-Identifier: Apache-2.0
/**
 * Image header parsing and the fallback-text truncation.
 *
 * truncateToWidthCompat() measured text.length (UTF-16 code units) instead of
 * display columns, so double-width content overran the output row: "你好世界"
 * (4 units) was returned unchanged for maxWidth 5 while occupying 8 columns, and
 * "a😀b" for maxWidth 2 came out wider than the row. It is now column-accurate
 * and grapheme-safe.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateImageCellSize,
  encodeITerm2,
  encodeKitty,
  getGifDimensions,
  getImageDimensions,
  getJpegDimensions,
  getPngDimensions,
  getWebpDimensions,
  hyperlink,
  imageFallback,
  isImageLine,
  truncateToWidthCompat,
} from './TerminalImage.js';
import { visibleWidth } from './TerminalText.js';

// --- header builders -------------------------------------------------------

function png(w: number, h: number): string {
  const b = Buffer.alloc(37);
  b[0] = 0x89; b[1] = 0x50; b[2] = 0x4e; b[3] = 0x47;
  b.writeUInt32BE(13, 4);
  b.write('IHDR', 8, 'ascii');
  b.writeUInt32BE(w, 16);
  b.writeUInt32BE(h, 20);
  return b.toString('base64');
}

function gif(w: number, h: number): string {
  const b = Buffer.alloc(13);
  b.write('GIF89a', 0, 'ascii');
  b.writeUInt16LE(w, 6);
  b.writeUInt16LE(h, 8);
  return b.toString('base64');
}

function jpeg(w: number, h: number, marker = 0xc0): string {
  const b = Buffer.alloc(2 + 4 + 6);
  b[0] = 0xff; b[1] = 0xd8;
  let o = 2;
  b[o++] = 0xff; b[o++] = marker;
  b.writeUInt16BE(17, o); o += 2;
  b[o++] = 8;
  b.writeUInt16BE(h, o); o += 2;
  b.writeUInt16BE(w, o); o += 2;
  return b.toString('base64');
}

function jpegWithSkip(w: number, h: number): string {
  // SOI + APP0 (marker 2B + length 2B + 18B payload) + SOF0 (marker 2B + length
  // 2B + precision 1B + height 2B + width 2B).
  const b = Buffer.alloc(2 + 22 + 9);
  b[0] = 0xff; b[1] = 0xd8;
  let o = 2;
  b[o++] = 0xff; b[o++] = 0xe0;
  b.writeUInt16BE(20, o); o += 2;
  o += 18;
  b[o++] = 0xff; b[o++] = 0xc0;
  b.writeUInt16BE(17, o); o += 2;
  b[o++] = 8;
  b.writeUInt16BE(h, o); o += 2;
  b.writeUInt16BE(w, o); o += 2;
  return b.toString('base64');
}

function webpVp8(w: number, h: number): string {
  const b = Buffer.alloc(30);
  b.write('RIFF', 0, 'ascii');
  b.write('WEBP', 8, 'ascii');
  b.write('VP8 ', 12, 'ascii');
  b[20] = 0x9d; b[21] = 0x01; b[22] = 0x2a;
  b.writeUInt16LE(w & 0x3fff, 26);
  b.writeUInt16LE(h & 0x3fff, 28);
  return b.toString('base64');
}

function webpVp8l(w: number, h: number): string {
  const b = Buffer.alloc(25);
  b.write('RIFF', 0, 'ascii');
  b.write('WEBP', 8, 'ascii');
  b.write('VP8L', 12, 'ascii');
  b[20] = 0x2f;
  b.writeUInt32LE(((w - 1) & 0x3fff) | (((h - 1) & 0x3fff) << 14), 21);
  return b.toString('base64');
}

function webpVp8x(w: number, h: number): string {
  const b = Buffer.alloc(30);
  b.write('RIFF', 0, 'ascii');
  b.write('WEBP', 8, 'ascii');
  b.write('VP8X', 12, 'ascii');
  const wm = (w - 1) & 0xffffff;
  const hm = (h - 1) & 0xffffff;
  b[24] = wm & 0xff; b[25] = (wm >> 8) & 0xff; b[26] = (wm >> 16) & 0xff;
  b[27] = hm & 0xff; b[28] = (hm >> 8) & 0xff; b[29] = (hm >> 16) & 0xff;
  return b.toString('base64');
}

// --- tests ----------------------------------------------------------------

describe('image header parsers', () => {
  it('reads PNG dimensions', () => {
    expect(getPngDimensions(png(320, 240))).toEqual({ widthPx: 320, heightPx: 240 });
    expect(getPngDimensions(png(1, 1))).toEqual({ widthPx: 1, heightPx: 1 });
  });

  it('reads GIF dimensions', () => {
    expect(getGifDimensions(gif(100, 50))).toEqual({ widthPx: 100, heightPx: 50 });
  });

  it('reads JPEG dimensions and skips non-SOF markers', () => {
    expect(getJpegDimensions(jpeg(640, 480))).toEqual({ heightPx: 480, widthPx: 640 });
    expect(getJpegDimensions(jpegWithSkip(800, 600))).toEqual({ heightPx: 600, widthPx: 800 });
    // progressive (SOF2)
    expect(getJpegDimensions(jpeg(320, 200, 0xc2))).toEqual({ heightPx: 200, widthPx: 320 });
  });

  it('accepts a JPEG whose SOF segment ends exactly at EOF', () => {
    // Regression: the loop used "offset < length - 9", which skipped the last
    // valid header position and returned null for this buffer.
    const b = jpegWithSkip(800, 600);
    expect(Buffer.from(b, 'base64').length % 1).toBe(0);
    expect(getJpegDimensions(b)).toEqual({ heightPx: 600, widthPx: 800 });
  });

  it('reads WebP dimensions for all three chunk types', () => {
    expect(getWebpDimensions(webpVp8(200, 100))).toEqual({ widthPx: 200, heightPx: 100 });
    expect(getWebpDimensions(webpVp8l(64, 32))).toEqual({ widthPx: 64, heightPx: 32 });
    expect(getWebpDimensions(webpVp8x(1000, 500))).toEqual({ widthPx: 1000, heightPx: 500 });
  });

  it('dispatches by mime type', () => {
    expect(getImageDimensions(png(320, 240), 'image/png')).toEqual({ widthPx: 320, heightPx: 240 });
    expect(getImageDimensions(gif(100, 50), 'image/gif')).toEqual({ widthPx: 100, heightPx: 50 });
    expect(getImageDimensions(jpeg(640, 480), 'image/jpeg')).toEqual({ heightPx: 480, widthPx: 640 });
    expect(getImageDimensions(webpVp8(200, 100), 'image/webp')).toEqual({ widthPx: 200, heightPx: 100 });
  });

  it('returns null for an unknown mime type', () => {
    expect(getImageDimensions(png(1, 1), 'image/bmp')).toBeNull();
    expect(getImageDimensions(png(1, 1), 'text/plain')).toBeNull();
  });

  it('reads a minimal (25-byte) VP8L file', () => {
    // Regression: a blanket "length < 30" guard rejected valid small VP8L.
    expect(getWebpDimensions(webpVp8l(64, 32))).toEqual({ widthPx: 64, heightPx: 32 });
  });

  it('returns null (never throws) for garbage', () => {
    const garbage = Buffer.from('not an image at all, just text here').toString('base64');
    for (const mime of ['image/png', 'image/jpeg', 'image/gif', 'image/webp']) {
      expect(getImageDimensions(garbage, mime), mime).toBeNull();
    }
    // Valid signature, truncated before the dimension fields.
    expect(getPngDimensions(png(320, 240).slice(0, 12))).toBeNull();
    expect(getGifDimensions('R0k=')).toBeNull();
    expect(getWebpDimensions('UklGRgAAAA==')).toBeNull();
  });
});

describe('calculateImageCellSize', () => {
  const cells = { widthPx: 9, heightPx: 18 };

  it('preserves the aspect ratio when only the width is bounded', () => {
    const out = calculateImageCellSize({ widthPx: 320, heightPx: 240 }, 80, undefined, cells);
    expect(out.columns).toBe(80);
    expect(out.rows).toBe(30); // 720x540 px keeps 4:3
  });

  it('shrinks to the tighter of the two bounds', () => {
    const out = calculateImageCellSize({ widthPx: 320, heightPx: 240 }, 80, 20, cells);
    expect(out.rows).toBe(20);
    expect(out.columns).toBe(54); // 480x360 px keeps 4:3
  });

  it('always yields at least one cell', () => {
    expect(calculateImageCellSize({ widthPx: 1, heightPx: 1 }, 1, 1, cells)).toEqual({ columns: 1, rows: 1 });
  });

  it('clamps a zero or fractional bound to at least one cell', () => {
    expect(calculateImageCellSize({ widthPx: 100, heightPx: 100 }, 0, undefined, cells).columns).toBe(1);
    expect(calculateImageCellSize({ widthPx: 100, heightPx: 100 }, 3.7, undefined, cells).columns).toBeLessThanOrEqual(3);
  });
});

describe('escapes and fallback', () => {
  it('wraps a hyperlink in OSC 8', () => {
    expect(hyperlink('label', 'https://x')).toBe('\x1b]8;;https://x\x1b\\label\x1b]8;;\x1b\\');
  });

  it('emits a kitty sequence with the requested params', () => {
    const out = encodeKitty('AAAA', { columns: 4, rows: 2, imageId: 7 });
    expect(out.startsWith('\x1b_G')).toBe(true);
    expect(out).toContain('a=T');
    expect(out).toContain('c=4');
    expect(out).toContain('r=2');
    expect(out).toContain('i=7');
    expect(out.endsWith('\x1b\\')).toBe(true);
  });

  it('chunks a large kitty payload with m=1/m=0', () => {
    const data = 'A'.repeat(4096 * 2 + 10);
    const out = encodeKitty(data);
    expect(out).toContain(',m=1;');
    expect(out).toContain('m=1;');
    expect(out.trimEnd().endsWith('m=0;')).toBe(false); // the last chunk ends with A's
    expect(out).toContain('m=0;');
  });

  it('emits an iterm2 sequence with an inline size', () => {
    const out = encodeITerm2('QUJD', { width: 10 });
    expect(out.startsWith('\x1b]1337;File=')).toBe(true);
    expect(out).toContain('inline=1');
    expect(out).toContain('size=3');
    expect(out).toContain('width=10');
    expect(out.endsWith('\x07')).toBe(true);
  });

  it('recognises image lines', () => {
    expect(isImageLine('\x1b_Ga=T\x1b\\')).toBe(true);
    expect(isImageLine('\x1b]1337;File=x\x07')).toBe(true);
    expect(isImageLine('plain text')).toBe(false);
  });

  it('describes an image as text when it cannot be shown', () => {
    const out = imageFallback('image/png', { widthPx: 320, heightPx: 240 }, '/tmp/a.png');
    expect(out).toContain('[image/png]');
    expect(out).toContain('320x240');
    expect(out.startsWith('[Ảnh:')).toBe(true);
  });
});

describe('truncateToWidthCompat (display-width aware)', () => {
  it('returns the text unchanged when it fits', () => {
    expect(truncateToWidthCompat('hello', 10)).toBe('hello');
    expect(truncateToWidthCompat('hello', 5)).toBe('hello');
  });

  it('truncates ASCII with an ellipsis', () => {
    expect(truncateToWidthCompat('hello world', 5)).toBe('he...');
  });

  it('measures columns, not UTF-16 code units', () => {
    // 4 code units, 8 display columns.
    const out = truncateToWidthCompat('你好世界', 5);
    expect(visibleWidth(out)).toBeLessThanOrEqual(5);
    expect(out).toBe('你...');
  });

  it('never returns more columns than requested', () => {
    for (const [text, width] of [['你好世界', 5], ['😀😀😀', 5], ['a😀b', 2], ['a😀b', 3], ['日本語テキスト', 7]] as const) {
      const out = truncateToWidthCompat(text, width);
      expect(visibleWidth(out), `${text} @${width} -> ${out}`).toBeLessThanOrEqual(width);
    }
  });

  it('keeps whole graphemes (no half emoji)', () => {
    const out = truncateToWidthCompat('😀😀😀', 5);
    expect(out).toBe('😀...');
    // Re-encoding must not produce a replacement character, i.e. no lone
    // surrogate was left behind.
    expect(Buffer.from(out, 'utf8').toString('utf8')).toBe(out);
    expect(out).not.toContain('\uFFFD');
  });

  it('handles zero and one column', () => {
    expect(truncateToWidthCompat('abc', 0)).toBe('');
    expect(truncateToWidthCompat('abc', 1)).toBe('a');
  });

  it('degrades to a hard cut when the ellipsis does not fit', () => {
    const out = truncateToWidthCompat('a😀b', 2);
    expect(visibleWidth(out)).toBeLessThanOrEqual(2);
    expect(out).not.toContain('...');
  });
});
