// SPDX-License-Identifier: Apache-2.0
/**
 * parseColor / colour-space parsing.
 *
 * OKHSL_PATTERN only allowed a "%" after the hue while the branch indexed the
 * groups as if saturation and lightness had one too:
 *   - "okhsl(295 50% 67%)" - the syntax every built-in theme uses - did not match
 *     at all, so parseColor() threw and no theme could be loaded;
 *   - the unitless form read the saturation group as a boolean and the lightness
 *     group as the saturation, so saturation collapsed to NaN and was rendered as
 *     0: every okhsl colour came out grey.
 */

import { describe, it, expect } from 'vitest';
import { parseColor, colorToHex, colorToOklch, okhslToRgb, oklchColor } from './Colors.js';

describe('parseColor', () => {
  it('parses 3- and 6-digit hex', () => {
    expect(colorToHex(parseColor('#fff'))).toBe('#ffffff');
    expect(colorToHex(parseColor('#ff0000'))).toBe('#ff0000');
  });

  it('parses an ANSI index', () => {
    expect(colorToHex(parseColor(1))).toBe('#800000');
    expect(parseColor(196).kind).toBe('indexed');
  });

  it('parses oklch with and without a percent lightness', () => {
    expect(parseColor('oklch(0.5 0.1 200)').kind).toBe('oklch');
    expect(parseColor('oklch(50% 0.1 200)').kind).toBe('oklch');
    expect(colorToHex(parseColor('oklch(50% 0.1 200)'))).toBe(colorToHex(parseColor('oklch(0.5 0.1 200)')));
  });

  describe('okhsl (percent syntax used by the built-in themes)', () => {
    it('parses the percent form without throwing', () => {
      expect(() => parseColor('okhsl(295 50% 67%)')).not.toThrow();
    });

    it('parses the percent form to a stable colour', () => {
      expect(colorToHex(parseColor('okhsl(295 50% 67%)'))).toBe('#c0b6e5');
    });

    it('honours the hue', () => {
      // A fully saturated okhsl red/green/blue must differ.
      const red = colorToHex(parseColor('okhsl(0 100% 50%)'));
      const green = colorToHex(parseColor('okhsl(120 100% 50%)'));
      const blue = colorToHex(parseColor('okhsl(240 100% 50%)'));
      expect(new Set([red, green, blue]).size).toBe(3);
    });

    it('honours the saturation numerically', () => {
      // okhsl(120 100% 50%) is a saturated green; the same colour at 0% is grey.
      const hex = colorToHex(parseColor('okhsl(120 100% 50%)'));
      expect(hex).not.toBe('#808080');
      // 0% saturation is a grey; okhsl lightness is perceptual, so 50% lands on
      // #8b8b8b rather than a linear 0.5.
      const grey = colorToHex(parseColor('okhsl(120 0% 50%)'));
      expect(grey).toBe('#8b8b8b');
    });

    it('honours the lightness', () => {
      const dark = colorToHex(parseColor('okhsl(120 50% 20%)'));
      const light = colorToHex(parseColor('okhsl(120 50% 80%)'));
      expect(dark).not.toBe(light);
    });

    it('parses the unitless form', () => {
      // h is in degrees, s and l are 0..1.
      expect(colorToHex(parseColor('okhsl(120 1 0.5)'))).toBe(colorToHex(okhslToRgb(120, 1, 0.5)));
    });

    it('accepts a percent on the hue only', () => {
      expect(() => parseColor('okhsl(50% 50 50)')).not.toThrow();
    });

    it('round-trips through rgbToOkhsl-free comparison with okhslToRgb', () => {
      expect(colorToHex(parseColor('okhsl(231 57% 65%)'))).toBe(colorToHex(okhslToRgb(231, 0.57, 0.65)));
    });
  });

  it('rejects malformed colour values', () => {
    expect(() => parseColor('okhsl(295 50% 67')).toThrow();
    expect(() => parseColor('rgb(1,2,3)')).toThrow();
    expect(() => parseColor('nonsense')).toThrow();
    expect(() => parseColor('')).toThrow();
  });
});

describe('oklch invariants', () => {
  it('normalises the hue into 0..360', () => {
    expect(oklchColor(0.5, 0.1, 370).h).toBe(10);
    expect(oklchColor(0.5, 0.1, -10).h).toBe(350);
  });

  it('rejects out-of-range lightness and negative chroma', () => {
    expect(() => oklchColor(1.5, 0.1, 0)).toThrow();
    expect(() => oklchColor(-0.1, 0.1, 0)).toThrow();
    expect(() => oklchColor(0.5, -0.1, 0)).toThrow();
  });

  it('reports an oklch lightness in 0..1', () => {
    // colorToOklch round-trips through the sRGB gamut, so an out-of-gamut
    // lightness is clipped; the invariant that matters is the range.
    const l = colorToOklch(parseColor('oklch(50% 0.1 200)')).l;
    expect(l).toBeGreaterThanOrEqual(0);
    expect(l).toBeLessThanOrEqual(1);
  });
});
