// SPDX-License-Identifier: Apache-2.0
/**
 * System theme generation.
 *
 * generateSystemThemeColors() used to compute accent/success/warning/error and
 * the blended backgrounds and then discard every one of them (\"void x\") while
 * returning an empty string for EVERY token. With every token empty, Theme fell
 * back to the same guessed foreground colour for foreground AND background slots,
 * so system/auto themes had no colour differentiation at all. blend() likewise
 * computed its mix and returned pure black.
 */

import { describe, it, expect } from 'vitest';
import { generateSystemThemeColors, terminalAppearance, SYSTEM_THEME_NAME } from './system-theme.js';
import { THEME_TOKENS, withThemeTokenFallbacks } from './theme-tokens.js';

const DARK_TERMINAL = {
  foreground: { r: 229, g: 229, b: 231 },
  background: { r: 0, g: 0, b: 0 },
};

const LIGHT_TERMINAL = {
  foreground: { r: 0, g: 0, b: 0 },
  background: { r: 255, g: 255, b: 255 },
};

const PALETTE = Array.from({ length: 16 }, (_, i) => ({ r: i * 16, g: 255 - i * 16, b: (i * 32) % 256 }));

function hexOf(value: unknown): string | undefined {
  return typeof value === 'string' && value.startsWith('#') ? value : undefined;
}

describe('terminalAppearance', () => {
  it('detects a dark background', () => {
    expect(terminalAppearance(DARK_TERMINAL)).toBe('dark');
  });

  it('detects a light background', () => {
    expect(terminalAppearance(LIGHT_TERMINAL)).toBe('light');
  });

  it('defaults to dark when the terminal reports nothing', () => {
    expect(terminalAppearance({})).toBe('dark');
    expect(terminalAppearance()).toBe('dark');
  });

  it('is insensitive to the foreground colour alone', () => {
    expect(terminalAppearance({ foreground: { r: 255, g: 255, b: 255 } })).toBe('dark');
  });
});

describe('generateSystemThemeColors', () => {
  it('covers every theme token', () => {
    const out = generateSystemThemeColors(DARK_TERMINAL);
    for (const token of Object.keys(THEME_TOKENS)) {
      expect(Object.prototype.hasOwnProperty.call(out, token)).toBe(true);
    }
  });

  it('produces hex values, not empty strings, for the core tokens', () => {
    const out = generateSystemThemeColors({
      ...DARK_TERMINAL,
      palette: PALETTE,
    });
    for (const token of ['accent', 'text', 'muted', 'dim', 'border', 'success', 'error', 'warning', 'selectedBg']) {
      expect(hexOf(out[token]), `${token} should be a hex colour`).toBeDefined();
    }
  });

  it('differentiates foreground tokens from each other', () => {
    const out = generateSystemThemeColors({ ...DARK_TERMINAL, palette: PALETTE });
    const values = ['text', 'muted', 'dim', 'accent', 'border'].map((t) => hexOf(out[t]));
    expect(new Set(values).size).toBe(values.length);
  });

  it('uses the terminal palette for status colours', () => {
    const out = generateSystemThemeColors({ ...DARK_TERMINAL, palette: PALETTE });
    // index 1 = error, 2 = success, 3 = warning
    expect(hexOf(out.error)).toBeDefined();
    expect(hexOf(out.success)).toBeDefined();
    expect(hexOf(out.warning)).toBeDefined();
    expect(new Set([hexOf(out.error), hexOf(out.success), hexOf(out.warning)]).size).toBe(3);
  });

  it('blends the selected background towards the foreground, not to black', () => {
    const out = generateSystemThemeColors(DARK_TERMINAL);
    const selectedBg = hexOf(out.selectedBg)!;
    expect(selectedBg).not.toBe('#000000');
    // 14% of the foreground mixed into a black background.
    expect(selectedBg).toBe('#202020');
  });

  it('blends the user message background towards the accent', () => {
    const withPalette = generateSystemThemeColors({ ...DARK_TERMINAL, palette: PALETTE });
    const userBg = hexOf(withPalette.userMessageBg)!;
    const accent = hexOf(withPalette.accent)!;
    expect(userBg).not.toBe('#000000');
    expect(userBg).not.toBe(accent);
  });

  it('falls back to distinct greys when the terminal reports no palette', () => {
    const out = generateSystemThemeColors(DARK_TERMINAL);
    // No palette: accent falls back to the foreground, but muted/dim/borders
    // still differ from it, so the UI keeps its hierarchy.
    expect(hexOf(out.muted)).not.toBe(hexOf(out.text));
    expect(hexOf(out.dim)).not.toBe(hexOf(out.muted));
  });

  it('produces background values that differ from the foreground', () => {
    const out = generateSystemThemeColors({ ...DARK_TERMINAL, palette: PALETTE });
    const bg = hexOf(out.selectedBg)!;
    const fg = hexOf(out.text)!;
    expect(bg).not.toBe(fg);
  });

  it('gives a distinct colour per thinking level', () => {
    const out = generateSystemThemeColors({ ...DARK_TERMINAL, palette: PALETTE });
    const levels = ['thinkingOff', 'thinkingMinimal', 'thinkingLow', 'thinkingMedium', 'thinkingHigh', 'thinkingXhigh'];
    const values = levels.map((t) => hexOf(out[t]));
    expect(values.every((v) => v !== undefined)).toBe(true);
    expect(new Set(values).size).toBeGreaterThan(1);
  });

  it('survives the theme-token fallback pass (no unresolved fallbacks)', () => {
    const out = generateSystemThemeColors({ ...DARK_TERMINAL, palette: PALETTE });
    expect(() => withThemeTokenFallbacks(out as never)).not.toThrow();
  });

  it('works for a light terminal', () => {
    const out = generateSystemThemeColors({ ...LIGHT_TERMINAL, palette: PALETTE });
    expect(hexOf(out.text)).toBe('#000000');
    expect(hexOf(out.selectedBg)).toBeDefined();
    expect(hexOf(out.selectedBg)).not.toBe('#ffffff');
  });
});

describe('SYSTEM_THEME_NAME', () => {
  it('is a plain name without a separator', () => {
    expect(SYSTEM_THEME_NAME).toBe('system');
    expect(SYSTEM_THEME_NAME).not.toContain('/');
    expect(SYSTEM_THEME_NAME).not.toContain(':');
  });
});
