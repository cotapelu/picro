/**
 * Color fallback utilities
 * Convert 24-bit RGB colors to 256-color or 8-color codes for terminals without truecolor.
 */

import type { Theme } from './themes';

export interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * Parse an ANSI 24-bit color code (\x1b[38;2;R;G;Bm or \x1b[48;2;R;G;Bm)
 * Returns {r,g,b} or null if not a 24-bit code
 */
export function parseRgbAnsi(code: string): RGB | null {
  // Foreground: \x1b[38;2;r;g;bm
  // Background: \x1b[48;2;r;g;bm
  const match = code.match(/^\x1b\[(4|3)8;2;(\d+);(\d+);(\d+)m$/);
  if (!match) return null;
  return {
    r: parseInt(match[2], 10),
    g: parseInt(match[3], 10),
    b: parseInt(match[4], 10),
  };
}

/**
 * Convert RGB to the nearest 256-color palette index.
 * Uses the standard xterm-256 palette.
 */
export function rgbTo256(rgb: RGB): number {
  // xterm 256-color palette: 0-15 are system colors, 16-231 are 6x6x6 color cube
  const { r, g, b } = rgb;

  // Check if it's a grayscale (16-231 range includes 24 grayscale from 232-255)
  // but we'll use the color cube approach for all colors

  // Normalize to 0-5 range for the 6x6x6 cube (colors 16-231)
  const ri = Math.round((r / 255) * 5);
  const gi = Math.round((g / 255) * 5);
  const bi = Math.round((b / 255) * 5);

  return 16 + ri * 36 + gi * 6 + bi;
}

/**
 * Convert RGB to the nearest 8-color ANSI code (30-37 for fg, 40-47 for bg)
 * Very basic reduction; useful for monochrome terminals.
 */
export function rgbTo8(rgb: RGB): number {
  // Simple luminance-based conversion to determine brightness
  const lum = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
  // Map to black, red, green, yellow, blue, magenta, cyan, white
  // We'll use standard colors: 30-37 for fg
  // Heuristic: if color is saturated, pick closest basic hue; else use white/black
  const maxVal = Math.max(rgb.r, rgb.g, rgb.b);
  const minVal = Math.min(rgb.r, rgb.g, rgb.b);
  const saturation = (maxVal - minVal) / 255;

  if (saturation < 0.3) {
    return lum > 127 ? 37 : 30; // white or black
  }

  // Determine dominant channel
  if (rgb.r >= rgb.g && rgb.r >= rgb.b) {
    return 31; // red
  } else if (rgb.g >= rgb.r && rgb.g >= rgb.b) {
    return 32; // green
  } else if (rgb.b >= rgb.r && rgb.b >= rgb.g) {
    return 34; // blue
  }
  return 37; // default white
}

/**
 * Convert a 24-bit ANSI code to a 256-color code.
 * Preserves whether it's foreground (38) or background (48).
 */
export function convertRgbAnsiTo256(code: string): string {
  const rgb = parseRgbAnsi(code);
  if (!rgb) return code; // not a 24-bit color

  const isFg = code.startsWith('\x1b[38;2;');
  const newIdx = rgbTo256(rgb);
  const prefix = isFg ? '\x1b[38;5;' : '\x1b[48;5;';
  return `${prefix}${newIdx}m`;
}

/**
 * Convert a 24-bit ANSI code to an 8-color code.
 */
export function convertRgbAnsiTo8(code: string): string {
  const rgb = parseRgbAnsi(code);
  if (!rgb) return code;

  const isFg = code.startsWith('\x1b[38;2;');
  const newIdx = rgbTo8(rgb);
  const ansiCode = isFg ? 30 + newIdx : 40 + newIdx;
  return `\x1b[${ansiCode}m`;
}

/**
 * Given a Theme object and terminal capabilities, produce a theme with fallbacks.
 * If trueColor is false, convert all 24-bit colors to 256-color codes.
 * If 256-color is also not available, could further reduce to 8-color.
 */
export function adaptThemeToTerminal(
  theme: Theme,
  trueColor: boolean,
  has256Color: boolean = true
): Theme {
  if (trueColor) {
    return theme;
  }

  // Check if any theme values are 24-bit codes
  const convert = (code: string) => {
    if (code.includes(';2;')) {
      if (has256Color) {
        return convertRgbAnsiTo256(code);
      } else {
        return convertRgbAnsiTo8(code);
      }
    }
    return code;
  };

  const result: Theme = {} as Theme;
  for (const key of Object.keys(theme)) {
    const value = (theme as any)[key];
    if (typeof value === 'string') {
      (result as any)[key] = convert(value);
    } else {
      (result as any)[key] = value;
    }
  }
  return result;
}
