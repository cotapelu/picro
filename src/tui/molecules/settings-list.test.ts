// SPDX-License-Identifier: Apache-2.0
/**
 * Comprehensive tests for SettingsList molecule component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SettingsList } from './settings-list';
import type { RenderContext, KeyEvent } from '../atoms/base';
import { getKeybindings } from '../atoms/keybindings';
import { visibleWidth } from '../atoms/internal-utils';

vi.mock('../atoms/keybindings', () => ({
  getKeybindings: () => ({
    matches: (data: string, action: string) => {
      const map: Record<string, Set<string>> = {
        'tui.select.cancel': new Set(['\u001b', 'Escape']),
        'tui.select.confirm': new Set(['\r', 'Enter']),
        'tui.select.up': new Set(['\u001b[A', 'ArrowUp', 'k']),
        'tui.select.down': new Set(['\u001b[B', 'ArrowDown', 'j']),
      };
      return map[action]?.has(data) ?? false;
    },
  }),
}));

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

function createKeyEvent(raw: string, name?: string): KeyEvent {
  const keyName = name ? normalizeKeyName(name) : normalizeKeyName(raw);
  return { raw, name: keyName, modifiers: {} };
}

function normalizeKeyName(name: string): string {
  // Raw control characters
  if (name === '\r' || name === '\n') return 'Enter';
  if (name === '\x1b') return 'Escape';
  if (name === '\x7f') return 'Backspace';
  const map: Record<string, string> = {
    'enter': 'Enter', 'return': 'Enter',
    'left': 'ArrowLeft', 'right': 'ArrowRight',
    'up': 'ArrowUp', 'down': 'ArrowDown',
    'backspace': 'Backspace', 'delete': 'Delete',
    'home': 'Home', 'end': 'End',
    'escape': 'Escape', 'tab': 'Tab', 'space': ' ',
  };
  return map[name.toLowerCase()] || name;
}

describe('SettingsList', () => {
  let items: SettingsList['items'];
  let settingsList: SettingsList;

  beforeEach(() => {
    items = [
      { id: 'theme', label: 'Theme', currentValue: 'dark', values: ['dark', 'light'] },
      { id: 'images', label: 'Show Images', currentValue: 'true', values: ['true', 'false'] },
      { id: 'font', label: 'Font Size', currentValue: '14', values: ['12', '14', '16', '18'] },
    ];
    settingsList = new SettingsList(items, 5);
  });

  describe('constructor', () => {
    it('should create with items, visibleRows, and callbacks', () => {
      expect(settingsList).toBeInstanceOf(SettingsList);
      expect(settingsList['items']).toHaveLength(3);
      expect(settingsList['visibleRows']).toBe(5);
    });

    it('should default isFocused to false', () => {
      expect(settingsList.isFocused).toBe(false);
    });

    it('should accept custom theme', () => {
      const theme = {
        selected: (text) => `\x1b[1m${text}\x1b[0m`,
        value: (text) => `\x1b[32m${text}\x1b[0m`,
      };
      const list = new SettingsList(items, 5, theme);
      expect(list['theme'].selected).toBe(theme.selected);
    });

    it('should accept onChange and onClose callbacks', () => {
      const onChange = vi.fn();
      const onClose = vi.fn();
      const list = new SettingsList(items, 5, {}, onChange, onClose);
      expect(list['onChange']).toBe(onChange);
      expect(list['onClose']).toBe(onClose);
    });
  });

  describe('setItems()', () => {
    it('should replace items array', () => {
      const newItems = [{ id: 'x', label: 'X', currentValue: 'a', values: ['a', 'b'] }];
      settingsList.setItems(newItems);
      expect(settingsList['items']).toHaveLength(1);
    });

    it('should clamp selectedIndex to new bounds', () => {
      settingsList['selectedIndex'] = 10;
      settingsList.setItems([items[0]]);
      expect(settingsList['selectedIndex']).toBe(0);
    });
  });

  describe('handleKey()', () => {
    beforeEach(() => {
      settingsList.isFocused = true;
    });

    it('should cycle value on Enter', () => {
      const onChange = vi.fn();
      settingsList['onChange'] = onChange;
      const originalValue = settingsList['items'][0].currentValue;
      settingsList.handleKey(createKeyEvent('\r', 'enter'));
      expect(onChange).toHaveBeenCalledWith('theme', expect.not.stringMatching(originalValue));
    });

    it('should call onClose on Escape', () => {
      const onClose = vi.fn();
      settingsList['onClose'] = onClose;
      settingsList.handleKey(createKeyEvent('', 'Escape'));
      expect(onClose).toHaveBeenCalled();
    });

    it('should move selection up', () => {
      settingsList['selectedIndex'] = 2;
      settingsList.handleKey(createKeyEvent('[A', 'ArrowUp'));
      expect(settingsList['selectedIndex']).toBe(1);
    });

    it('should move selection down', () => {
      settingsList.handleKey(createKeyEvent('[B', 'ArrowDown'));
      expect(settingsList['selectedIndex']).toBe(1);
    });

    it('should not move past top', () => {
      settingsList['selectedIndex'] = 0;
      settingsList.handleKey(createKeyEvent('[A', 'ArrowUp'));
      expect(settingsList['selectedIndex']).toBe(0);
    });

    it('should not move past bottom', () => {
      settingsList['selectedIndex'] = 2;
      settingsList.handleKey(createKeyEvent('[B', 'ArrowDown'));
      expect(settingsList['selectedIndex']).toBe(2);
    });

    it('should wrap values when cycling at last value', () => {
      const item = settingsList['items'][1]; // Show Images, values: ['true', 'false']
      item.currentValue = 'false';
      const onChange = vi.fn();
      settingsList['onChange'] = onChange;
      // Select the second item
      settingsList['selectedIndex'] = 1;
      settingsList.handleKey(createKeyEvent('\r', 'enter'));
      expect(onChange).toHaveBeenCalledWith('images', 'true'); // wrapped back to first
    });
  });

  describe('draw()', () => {
    it('should render visible items', () => {
      const result = settingsList.draw(defaultContext);
      expect(result.length).toBeGreaterThan(0);
      expect(result.some(line => line.includes('Theme'))).toBe(true);
    });

    it('should show selected item with > prefix and color', () => {
      settingsList['selectedIndex'] = 1;
      const result = settingsList.draw(defaultContext);
      // Second visible line (line 1) should contain '> ' and styled label
      const lineWithBanana = result.find(line => line.includes('Show Images'));
      expect(lineWithBanana).toContain('>');
      expect(lineWithBanana).toContain('\x1b[36m'); // cyan for selected label
    });

    it('should show value in brackets with color', () => {
      const result = settingsList.draw(defaultContext);
      expect(result.some(line => line.includes('[dark]'))).toBe(true);
    });

    it('should show scroll info when items exceed visibleRows', () => {
      const longList = Array.from({ length: 10 }, (_, i) => ({
        id: `item${i}`,
        label: `Item ${i}`,
        currentValue: 'a',
        values: ['a', 'b'],
      }));
      settingsList = new SettingsList(longList, 3);
      const result = settingsList.draw(defaultContext);
      expect(result.some(line => line.includes('/10]'))).toBe(true);
    });

    it('should add cursor marker to first line when focused', () => {
      settingsList.isFocused = true;
      const result = settingsList.draw(defaultContext);
      expect(result[0]).toContain('\x1b_pi:c\x07');
    });

    it('should not add cursor marker when not focused', () => {
      settingsList.isFocused = false;
      const result = settingsList.draw(defaultContext);
      expect(result[0]).not.toContain('\x1b_pi:c\x07');
    });

    it('should dim non-selected items', () => {
      const result = settingsList.draw(defaultContext);
      // Non-selected items should have dim (2m)
      const nonSelectedLine = result.find(line => line.includes('Show Images') && !line.includes('>'));
      expect(nonSelectedLine).toContain('\x1b[2m');
    });

    it('should truncate long lines to width', () => {
      settingsList = new SettingsList([{
        id: 'long', label: 'A'.repeat(100), currentValue: 'x', values: ['x']
      }], 1);
      const result = settingsList.draw({ ...defaultContext, width: 20 });
      result.forEach(line => {
        expect(visibleWidth(line)).toBeLessThanOrEqual(20);
      });
    });

    it('should respect custom theme.selected', () => {
      settingsList = new SettingsList(items, 5, {
        selected: (text) => `\x1b[1;31m${text}\x1b[0m`,
      });
      settingsList['selectedIndex'] = 0;
      const result = settingsList.draw(defaultContext);
      expect(result[0]).toContain('\x1b[1;31m');
    });

    it('should respect custom theme.value', () => {
      settingsList = new SettingsList(items, 5, {
        value: (text) => `\x1b[32m${text}\x1b[0m`,
      });
      const result = settingsList.draw(defaultContext);
      expect(result.some(line => line.includes('\x1b[32m['))).toBe(true);
    });
  });

  describe('clearCache()', () => {
    it('should be no-op (stateless)', () => {
      expect(() => settingsList.clearCache()).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty items array', () => {
      settingsList = new SettingsList([], 5);
      const result = settingsList.draw(defaultContext);
      expect(result).toHaveLength(0);
    });

    it('should handle items with empty label/value', () => {
      settingsList = new SettingsList([{ id: 'x', label: '', currentValue: '', values: [''] }], 1);
      const result = settingsList.draw(defaultContext);
      expect(result).toBeDefined();
    });

    it('should handle single item', () => {
      settingsList = new SettingsList([items[0]], 5);
      const result = settingsList.draw(defaultContext);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle scrollOffset larger than items', () => {
      settingsList = new SettingsList(items, 2);
      settingsList['scrollOffset'] = 100;
      const result = settingsList.draw(defaultContext);
      // Should handle gracefully
      expect(result).toBeDefined();
    });

    it('should handle unicode in labels', () => {
      settingsList = new SettingsList([{ id: 'emoji', label: '😀 Setting', currentValue: 'on', values: ['on', 'off'] }], 1);
      const result = settingsList.draw(defaultContext);
      expect(result[0]).toContain('😀');
    });
  });
});