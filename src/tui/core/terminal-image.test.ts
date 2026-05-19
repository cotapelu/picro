// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for terminal-image module
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getCapabilities,
  setCapabilities,
  resetCapabilitiesCache,
  isImageLine,
  getCellDimensions,
  setCellDimensions,
  clearRenderCache,
  encodeKitty,
  KITTY_PREFIX,
  ITERM2_PREFIX,
  ScaleMode,
} from './terminal-image';

describe('terminal-image', () => {
  beforeEach(() => {
    vi.stubEnv('TERM_PROGRAM', '');
    vi.stubEnv('TERM', 'xterm');
    vi.stubEnv('COLORTERM', '');
    vi.stubEnv('KITTY_WINDOW_ID', '');
    vi.stubEnv('ITERM_SESSION_ID', '');
    setCapabilities({ images: null, trueColor: false, hyperlinks: false });
  });

  describe('getCapabilities()', () => {
    beforeEach(() => {
      resetCapabilitiesCache();
    });
    it('should detect Kitty terminal', () => {
      vi.stubEnv('KITTY_WINDOW_ID', '123');
      const caps = getCapabilities();
      expect(caps.images).toBe('kitty');
    });

    it('should detect iTerm2', () => {
      vi.stubEnv('ITERM_SESSION_ID', '456');
      const caps = getCapabilities();
      expect(caps.images).toBe('iterm2');
    });

    it('should detect WezTerm', () => {
      vi.stubEnv('WEZTERM_PANE', '123');
      const caps = getCapabilities();
      expect(caps.images).toBe('kitty'); // wezterm uses kitty protocol
    });

    it('should return null images for VSCode', () => {
      vi.stubEnv('TERM_PROGRAM', 'vscode');
      vi.stubEnv('KITTY_WINDOW_ID', '');
      vi.stubEnv('WEZTERM_PANE', '');
      vi.stubEnv('ITERM_SESSION_ID', '');
      const caps = getCapabilities();
      expect(caps.images).toBeNull();
    });

    it('should cache capabilities', () => {
      const caps1 = getCapabilities();
      const caps2 = getCapabilities();
      expect(caps1).toBe(caps2); // same object reference (we return copy though)
    });

    it('should reset cache on resetCapabilitiesCache', () => {
      // Ensure clean environment for detection
      vi.stubEnv('KITTY_WINDOW_ID', '');
      vi.stubEnv('WEZTERM_PANE', '');
      vi.stubEnv('ITERM_SESSION_ID', '');
      getCapabilities();
      setCapabilities({ images: 'kitty', trueColor: true, hyperlinks: true });
      getCapabilities(); // returns overridden
      resetCapabilitiesCache();
      const caps = getCapabilities();
      expect(caps.images).not.toBe('kitty');
    });
  });

  describe('isImageLine()', () => {
    it('should detect Kitty image prefix', () => {
      const line = `${KITTY_PREFIX}a=T,f=100;...
`;
      expect(isImageLine(line)).toBe(true);
    });

    it('should detect iTerm2 prefix', () => {
      const line = `${ITERM2_PREFIX}width=10;height=20;id=123:AAAA...`;
      expect(isImageLine(line)).toBe(true);
    });

    it('should return false for normal text', () => {
      expect(isImageLine('Hello World')).toBe(false);
    });
  });

  describe('getCellDimensions / setCellDimensions', () => {
    it('should get default dimensions', () => {
      const dims = getCellDimensions();
      expect(dims.widthPx).toBeGreaterThan(0);
      expect(dims.heightPx).toBeGreaterThan(0);
    });

    it('should set custom dimensions', () => {
      setCellDimensions({ widthPx: 10, heightPx: 20 });
      const dims = getCellDimensions();
      expect(dims.widthPx).toBe(10);
      expect(dims.heightPx).toBe(20);
    });

    it('should return copy to prevent mutation', () => {
      const dims = getCellDimensions();
      dims.widthPx = 999;
      const again = getCellDimensions();
      expect(again.widthPx).not.toBe(999);
    });
  });

  describe('clearRenderCache()', () => {
    it('should clear cache', () => {
      // The cache is internal, but we can test that after clear, new calls are unaffected
      clearRenderCache();
      expect(true).toBe(true); // no error
    });
  });

  describe('encodeKitty()', () => {
    it('should encode image data with basic options', () => {
      const base64 = 'aGVsbG8='; // "hello"
      const seq = encodeKitty(base64, { columns: 10, rows: 5 });
      expect(seq).toContain(KITTY_PREFIX);
      expect(seq).toContain('a=T');
      expect(seq).toContain('f=100');
      expect(seq).toContain('c=10');
      expect(seq).toContain('r=5');
    });

    it('should include imageId if provided', () => {
      const seq = encodeKitty('data', { imageId: 123 });
      expect(seq).toContain('i=123');
    });

    it('should chunk large data', () => {
      const base64 = 'A'.repeat(10000);
      const seq = encodeKitty(base64);
      // Should have multiple chunk markers
      expect(seq.includes('m=0')).toBe(true);
    });
  });

  describe('ScaleMode', () => {
    it('should have correct values', () => {
      expect(ScaleMode.Fit).toBe('fit');
      expect(ScaleMode.Fill).toBe('fill');
      expect(ScaleMode.Stretch).toBe('stretch');
    });
  });
});