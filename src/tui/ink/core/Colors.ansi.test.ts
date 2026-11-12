// SPDX-License-Identifier: Apache-2.0
/**
 * ANSI generation, 256-colour quantisation and colour-space round-trips.
 *
 * The okhsl regression this pins is in Colors.parse.test.ts; here the focus is on
 * the escape sequences the theme layer depends on (every coloured string in the UI
 * goes through foregroundAnsi/backgroundAnsi).
 */

import { describe, it, expect } from 'vitest';
import {
  backgroundAnsi,
  colorToHex,
  colorToOklch,
  colorToRgb,
  foregroundAnsi,
  indexedColor,
  mixColors,
  oklchColor,
  parseColor,
  rgbColor,
  rgbToOkhsl,
  styleText,
} from './Colors.js';

const RED = rgbColor(255, 0, 0);

describe('foregroundAnsi / backgroundAnsi', () => {
  it('uses 38;5;n for an indexed colour', () => {
    expect(foregroundAnsi(indexedColor(196), '256color')).toBe('\x1b[38;5;196m');
    expect(backgroundAnsi(indexedColor(196), '256color')).toBe('\x1b[48;5;196m');
  });

  it('uses 38;2;r;g;b in truecolor mode', () => {
    expect(foregroundAnsi(RED, 'truecolor')).toBe('\x1b[38;2;255;0;0m');
    expect(backgroundAnsi(RED, 'truecolor')).toBe('\x1b[48;2;255;0;0m');
  });

  it('rounds truecolor channels', () => {
    const c = { kind: 'rgb' as const, r: 18.4, g: 52.6, b: 85.5 };
    expect(foregroundAnsi(c, 'truecolor')).toBe('\x1b[38;2;18;53;86m');
  });

  it('quantises to the 256-cube', () => {
    const seq = (rgb: [number, number, number]) => {
      const m = /\x1b\[38;5;(\d+)m/.exec(foregroundAnsi({ kind: 'rgb', r: rgb[0], g: rgb[1], b: rgb[2] }, '256color'));
      return m ? Number(m[1]) : -1;
    };
    // Known xterm palette indices.
    expect(seq([255, 0, 0])).toBe(196);
    expect(seq([0, 255, 0])).toBe(46);
    expect(seq([0, 0, 255])).toBe(21);
    expect(seq([255, 255, 255])).toBe(231);
    expect(seq([0, 0, 0])).toBe(16);
    expect(seq([128, 128, 128])).toBe(244); // grey ramp, not the cube
    // The result is always a valid palette index.
    for (const v of [1, 17, 64, 127, 200, 254]) {
      const idx = seq([v, v, v]);
      expect(idx).toBeGreaterThanOrEqual(16);
      expect(idx).toBeLessThanOrEqual(255);
    }
  });

  it('routes indexed colours through the same index in both modes', () => {
    expect(foregroundAnsi(indexedColor(42), 'truecolor')).toBe('\x1b[38;5;42m');
  });
});

describe('styleText', () => {
  it('wraps text and closes both colour and attribute escapes', () => {
    const out = styleText('x', { fg: RED, bg: rgbColor(0, 0, 0), bold: true, italic: true }, 'truecolor');
    expect(out.startsWith('\x1b[38;2;255;0;0m')).toBe(true);
    expect(out).toContain('\x1b[48;2;0;0;0m');
    expect(out).toContain('\x1b[1m');
    expect(out).toContain('\x1b[3m');
    expect(out.endsWith('\x1b[23m\x1b[22m\x1b[49m\x1b[39m')).toBe(true);
    expect(out).toContain('x');
  });

  it('emits nothing but the text when no style is requested', () => {
    expect(styleText('x', {}, 'truecolor')).toBe('x');
  });

  it('closes attributes it opened', () => {
    expect(styleText('x', { underline: true }, 'truecolor')).toBe('\x1b[4mx\x1b[24m');
    expect(styleText('x', { inverse: true }, 'truecolor')).toBe('\x1b[7mx\x1b[27m');
    expect(styleText('x', { strikethrough: true }, 'truecolor')).toBe('\x1b[9mx\x1b[29m');
    expect(styleText('x', { dim: true }, 'truecolor')).toBe('\x1b[2mx\x1b[22m');
  });
});

describe('colour space round-trips', () => {
  it('rgb -> oklch -> hex stays close for in-gamut colours', () => {
    for (const [r, g, b] of [[255, 0, 0], [0, 128, 0], [32, 64, 200], [200, 200, 200]] as const) {
      const rgb = rgbColor(r, g, b);
      const { l, c, h } = colorToOklch(rgb);
      const back = colorToHex(oklchColor(l, c, h));
      expect(back).toBe(colorToHex(rgb));
    }
  });

  it('okhsl round-trips through rgbToOkhsl', () => {
    const cases: Array<[number, number, number]> = [
      [120, 0.5, 0.5],
      [295, 0.5, 0.67],
      [30, 1, 0.5],
      [210, 0.2, 0.3],
    ];
    for (const [h, s, l] of cases) {
      const rgb = parseColor(`okhsl(${h} ${s * 100}% ${l * 100}%)`);
      const back = rgbToOkhsl(rgb);
      const hueDelta = Math.abs(((back.h - h + 540) % 360) - 180);
      // A low-chroma, low-lightness colour has the least stable hue.
      expect(hueDelta, `hue for ${h}/${s}/${l}`).toBeLessThan(2.5);
      expect(Math.abs(back.s - s)).toBeLessThan(0.02);
      expect(Math.abs(back.l - l)).toBeLessThan(0.02);
    }
  });
});
