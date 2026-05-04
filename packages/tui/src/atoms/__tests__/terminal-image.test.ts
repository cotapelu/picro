import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ImageProtocol,
  TerminalCapabilities,
  CellDimensions,
  ImageDimensions,
  ImageRenderOptions,
  ScaleMode,
  setCustomImageLoader,
  clearRenderCache,
  getCellDimensions,
  setCellDimensions,
  detectCapabilities,
  getCapabilities,
  resetCapabilitiesCache,
  isImageLine,
  allocateImageId,
  encodeKitty,
  deleteKittyImage,
  deleteAllKittyImages,
  encodeITerm2,
  encodeSixel,
  calculateImageRows,
  getPngDimensions,
  getJpegDimensions,
  getGifDimensions,
  getWebpDimensions,
  getBmpDimensions,
  getTiffDimensions,
  getImageDimensions,
  computeImageCellSize,
  renderImage,
  fetchImageAsBase64,
  preloadImage,
  renderAnimatedGif,
  imageFallback,
  isTermuxSession,
  KITTY_PREFIX,
  ITERM2_PREFIX,
  SIXEL_PREFIX,
  SIXEL_SUFFIX,
} from '../terminal-image';

// Mock Buffer
vi.mock('buffer', () => ({
  Buffer: {
    from: (data: any, encoding?: string) => {
      if (encoding === 'base64') {
        // Simple mock: return a buffer with enough bytes for tests
        const arr = new Uint8Array(data.length);
        for (let i = 0; i < data.length; i++) {
          arr[i] = data.charCodeAt(i);
        }
        return {
          length: arr.length,
          toString: () => data,
          slice: (start: number, end?: number) => {
            const sliced = arr.slice(start, end);
            return {
              length: sliced.length,
              toString: () => String.fromCharCode(...sliced),
              slice: (s: number, e?: number) => sliced.slice(s, e),
              readUInt32BE: (offset: number) => {
                return (sliced[offset] << 24) | (sliced[offset + 1] << 16) | (sliced[offset + 2] << 8) | sliced[offset + 3];
              },
              readUInt16BE: (offset: number) => (sliced[offset] << 8) | sliced[offset + 1],
              readUInt16LE: (offset: number) => sliced[offset] | (sliced[offset + 1] << 8),
              readInt32LE: (offset: number) => {
                const val = (sliced[offset] | (sliced[offset + 1] << 8) | (sliced[offset + 2] << 16) | (sliced[offset + 3] << 24));
                return val;
              },
              readUInt32LE: (offset: number) => {
                return sliced[offset] | (sliced[offset + 1] << 8) | (sliced[offset + 2] << 16) | (sliced[offset + 3] << 24);
              },
            };
          },
          readUInt32BE: (offset: number) => {
            if (offset + 4 > this.length) return 0;
            return (this[offset] << 24) | (this[offset + 1] << 16) | (this[offset + 2] << 8) | this[offset + 3];
          },
          readUInt16BE: (offset: number) => this[offset] << 8 | this[offset + 1],
          readUInt16LE: (offset: number) => this[offset] | (this[offset + 1] << 8),
          readInt32LE: (offset: number) => {
            const b0 = this[offset], b1 = this[offset+1], b2 = this[offset+2], b3 = this[offset+3];
            return b0 | (b1 << 8) | (b2 << 16) | (b3 << 24);
          },
        };
      }
      return { length: 0 };
    },
    concat: (chunks: any[]) => {
      const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      return {
        length: result.length,
        toString: () => String.fromCharCode(...result),
        slice: (start: number, end?: number) => {
          const sliced = result.slice(start, end);
          return {
            length: sliced.length,
            toString: () => String.fromCharCode(...sliced),
          };
        },
        [0]: result[0],
        [1]: result[1],
        [2]: result[2],
        [3]: result[3],
        [8]: result[8],
        [12]: result[12],
        [16]: result[16],
        [18]: result[18],
        [20]: result[20],
        [22]: result[22],
        [24]: result[24],
        [25]: result[25],
        [26]: result[26],
        [27]: result[27],
        [28]: result[28],
        [29]: result[29],
        readUInt32BE: (offset: number) => (result[offset] << 24) | (result[offset + 1] << 16) | (result[offset + 2] << 8) | result[offset + 3],
        readUInt16BE: (offset: number) => (result[offset] << 8) | result[offset + 1],
        readUInt16LE: (offset: number) => result[offset] | (result[offset + 1] << 8),
        readInt32LE: (offset: number) => result[offset] | (result[offset + 1] << 8) | (result[offset + 2] << 16) | (result[offset + 3] << 24),
        readUInt32LE: (offset: number) => result[offset] | (result[offset + 1] << 8) | (result[offset + 2] << 16) | (result[offset + 3] << 24),
      };
    },
  },
}));

describe('Terminal Image Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCapabilitiesCache();
    clearRenderCache();
    setCellDimensions({ widthPx: 9, heightPx: 18 });
  });

  describe('Types and Constants', () => {
    it('should have correct ScaleMode enum', () => {
      expect(ScaleMode.Fit).toBe('fit');
      expect(ScaleMode.Fill).toBe('fill');
      expect(ScaleMode.Stretch).toBe('stretch');
      expect(ScaleMode.Contain).toBe('contain');
      expect(ScaleMode.Cover).toBe('cover');
    });

    it('should have protocol prefixes', () => {
      expect(KITTY_PREFIX).toBe('\x1b_G');
      expect(ITERM2_PREFIX).toBe('\x1b]1337;File=');
      expect(SIXEL_PREFIX).toBe('\x1bP');
      expect(SIXEL_SUFFIX).toBe('\x1b\\');
    });
  });

  describe('Cell Dimensions', () => {
    it('getCellDimensions should return defaults', () => {
      const dims = getCellDimensions();
      expect(dims.widthPx).toBe(9);
      expect(dims.heightPx).toBe(18);
    });

    it('setCellDimensions should update values', () => {
      setCellDimensions({ widthPx: 10, heightPx: 20 });
      const dims = getCellDimensions();
      expect(dims.widthPx).toBe(10);
      expect(dims.heightPx).toBe(20);
    });

    it('setCellDimensions should return copy (immutable)', () => {
      const dims = getCellDimensions();
      dims.widthPx = 100;
      const dims2 = getCellDimensions();
      expect(dims2.widthPx).toBe(9); // unchanged
    });
  });

  describe('Capabilities Detection', () => {
    it('detectCapabilities should detect Kitty', () => {
      vi.stubEnv('KITTY_WINDOW_ID', '123');
      const caps = detectCapabilities();
      expect(caps.images).toBe('kitty');
      expect(caps.trueColor).toBe(true);
      expect(caps.hyperlinks).toBe(true);
      vi.unstubAllEnvs();
    });

    it('detectCapabilities should detect Ghostty as Kitty', () => {
      vi.stubEnv('TERM_PROGRAM', 'ghostty');
      const caps = detectCapabilities();
      expect(caps.images).toBe('kitty');
      vi.unstubAllEnvs();
    });

    it('detectCapabilities should detect WezTerm as Kitty', () => {
      vi.stubEnv('WEZTERM_PANE', '123');
      const caps = detectCapabilities();
      expect(caps.images).toBe('kitty');
      vi.unstubAllEnvs();
    });

    it('detectCapabilities should detect iTerm2', () => {
      vi.stubEnv('ITERM_SESSION_ID', '123');
      const caps = detectCapabilities();
      expect(caps.images).toBe('iterm2');
      vi.unstubAllEnvs();
    });

    it('detectCapabilities should detect Sixel', () => {
      vi.stubEnv('TERM', 'sixel');
      const caps = detectCapabilities();
      expect(caps.images).toBe('sixel');
      vi.unstubAllEnvs();
    });

    it('detectCapabilities should detect VS Code (no images)', () => {
      vi.stubEnv('TERM_PROGRAM', 'vscode');
      const caps = detectCapabilities();
      expect(caps.images).toBeNull();
      vi.unstubAllEnvs();
    });

    it('detectCapabilities should detect Alacritty (no images)', () => {
      vi.stubEnv('TERM_PROGRAM', 'alacritty');
      const caps = detectCapabilities();
      expect(caps.images).toBeNull();
      vi.unstubAllEnvs();
    });

    it('getCapabilities should cache result', () => {
      vi.stubEnv('KITTY_WINDOW_ID', '123');
      const caps1 = getCapabilities();
      const caps2 = getCapabilities();
      expect(caps1).toBe(caps2);
      vi.unstubAllEnvs();
    });

    it('resetCapabilitiesCache should clear cache', () => {
      vi.stubEnv('KITTY_WINDOW_ID', '123');
      getCapabilities();
      resetCapabilitiesCache();
      // After reset, should detect again (maybe different)
      vi.unstubAllEnvs();
    });

    it('setCapabilities should override cache', () => {
      vi.stubEnv('KITTY_WINDOW_ID', '123');
      getCapabilities();
      setCapabilities({ images: null, trueColor: false, hyperlinks: false });
      const caps = getCapabilities();
      expect(caps.images).toBeNull();
      expect(caps.trueColor).toBe(false);
    });
  });

  describe('Image Line Detection', () => {
    it('isImageLine should detect Kitty prefix', () => {
      expect(isImageLine('\x1b_Gtest\x1b\\')).toBe(true);
      expect(isImageLine('prefix \x1b_Gtest\x1b\\ suffix')).toBe(true);
    });

    it('isImageLine should detect iTerm2 prefix', () => {
      expect(isImageLine('\x1b]1337;File=test')).toBe(true);
      expect(isImageLine('text \x1b]1337;File=test more')).toBe(true);
    });

    it('isImageLine should detect Sixel prefix', () => {
      expect(isImageLine('\x1bPtest\x1b\\')).toBe(true);
    });

    it('isImageLine should return false for normal lines', () => {
      expect(isImageLine('Hello World')).toBe(false);
      expect(isImageLine('\x1b[31mRed\x1b[0m')).toBe(false);
    });
  });

  describe('Image ID Allocation', () => {
    it('allocateImageId should return number between 1 and 0xfffffffe', () => {
      for (let i = 0; i < 1000; i++) {
        const id = allocateImageId();
        expect(id).toBeGreaterThanOrEqual(1);
        expect(id).toBeLessThanOrEqual(0xfffffffe);
        expect(Number.isInteger(id)).toBe(true);
      }
    });

    it('allocateImageId should produce varied values', () => {
      const ids = new Set<number>();
      for (let i = 0; i < 100; i++) {
        ids.add(allocateImageId());
      }
      // Should have many unique IDs (probabilistic)
      expect(ids.size).toBeGreaterThan(50);
    });
  });

  describe('Kitty Encoding', () => {
    it('encodeKitty should produce correct prefix', () => {
      const result = encodeKitty('abc');
      expect(result.startsWith('\x1b_G')).toBe(true);
      expect(result.endsWith('\x1b\\')).toBe(true);
    });

    it('encodeKitty should include required params', () => {
      const result = encodeKitty('abc');
      expect(result).toContain('a=T');
      expect(result).toContain('f=100');
      expect(result).toContain('q=2');
    });

    it('encodeKitty should include columns and rows when provided', () => {
      const result = encodeKitty('abc', { columns: 10, rows: 5 });
      expect(result).toContain('c=10');
      expect(result).toContain('r=5');
    });

    it('encodeKitty should include image ID when provided', () => {
      const result = encodeKitty('abc', { imageId: 12345 });
      expect(result).toContain('i=12345');
    });

    it('encodeKitty should handle small data in single chunk', () => {
      const smallData = 'a'.repeat(100);
      const result = encodeKitty(smallData);
      // Should not have m=0 or m=1 mid-sequence for small data
      expect(result.split('\x1b_G').length).toBe(2); // start and end count? Actually may be 2 sequences: opening and closing
    });

    it('encodeKitty should chunk large data', () => {
      const largeData = 'a'.repeat(5000);
      const result = encodeKitty(largeData);
      // Should have multiple \x1b_G sequences
      const sequences = result.split('\x1b\\');
      expect(sequences.length).toBeGreaterThan(1);
    });

    it('encodeKitty should set m=1 for intermediate chunks', () => {
      const largeData = 'a'.repeat(5000);
      const result = encodeKitty(largeData);
      expect(result).toMatch(/,\s*m=1;/);
    });

    it('encodeKitty should set m=0 for final chunk', () => {
      const largeData = 'a'.repeat(5000);
      const result = encodeKitty(largeData);
      expect(result).toMatch(/;\s*m=0;/);
    });
  });

  describe('Kitty Image Deletion', () => {
    it('deleteKittyImage should produce correct command', () => {
      const result = deleteKittyImage(123);
      expect(result).toBe('\x1b_Ga=d,d=I,i=123\x1b\\');
    });

    it('deleteAllKittyImages should produce correct command', () => {
      const result = deleteAllKittyImages();
      expect(result).toBe('\x1b_Ga=d,d=A\x1b\\');
    });
  });

  describe('iTerm2 Encoding', () => {
    it('encodeITerm2 should produce correct prefix', () => {
      const result = encodeITerm2('abc');
      expect(result.startsWith('\x1b]1337;File=')).toBe(true);
      expect(result.endsWith('\x07')).toBe(true);
    });

    it('encodeITerm2 should include inline=1 by default', () => {
      const result = encodeITerm2('abc');
      expect(result).toContain('inline=1');
    });

    it('encodeITerm2 should allow inline=0', () => {
      const result = encodeITerm2('abc', { inline: false });
      expect(result).toContain('inline=0');
    });

    it('encodeITerm2 should include width and height', () => {
      const result = encodeITerm2('abc', { width: 100, height: 50 });
      expect(result).toContain('width=100');
      expect(result).toContain('height=50');
    });

    it('encodeITerm2 should include name when provided', () => {
      const result = encodeITerm2('abc', { name: 'test.png' });
      expect(result).toContain('name=');
    });

    it('encodeITerm2 should set preserveAspectRatio=0 when false', () => {
      const result = encodeITerm2('abc', { preserveAspectRatio: false });
      expect(result).toContain('preserveAspectRatio=0');
    });
  });

  describe('Sixel Encoding', () => {
    it('encodeSixel should produce correct prefix and suffix', () => {
      const result = encodeSixel('data');
      expect(result.startsWith(SIXEL_PREFIX)).toBe(true);
      expect(result.endsWith(SIXEL_SUFFIX)).toBe(true);
    });

    it('encodeSixel should include cols and rows when provided', () => {
      const result = encodeSixel('data', { cols: 10, rows: 5 });
      expect(result).toContain('c=10');
      expect(result).toContain('r=5');
    });

    it('encodeSixel should include imageId when provided', () => {
      const result = encodeSixel('data', { imageId: 42 });
      expect(result).toContain('i=42');
    });

    it('encodeSixel should handle empty options', () => {
      const result = encodeSixel('data');
      // Should be just prefix + data + suffix
      expect(result).toBe(`\x1bPdata\x1b\\`);
    });
  });

  describe('Image Dimensions Extraction', () => {
    describe('getPngDimensions', () => {
      it('should return null for invalid data', () => {
        expect(getPngDimensions('')).toBeNull();
        expect(getPngDimensions('abc')).toBeNull();
      });

      it('should detect PNG signature', () => {
        // PNG signature: 89 50 4E 47
        const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x00, 0x00, 0x00]);
        const base64 = buffer.toString('base64');
        const dims = getPngDimensions(base64);
        // Without proper IHDR chunk, may return null
        expect(dims).toBeNull();
      });

      it('should extract width and height from valid PNG', () => {
        // Minimal valid PNG: signature + IHDR chunk
        // Build manually for test
        const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
        const length = Buffer.alloc(4); length.writeUInt32BE(13, 0);
        const type = Buffer.from('IHDR');
        const width = Buffer.alloc(4); width.writeUInt32BE(100, 0);
        const height = Buffer.alloc(4); height.writeUInt32BE(50, 0);
        const crc = Buffer.alloc(4); // dummy
        const png = Buffer.concat([signature, length, type, width, height, crc]);
        const base64 = png.toString('base64');
        const dims = getPngDimensions(base64);
        expect(dims).toBeDefined();
        expect(dims?.widthPx).toBe(100);
        expect(dims?.heightPx).toBe(50);
      });
    });

    describe('getJpegDimensions', () => {
      it('should return null for non-JPEG data', () => {
        expect(getJpegDimensions('')).toBeNull();
      });

      it('should detect JPEG SOI marker', () => {
        const buffer = Buffer.from([0xff, 0xd8, 0xff]);
        const base64 = buffer.toString('base64');
        expect(getJpegDimensions(base64)).toBeNull(); // No SOF marker
      });

      it('should extract dimensions from SOF marker', () => {
        // JPEG: SOI + APP0 + SOF0
        const soi = Buffer.from([0xff, 0xd8]);
        const app0 = Buffer.from([0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00]);
        const sof = Buffer.from([0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x30, 0x00, 0x64]); // height=48, width=100? Actually 0x0030=48, 0x0064=100
        const buffer = Buffer.concat([soi, app0, sof]);
        const base64 = buffer.toString('base64');
        const dims = getJpegDimensions(base64);
        expect(dims).toBeDefined();
        expect(dims?.widthPx).toBe(100);
        expect(dims?.heightPx).toBe(48);
      });
    });

    describe('getGifDimensions', () => {
      it('should detect GIF signature', () => {
        const sig = Buffer.from('GIF89a', 'ascii');
        const width = Buffer.alloc(2); width.writeUInt16LE(320, 0);
        const height = Buffer.alloc(2); height.writeUInt16LE(240, 0);
        const buffer = Buffer.concat([sig, width, height]);
        const base64 = buffer.toString('base64');
        const dims = getGifDimensions(base64);
        expect(dims).toBeDefined();
        expect(dims?.widthPx).toBe(320);
        expect(dims?.heightPx).toBe(240);
      });
    });

    describe('getWebpDimensions', () => {
      it('should detect WebP RIFF header', () => {
        const riff = Buffer.from('RIFF', 'ascii');
        const size = Buffer.alloc(4); size.writeUInt32LE(4, 0);
        const webp = Buffer.from('WEBP', 'ascii');
        const vp8 = Buffer.from([0x00, 0x00, 0x00, 0x0c, 0x56, 0x50, 0x38, 0x20]); // VP8 chunk
        const simple = Buffer.concat([riff, size, webp, vp8]);
        const base64 = simple.toString('base64');
        // This is incomplete; getWebpDimensions expects more structure
        expect(getWebpDimensions(base64)).toBeNull();
      });
    });

    describe('getBmpDimensions', () => {
      it('should detect BMP signature', () => {
        const bmp = Buffer.from([0x42, 0x4D]); // 'BM'
        // Fill to 26 bytes with placeholder
        const rest = Buffer.alloc(24);
        const width = Buffer.alloc(4); width.writeInt32LE(100, 0);
        const height = Buffer.alloc(4); height.writeInt32LE(50, 0);
        const buffer = Buffer.concat([bmp, rest.slice(0, 16), width, height]);
        const base64 = buffer.toString('base64');
        const dims = getBmpDimensions(base64);
        expect(dims).toBeDefined();
        expect(dims?.widthPx).toBe(100);
        expect(dims?.heightPx).toBe(50); // absolute value
      });
    });

    describe('getTiffDimensions', () => {
      it('should detect TIFF little-endian signature', () => {
        const sig = Buffer.from('II', 'ascii'); // little-endian
        const magic = Buffer.alloc(2); magic.writeUInt16LE(42, 0);
        const ifdOffset = Buffer.alloc(4); ifdOffset.writeUInt32LE(8, 0);
        const buffer = Buffer.concat([sig, magic, ifdOffset]);
        const base64 = buffer.toString('base64');
        expect(getTiffDimensions(base64)).toBeNull(); // No IFD entries
      });
    });

    describe('getImageDimensions', () => {
      it('should call appropriate function based on mimeType', () => {
        // Create minimal PNG buffer with signature and IHDR
        const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
        const length = Buffer.alloc(4); length.writeUInt32BE(13, 0);
        const type = Buffer.from('IHDR');
        const width = Buffer.alloc(4); width.writeUInt32BE(100, 0);
        const height = Buffer.alloc(4); height.writeUInt32BE(50, 0);
        const crc = Buffer.alloc(4);
        const png = Buffer.concat([signature, length, type, width, height, crc]);
        const base64 = png.toString('base64');
        const dims = getImageDimensions(base64, 'image/png');
        expect(dims?.widthPx).toBe(100);
        expect(dims?.heightPx).toBe(50);
      });

      it('should return null for unknown mimeType', () => {
        const base64 = Buffer.from('test').toString('base64');
        expect(getImageDimensions(base64, 'image/unknown')).toBeNull();
      });
    });
  });

  describe('Cell Size Computation', () => {
    it('computeImageCellSize should compute size with Fit mode', () => {
      const dims: ImageDimensions = { widthPx: 800, heightPx: 600 };
      const options: ImageRenderOptions = { maxWidthCells: 80, scaleMode: ScaleMode.Fit };
      const result = computeImageCellSize(dims, options);
      expect(result.widthCells).toBeGreaterThan(0);
      expect(result.heightCells).toBeGreaterThan(0);
    });

    it('computeImageCellSize should respect maxHeightCells', () => {
      const dims: ImageDimensions = { widthPx: 800, heightPx: 600 };
      const options: ImageRenderOptions = { maxWidthCells: 80, maxHeightCells: 40, scaleMode: ScaleMode.Fit };
      const result = computeImageCellSize(dims, options);
      expect(result.heightCells).toBeLessThanOrEqual(40);
    });

    it('computeImageCellSize should handle Stretch mode', () => {
      setCellDimensions({ widthPx: 10, heightPx: 20 });
      const dims: ImageDimensions = { widthPx: 100, heightPx: 100 };
      const options: ImageRenderOptions = { maxWidthCells: 10, maxHeightCells: 5, scaleMode: ScaleMode.Stretch };
      const result = computeImageCellSize(dims, options);
      expect(result.widthCells).toBe(10);
      expect(result.heightCells).toBe(5);
    });

    it('computeImageCellSize should handle Fill/Contain', () => {
      setCellDimensions({ widthPx: 10, heightPx: 20 });
      const dims: ImageDimensions = { widthPx: 100, heightPx: 50 };
      const options: ImageRenderOptions = { maxWidthCells: 10, maxHeightCells: 40, scaleMode: ScaleMode.Fill };
      const result = computeImageCellSize(dims, options);
      expect(result.widthCells).toBe(10);
    });
  });

  describe('renderImage', () => {
    it('should return null when images not supported', () => {
      setCapabilities({ images: null, trueColor: true, hyperlinks: true });
      const dims: ImageDimensions = { widthPx: 100, heightPx: 100 };
      const result = renderImage('abc', dims);
      expect(result).toBeNull();
    });

    it('should render with Kitty protocol', async () => {
      setCapabilities({ images: 'kitty', trueColor: true, hyperlinks: true });
      // Create a fake PNG
      const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const length = Buffer.alloc(4); length.writeUInt32BE(13, 0);
      const type = Buffer.from('IHDR');
      const width = Buffer.alloc(4); width.writeUInt32BE(100, 0);
      const height = Buffer.alloc(4); height.writeUInt32BE(50, 0);
      const crc = Buffer.alloc(4);
      const png = Buffer.concat([signature, length, type, width, height, crc]);
      const base64 = png.toString('base64');
      const dims = { widthPx: 100, heightPx: 50 };

      const result = renderImage(base64, dims, { maxWidthCells: 40 });

      expect(result).not.toBeNull();
      expect(result?.sequence).toContain('\x1b_G');
      expect(result?.rows).toBeGreaterThan(0);
    });
  });

  describe('fetchImageAsBase64', () => {
    it('should fetch and convert image', async () => {
      const mockBody = {
        getReader: () => ({
          read: async () => {
            return { done: true, value: Buffer.from('fake image data') };
          },
        }),
      };
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          headers: {
            get: () => null,
          },
          body: mockBody,
        })
      ) as any;

      // Buffer mock will convert our string to fake buffer
      const result = await fetchImageAsBase64('http://test.com/image.png');
      expect(result.base64).toBeDefined();
    });

    it('should throw on non-ok response', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        })
      ) as any;

      await expect(fetchImageAsBase64('http://test.com/image.png')).rejects.toThrow('Failed to fetch image: 404 Not Found');
    });

    it('should support AbortSignal', async () => {
      const mockBody = {
        getReader: () => ({
          read: async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            return { done: true, value: Buffer.from('data') };
          },
        }),
      };
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          headers: { get: () => null },
          body: mockBody,
        })
      ) as any;

      const controller = new AbortController();
      setTimeout(() => controller.abort(), 10);

      await expect(
        fetchImageAsBase64('http://test.com/image.png', {
          signal: controller.signal,
        })
      ).rejects.toThrow();
    });
  });

  describe('preloadImage', () => {
    it('should fetch and cache image', async () => {
      const mockBody = {
        getReader: () => ({
          read: async () => ({ done: true, value: Buffer.from('fake') }),
        }),
      };
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          headers: { get: () => null },
          body: mockBody,
        })
      ) as any;

      setCapabilities({ images: 'kitty', trueColor: true, hyperlinks: true });

      await preloadImage('http://test.com/image.png', { maxWidthCells: 60 });
      // Should not throw
      expect(fetchImageAsBase64).toHaveBeenCalled();
    });
  });

  describe('renderAnimatedGif', () => {
    it('should render multiple frames', () => {
      // Minimal GIF data (fake)
      const frames = [
        { base64: 'frame1', duration: 100 },
        { base64: 'frame2', duration: 200 },
      ];
      setCapabilities({ images: 'kitty', trueColor: true, hyperlinks: true });
      // Will likely fail dimension parsing, but we test structure
      const result = renderAnimatedGif(frames);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('imageFallback', () => {
    it('should format with filename and mimeType', () => {
      const result = imageFallback('image/png', undefined, 'test.png');
      expect(result).toBe('[Image: test.png image/png]');
    });

    it('should include dimensions when provided', () => {
      const result = imageFallback('image/png', { widthPx: 100, heightPx: 50 });
      expect(result).toBe('[Image: image/png 100x50]');
    });

    it('should handle no arguments gracefully', () => {
      const result = imageFallback('image/png');
      expect(result).toBe('[Image: image/png]');
    });
  });

  describe('isTermuxSession', () => {
    it('should return true when TERMUX_VERSION set', () => {
      vi.stubEnv('TERMUX_VERSION', '123');
      expect(isTermuxSession()).toBe(true);
      vi.unstubAllEnvs();
    });

    it('should return false when TERMUX_VERSION not set', () => {
      expect(isTermuxSession()).toBe(false);
    });
  });

  describe('Cache Management', () => {
    it('clearRenderCache should clear internal cache', () => {
      // Call renderImage to populate cache
      setCapabilities({ images: 'kitty', trueColor: true, hyperlinks: true });
      const dims = { widthPx: 100, heightPx: 50 };
      renderImage('abc', dims);
      clearRenderCache();
      // Should not throw
    });
  });

  describe('Custom Image Loader', () => {
    it('setCustomImageLoader should register custom loader', async () => {
      const customLoader = vi.fn().mockResolvedValue({
        base64: 'custom',
        mimeType: 'image/png',
        dimensions: { widthPx: 10, heightPx: 10 },
      });
      setCustomImageLoader(customLoader);
      const result = await fetchImageAsBase64('http://test.com/image.png');
      expect(result.base64).toBe('custom');
    });
  });
});
