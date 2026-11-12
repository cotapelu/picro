// SPDX-License-Identifier: Apache-2.0
/**
 * Built-in theme loading.
 *
 * loadBuiltinTheme() derived its path from process.cwd() and the SOURCE layout
 * ("<cwd>/src/modes/interactive/../theme"), which resolved to src/theme - a
 * directory that does not exist. Every call threw ENOENT, so getTheme() crashed
 * on first use whenever no theme had been set (any component rendered before the
 * theme controller applied one). It now resolves next to this module, which works
 * from the TypeScript sources and from the compiled dist/ output.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getTheme, loadBuiltinTheme, loadThemeFromFile, setTheme, type Theme } from './theme.js';

afterEach(() => setTheme(undefined));

describe('loadBuiltinTheme', () => {
  it('loads the dark theme', () => {
    const theme = loadBuiltinTheme('dark');
    expect(theme.name).toBeTruthy();
    expect(theme.appearance).toBe('dark');
  });

  it('loads the light theme', () => {
    const theme = loadBuiltinTheme('light');
    expect(theme.appearance).toBe('light');
  });

  it('falls back to dark for an unknown name', () => {
    expect(loadBuiltinTheme('nope').appearance).toBe('dark');
  });

  it('resolves the theme next to this module, not from cwd', () => {
    // Running from a different cwd must not change the outcome.
    const previous = process.cwd();
    try {
      process.chdir('/');
      expect(() => loadBuiltinTheme('dark')).not.toThrow();
    } finally {
      process.chdir(previous);
    }
  });

  it('the theme files exist next to this module in the build output too', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    // In the test run this is src/tui/ink/theme; in production it is
    // dist/tui/ink/theme. Either way the JSON must sit beside the code.
    expect(existsSync(resolve(here, 'dark.json'))).toBe(true);
    expect(existsSync(resolve(here, 'light.json'))).toBe(true);
  });
});

describe('getTheme', () => {
  it('returns a usable theme without any prior setTheme', () => {
    const theme = getTheme();
    // A Theme instance: usable immediately, with the token helpers present.
    expect(theme.name).toBe('dark');
    expect(typeof theme.fg).toBe('function');
    expect(typeof theme.style).toBe('function');
  });

  it('caches the fallback and honours an explicit setTheme', () => {
    const first = getTheme();
    expect(getTheme()).toBe(first);

    const explicit = loadBuiltinTheme('light');
    setTheme(explicit);
    expect(getTheme()).toBe(explicit);
  });
});

describe('Theme rendering', () => {
  const theme: Theme = loadBuiltinTheme('dark');

  it('wraps text in a foreground escape and resets it', () => {
    const out = theme.fg('accent', 'x');
    expect(out.startsWith('\x1b[')).toBe(true);
    expect(out.endsWith('\x1b[39m')).toBe(true);
    expect(out).toContain('x');
  });

  it('wraps text in a background escape and resets it', () => {
    const out = theme.bg('selectedBg', 'x');
    expect(out.startsWith('\x1b[')).toBe(true);
    expect(out.endsWith('\x1b[49m')).toBe(true);
  });

  it('applies combined styles with balanced resets', () => {
    const out = theme.style('x', { fg: 'accent', bg: 'selectedBg', bold: true, italic: true });
    expect(out).toContain('\x1b[1m');
    expect(out).toContain('\x1b[3m');
    // resets come back in reverse order
    expect(out.endsWith('\x1b[23m\x1b[22m\x1b[49m\x1b[39m')).toBe(true);
  });

  it('returns the text unchanged when no colour is requested', () => {
    expect(theme.style('x', {})).toBe('x');
    expect(theme.bold('x')).toBe('\x1b[1mx\x1b[22m');
    expect(theme.inverse('x')).toBe('\x1b[7mx\x1b[27m');
  });

  it('exposes a hex value per token', () => {
    expect(theme.colorToHex('accent')).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('gives a thinking border colour for every level', () => {
    for (const level of ['off', 'minimal', 'low', 'medium', 'high', 'xhigh']) {
      const paint = theme.getThinkingBorderColor(level);
      expect(paint('x')).toContain('x');
    }
    // An unknown level falls back rather than throwing.
    expect(theme.getThinkingBorderColor('bogus')('x')).toContain('x');
  });
});

describe('loadThemeFromFile', () => {
  it('throws a clear error for a missing file', () => {
    expect(() => loadThemeFromFile('/definitely/not/here.json')).toThrow();
  });
});
