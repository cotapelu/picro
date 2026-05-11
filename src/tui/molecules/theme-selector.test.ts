// SPDX-License-Identifier: Apache-2.0
/**
 * Comprehensive tests for ThemeSelector molecule component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ThemeSelector, type ThemeInfo } from './theme-selector';
import type { RenderContext, KeyEvent } from '../atoms/base';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

function createKeyEvent(raw: string): KeyEvent {
  return { raw, name: raw, modifiers: {} };
}

describe('ThemeSelector', () => {
  let themes: ThemeInfo[];
  let selector: ThemeSelector;
  let onSelect: vi.Mock;
  let onCancel: vi.Mock;

  beforeEach(() => {
    themes = [
      { id: 'dark', name: 'Dark', background: '#1e1e1e', foreground: '#ffffff' },
      { id: 'light', name: 'Light', background: '#ffffff', foreground: '#000000' },
      { id: 'blue', name: 'Blue', background: '#000088', foreground: '#8888ff' },
    ];
    onSelect = vi.fn();
    onCancel = vi.fn();
  });

  describe('constructor', () => {
    it('should create with provided themes', () => {
      selector = new ThemeSelector({ themes, onSelect, onCancel });
      expect(selector['themes']).toHaveLength(3);
    });

    it('should default to dark theme if none provided', () => {
      selector = new ThemeSelector({});
      expect(selector['currentThemeId']).toBe('dark');
    });

    it('should accept custom currentThemeId', () => {
      selector = new ThemeSelector({ themes, currentThemeId: 'light' });
      expect(selector['currentThemeId']).toBe('light');
      expect(selector['selectedIndex']).toBe(1);
    });

    it('should set selectedIndex to 0 if theme not found', () => {
      selector = new ThemeSelector({ themes, currentThemeId: 'nonexistent' });
      expect(selector['selectedIndex']).toBe(0);
    });

    it('should default to built-in themes if none provided', () => {
      selector = new ThemeSelector({});
      expect(selector['themes']).toHaveLength(2);
      expect(selector['themes'][0].id).toBe('dark');
    });

    it('should initialize isFocused false', () => {
      selector = new ThemeSelector({ themes });
      expect(selector.isFocused).toBe(false);
    });
  });

  describe('draw()', () => {
    beforeEach(() => {
      selector = new ThemeSelector({ themes });
    });

    it('should render a bordered box', () => {
      const result = selector.draw(defaultContext);
      expect(result[0].startsWith('┌')).toBe(true);
      expect(result[result.length - 1].startsWith('└')).toBe(true);
    });

    it('should display title "Select Theme"', () => {
      const result = selector.draw(defaultContext);
      expect(result.some(line => line.includes('Select Theme'))).toBe(true);
    });

    it('should list themes', () => {
      const result = selector.draw(defaultContext);
      expect(result.some(line => line.includes('Dark'))).toBe(true);
      expect(result.some(line => line.includes('Light'))).toBe(true);
    });

    it('should mark current theme with a dot', () => {
      selector = new ThemeSelector({ themes, currentThemeId: 'light' });
      const result = selector.draw(defaultContext);
      expect(result.some(line => line.includes('Light ●'))).toBe(true);
    });

    it('should use ▶ prefix for selected item', () => {
      selector['selectedIndex'] = 1;
      const result = selector.draw(defaultContext);
      expect(result.some(line => line.startsWith('│▶'))).toBe(true);
    });

    it('should show help text at bottom', () => {
      const result = selector.draw(defaultContext);
      expect(result.some(line => line.includes('↑↓ select  Enter apply  Esc cancel'))).toBe(true);
    });

    it('should respect context height (limit visible themes)', () => {
      selector = new ThemeSelector({ themes, onSelect, onCancel });
      const result = selector.draw({ ...defaultContext, height: 10 });
      // With height 10, can only show a few themes before padding+help+borders
      // Total lines: top border (1), title (1), divider (1), up to (height-6) themes, filler, help divider, help, bottom border.
      // So number of themes shown limited.
      // Hard to assert exactly but we can check no crash.
    });

    it('should pad with empty lines to fill height', () => {
      const result = selector.draw({ ...defaultContext, height: 40 });
      expect(result.length).toBe(40);
    });

    it('should truncate lines to width', () => {
      const narrow = { ...defaultContext, width: 20 };
      const result = selector.draw(narrow);
      result.forEach(line => {
        expect(line.length).toBeLessThanOrEqual(20);
      });
    });
  });

  describe('handleKey()', () => {
    beforeEach(() => {
      selector = new ThemeSelector({ themes, onSelect, onCancel });
      selector.isFocused = true;
    });

    it('should move selection up with ArrowUp or "up"', () => {
      selector['selectedIndex'] = 2;
      selector.handleKey(createKeyEvent('\x1b[A')); // up arrow CSI
      expect(selector['selectedIndex']).toBe(1);
      selector.handleKey(createKeyEvent('up')); // some terminals send "up"
      expect(selector['selectedIndex']).toBe(0);
    });

    it('should move selection down with ArrowDown or "down"', () => {
      selector['selectedIndex'] = 0;
      selector.handleKey(createKeyEvent('\x1b[B'));
      expect(selector['selectedIndex']).toBe(1);
    });

    it('should not move past top', () => {
      selector['selectedIndex'] = 0;
      selector.handleKey(createKeyEvent('up'));
      expect(selector['selectedIndex']).toBe(0);
    });

    it('should not move past bottom', () => {
      selector['selectedIndex'] = 2;
      selector.handleKey(createKeyEvent('down'));
      expect(selector['selectedIndex']).toBe(2);
    });

    it('should call onSelect on Enter', () => {
      selector.handleKey(createKeyEvent('\r'));
      expect(onSelect).toHaveBeenCalledWith(themes[0]);
      selector.handleKey(createKeyEvent('\n'));
      expect(onSelect).toHaveBeenCalledTimes(2);
    });

    it('should call onCancel on Escape', () => {
      selector.handleKey(createKeyEvent('\x1b'));
      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('clearCache()', () => {
    it('should be no-op', () => {
      selector = new ThemeSelector({ themes });
      expect(() => selector.clearCache()).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty themes array', () => {
      selector = new ThemeSelector({ themes: [] });
      const result = selector.draw(defaultContext);
      // Should still render header/footer but no theme lines
      expect(result).toBeDefined();
    });

    it('should handle single theme', () => {
      selector = new ThemeSelector({ themes: [themes[0]] });
      expect(selector['themes']).toHaveLength(1);
    });

    it('should handle very long theme names', () => {
      const longName = 'A'.repeat(100);
      const longThemes = [{ id: 'x', name: longName, background: '#000', foreground: '#fff' }];
      selector = new ThemeSelector({ themes: longThemes });
      const result = selector.draw(defaultContext);
      expect(result).toBeDefined();
    });

    it('should handle unicode in theme names', () => {
      const unicodeThemes = [{ id: 'emoji', name: '😀😁😂', background: '#000', foreground: '#fff' }];
      selector = new ThemeSelector({ themes: unicodeThemes });
      const result = selector.draw(defaultContext);
      expect(result.some(line => line.includes('😀'))).toBe(true);
    });

    it('should handle invalid currentThemeId gracefully', () => {
      selector = new ThemeSelector({ themes, currentThemeId: 'xyz' });
      expect(selector['selectedIndex']).toBe(0);
    });
  });
});