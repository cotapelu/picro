import { describe, it, expect } from 'vitest';
import {
  RGB,
  parseRgbAnsi,
  rgbTo256,
  rgbTo8,
  convertRgbAnsiTo256,
  convertRgbAnsiTo8,
  adaptThemeToTerminal,
} from '../color-fallback';
import type { Theme } from './themes';

describe('Color Fallback Utilities', () => {
  describe('parseRgbAnsi', () => {
    it('should parse foreground 24-bit color', () => {
      const code = '\x1b[38;2;255;128;64m';
      const rgb = parseRgbAnsi(code);
      expect(rgb).toEqual({ r: 255, g: 128, b: 64 });
    });

    it('should parse background 24-bit color', () => {
      const code = '\x1b[48;2;100;150;200m';
      const rgb = parseRgbAnsi(code);
      expect(rgb).toEqual({ r: 100, g: 150, b: 200 });
    });

    it('should return null for non-24-bit codes', () => {
      expect(parseRgbAnsi('\x1b[31m')).toBeNull(); // 8-bit red
      expect(parseRgbAnsi('\x1b[38;5;123m')).toBeNull(); // 256-color
      expect(parseRgbAnsi('normal text')).toBeNull();
    });

    it('should handle zero values', () => {
      const code = '\x1b[38;2;0;0;0m';
      const rgb = parseRgbAnsi(code);
      expect(rgb).toEqual({ r: 0, g: 0, b: 0 });
    });

    it('should handle max values', () => {
      const code = '\x1b[48;2;255;255;255m';
      const rgb = parseRgbAnsi(code);
      expect(rgb).toEqual({ r: 255, g: 255, b: 255 });
    });

    it('should ignore malformed codes', () => {
      expect(parseRgbAnsi('\x1b[38;2;m')).toBeNull();
      expect(parseRgbAnsi('\x1b[38;2;1;2m')).toBeNull();
    });
  });

  describe('rgbTo256', () => {
    it('should map black to close 256 color', () => {
      const idx = rgbTo256({ r: 0, g: 0, b: 0 });
      expect(idx).toBeGreaterThanOrEqual(16);
      expect(idx).toBeLessThanOrEqual(231);
    });

    it('should map white to close 256 color', () => {
      const idx = rgbTo256({ r: 255, g: 255, b: 255 });
      expect(idx).toBeGreaterThanOrEqual(16);
      expect(idx).toBeLessThanOrEqual(231);
    });

    it('should map red correctly', () => {
      const idx = rgbTo256({ r: 255, g: 0, b: 0 });
      // Red max in 6x6x6 cube is 5, so index = 16 + 5*36 + 0*6 + 0 = 196
      expect(idx).toBe(196);
    });

    it('should map green correctly', () => {
      const idx = rgbTo256({ r: 0, g: 255, b: 0 });
      // 16 + 0*36 + 5*6 + 0 = 46
      expect(idx).toBe(46);
    });

    it('should map blue correctly', () => {
      const idx = rgbTo256({ r: 0, g: 0, b: 255 });
      // 16 + 0*36 + 0*6 + 5 = 21
      expect(idx).toBe(21);
    });

    it('should handle mid-range colors', () => {
      // 128,128,128 -> each rounded to 3 (128/255*5 = 2.51 -> 3)
      // 16 + 3*36 + 3*6 + 3 = 16 + 108 + 18 + 3 = 145
      const idx = rgbTo256({ r: 128, g: 128, b: 128 });
      expect(idx).toBe(145);
    });

    it('should always be in range 16-231', () => {
      for (let r = 0; r <= 255; r += 51) {
        for (let g = 0; g <= 255; g += 51) {
          for (let b = 0; b <= 255; b += 51) {
            const idx = rgbTo256({ r, g, b });
            expect(idx).toBeGreaterThanOrEqual(16);
            expect(idx).toBeLessThanOrEqual(231);
          }
        }
      }
    });
  });

  describe('rgbTo8', () => {
    it('should return black for very dark colors', () => {
      const code = rgbTo8({ r: 10, g: 10, b: 10 });
      expect(code).toBe(30); // black
    });

    it('should return white for very bright unsaturated colors', () => {
      const code = rgbTo8({ r: 200, g: 200, b: 200 });
      expect(code).toBe(37); // white
    });

    it('should return red for red-dominant saturated', () => {
      const code = rgbTo8({ r: 255, g: 0, b: 0 });
      expect(code).toBe(31); // red
    });

    it('should return green for green-dominant saturated', () => {
      const code = rgbTo8({ r: 0, g: 255, b: 0 });
      expect(code).toBe(32); // green
    });

    it('should return blue for blue-dominant saturated', () => {
      const code = rgbTo8({ r: 0, g: 0, b: 255 });
      expect(code).toBe(34); // blue
    });

    it('should return white for yellow? Actually yellow is (255,255,0) -> dominant red and green, but algorithm picks one', () => {
      const code = rgbTo8({ r: 255, g: 255, b: 0 });
      // r>=g and r>=b -> red (31). Could also be yellow but we map to basic.
      expect([31, 32, 33, 34, 35, 36]).toContain(code);
    });

    it('should handle edge cases', () => {
      // If all channels equal, saturation=0 -> black/white based on lum
      const code1 = rgbTo8({ r: 128, g: 128, b: 128 });
      expect([30, 37]).toContain(code1);
    });

    it('should return values in 30-37 range', () => {
      for (let r = 0; r < 256; r += 50) {
        for (let g = 0; g < 256; g += 50) {
          for (let b = 0; b < 256; b += 50) {
            const code = rgbTo8({ r, g, b });
            expect(code).toBeGreaterThanOrEqual(30);
            expect(code).toBeLessThanOrEqual(37);
          }
        }
      }
    });
  });

  describe('convertRgbAnsiTo256', () => {
    it('should convert foreground 24-bit to 256-color', () => {
      const result = convertRgbAnsiTo256('\x1b[38;2;255;128;64m');
      expect(result).toMatch(/^\x1b\[38;5;\d+m$/);
      const idx = parseInt(result.match(/\d+/)![0], 10);
      expect(idx).toBeGreaterThanOrEqual(16);
    });

    it('should convert background 24-bit to 256-color', () => {
      const result = convertRgbAnsiTo256('\x1b[48;2;100;150;200m');
      expect(result).toMatch(/^\x1b\[48;5;\d+m$/);
    });

    it('should pass through non-24-bit codes unchanged', () => {
      const result = convertRgbAnsiTo256('\x1b[31m');
      expect(result).toBe('\x1b[31m');
    });

    it('should preserve numeric format', () => {
      const result = convertRgbAnsiTo256('\x1b[38;2;1;2;3m');
      expect(result).toBe(`\x1b[38;5;${rgbTo256({ r: 1, g: 2, b: 3 })}m`);
    });
  });

  describe('convertRgbAnsiTo8', () => {
    it('should convert foreground 24-bit to 8-color', () => {
      const result = convertRgbAnsiTo8('\x1b[38;2;255;0;0m');
      expect(result).toBe('\x1b[31m');
    });

    it('should convert background 24-bit to 8-color', () => {
      const result = convertRgbAnsiTo8('\x1b[48;2;0;255;0m');
      expect(result).toBe('\x1b[42m');
    });

    it('should pass through non-24-bit codes unchanged', () => {
      expect(convertRgbAnsiTo8('\x1b[38;5;123m')).toBe('\x1b[38;5;123m');
    });
  });

  describe('adaptThemeToTerminal', () => {
    const testTheme: Theme = {
      fg: '\x1b[38;2;255;255;255m',
      bg: '\x1b[48;2;0;0;0m',
      accent: '\x1b[38;2;255;128;0m',
      border: '\x1b[38;5;244m', // 256-color
    };

    it('should return original theme if trueColor is true', () => {
      const adapted = adaptThemeToTerminal(testTheme, true);
      expect(adapted.fg).toBe(testTheme.fg);
      expect(adapted.bg).toBe(testTheme.bg);
    });

    it('should convert 24-bit to 256-color when trueColor false but has256Color true', () => {
      const adapted = adaptThemeToTerminal(testTheme, false, true);
      expect(adapted.fg).toMatch(/^\x1b\[38;5;\d+m$/);
      expect(adapted.bg).toMatch(/^\x1b\[48;5;\d+m$/);
      expect(adapted.accent).toMatch(/^\x1b\[38;5;\d+m$/);
      expect(adapted.border).toBe(testTheme.border); // unchanged
    });

    it('should convert 24-bit to 8-color when trueColor false and has256Color false', () => {
      const adapted = adaptThemeToTerminal(testTheme, false, false);
      expect(adapted.fg).toMatch(/^\x1b\[3[0-7]m$/);
      expect(adapted.bg).toMatch(/^\x1b\[4[0-7]m$/);
    });

    it('should not modify non-string values', () => {
      const themeWithFn: Theme = {
        fg: '\x1b[38;2;255;255;255m',
        bg: '\x1b[48;2;0;0;0m',
        transform: (s: string) => s,
      } as any;
      const adapted = adaptThemeToTerminal(themeWithFn, false, true);
      expect(adapted.fg).not.toBe(themeWithFn.fg);
      expect(typeof (adapted as any).transform).toBe('function');
    });

    it('should handle theme with no 24-bit colors', () => {
      const simpleTheme: Theme = {
        fg: '\x1b[37m',
        bg: '\x1b[30m',
      } as any;
      const adapted = adaptThemeToTerminal(simpleTheme, false, true);
      expect(adapted.fg).toBe('\x1b[37m');
      expect(adapted.bg).toBe('\x1b[30m');
    });

    it('should handle empty theme', () => {
      const emptyTheme = {} as Theme;
      const adapted = adaptThemeToTerminal(emptyTheme, false, true);
      expect(adapted).toEqual({});
    });
  });

  describe('Edge Cases', () => {
    it('should handle RGB with values out of typical range', () => {
      const code = '\x1b[38;2;300;-10;100m';
      // parseRgbAnsi will parse as numbers, but rgbTo256 may produce NaN behavior if overflow
      const rgb = parseRgbAnsi(code);
      expect(rgb).toEqual({ r: 300, g: -10, b: 100 });
      // rgbTo256 uses Math.round((r/255)*5), may give out-of-range index
      const idx = rgbTo256(rgb);
      expect(Number.isInteger(idx)).toBe(true);
    });
  });
});
