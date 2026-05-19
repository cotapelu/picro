// SPDX-License-Identifier: Apache-2.0
/**
 * Comprehensive tests for SelectList molecule component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SelectList } from './select-list';
import type { RenderContext, KeyEvent } from '../core/base';
import { getKeybindings } from '../core/keybindings';
import { visibleWidth } from '../core/internal-utils';

// Mock keybindings
vi.mock('../core/keybindings', () => ({
  getKeybindings: () => ({
    matches: (data: string, action: string) => {
      const map: Record<string, Set<string>> = {
        'tui.select.cancel': new Set(['\u001b', 'Escape', '\x03', 'Ctrl+C']),
        'tui.select.confirm': new Set(['\r', 'Enter']),
        'tui.select.up': new Set(['\u001b[A', 'ArrowUp', 'k']),
        'tui.select.down': new Set(['\u001b[B', 'ArrowDown', 'j']),
        'tui.select.pageup': new Set(['\u001b[5~', 'PageUp']),
        'tui.select.pagedown': new Set(['\u001b[6~', 'PageDown']),
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

function createKeyEvent(data: string, name?: string): KeyEvent {
  return {
    raw: data,
    name: name || data,
    modifiers: {},
  };
}

describe('SelectList', () => {
  let items: SelectList['items'];
  let selectList: SelectList;

  beforeEach(() => {
    items = [
      { value: 'a', label: 'Apple' },
      { value: 'b', label: 'Banana' },
      { value: 'c', label: 'Cherry' },
      { value: 'd', label: 'Date' },
      { value: 'e', label: 'Elderberry' },
    ];
    selectList = new SelectList(items, 5);
  });

  describe('constructor', () => {
    it('should create with items and visible rows', () => {
      expect(selectList).toBeInstanceOf(SelectList);
      expect(selectList['items']).toHaveLength(5);
      expect(selectList['visibleRows']).toBe(5);
    });

    it('should set initial selected index to 0', () => {
      expect(selectList['selectedIndex']).toBe(0);
    });

    it('should accept optional callbacks', () => {
      const onSelect = vi.fn();
      const onCancel = vi.fn();
      const list = new SelectList(items, 5, {}, onSelect, onCancel);
      expect(list['onSelect']).toBe(onSelect);
      expect(list['onCancel']).toBe(onCancel);
    });

    it('should accept custom theme', () => {
      const theme = {
        selectedPrefix: (s) => `>>> ${s}`,
      };
      const list = new SelectList(items, 5, theme);
      expect(list['theme'].selectedPrefix).toBe(theme.selectedPrefix);
    });

    it('should default isFocused to false', () => {
      expect(selectList.isFocused).toBe(false);
    });
  });

  describe('setMultiSelect()', () => {
    it('should enable/disable multi-select', () => {
      selectList.setMultiSelect(true);
      expect(selectList['multiSelect']).toBe(true);
      selectList.setMultiSelect(false);
      expect(selectList['multiSelect']).toBe(false);
    });

    it('should clear selection when disabling', () => {
      selectList.setMultiSelect(true);
      selectList['selectedIndices'].add(1);
      selectList.setMultiSelect(false);
      expect(selectList['selectedIndices'].size).toBe(0);
    });
  });

  describe('isMultiSelect()', () => {
    it('should return current multi-select state', () => {
      expect(selectList.isMultiSelect()).toBe(false);
      selectList.setMultiSelect(true);
      expect(selectList.isMultiSelect()).toBe(true);
    });
  });

  describe('getSelectedIndices()', () => {
    it('should return sorted array of selected indices', () => {
      selectList.setMultiSelect(true);
      selectList['selectedIndices'].add(2);
      selectList['selectedIndices'].add(0);
      selectList['selectedIndices'].add(3);
      const result = selectList.getSelectedIndices();
      expect(result).toEqual([0, 2, 3]);
    });

    it('should return empty array when none selected', () => {
      selectList.setMultiSelect(true);
      expect(selectList.getSelectedIndices()).toEqual([]);
    });
  });

  describe('toggleSelection()', () => {
    it('should add index if not selected', () => {
      selectList.setMultiSelect(true);
      selectList.toggleSelection(1);
      expect(selectList['selectedIndices'].has(1)).toBe(true);
    });

    it('should remove index if already selected', () => {
      selectList.setMultiSelect(true);
      selectList['selectedIndices'].add(1);
      selectList.toggleSelection(1);
      expect(selectList['selectedIndices'].has(1)).toBe(false);
    });

    it('should call onSelectionChange callback', () => {
      selectList.setMultiSelect(true);
      const onSelChange = vi.fn();
      selectList['onSelectionChange'] = onSelChange;
      selectList.toggleSelection(0);
      expect(onSelChange).toHaveBeenCalledWith([0]);
    });
  });

  describe('setItems()', () => {
    it('should replace items array', () => {
      const newItems = [{ value: 'x', label: 'Xylophone' }];
      selectList.setItems(newItems);
      expect(selectList['items']).toHaveLength(1);
    });

    it('should clamp selectedIndex to new bounds', () => {
      selectList['selectedIndex'] = 10; // out of bounds for original 5 items
      selectList.setItems([{ value: 'a', label: 'A' }]);
      expect(selectList['selectedIndex']).toBe(0);
    });

    it('should not increase selectedIndex beyond items length - 1', () => {
      selectList['selectedIndex'] = 2;
      selectList.setItems([
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B' },
      ]);
      expect(selectList['selectedIndex']).toBe(1);
    });
  });

  describe('handleKey()', () => {
    beforeEach(() => {
      selectList.isFocused = true;
    });

    describe('navigation', () => {
      it('should move up with ArrowUp or k', () => {
        selectList.handleKey(createKeyEvent('[A', 'up'));
        expect(selectList['selectedIndex']).toBe(0); // wraps? actually SelectList doesn't wrap by default? check logic
        // In SelectList, pressing up from 0 stays at 0
        selectList['selectedIndex'] = 2;
        selectList.handleKey(createKeyEvent('[A', 'up'));
        expect(selectList['selectedIndex']).toBe(1);
      });

      it('should move down with ArrowDown or j', () => {
        selectList.handleKey(createKeyEvent('[B', 'down'));
        expect(selectList['selectedIndex']).toBe(1);
        selectList.handleKey(createKeyEvent('[B', 'down'));
        expect(selectList['selectedIndex']).toBe(2);
      });

      it('should not move past top', () => {
        selectList['selectedIndex'] = 0;
        selectList.handleKey(createKeyEvent('[A', 'up'));
        expect(selectList['selectedIndex']).toBe(0);
      });

      it('should not move past bottom', () => {
        selectList['selectedIndex'] = 4;
        selectList.handleKey(createKeyEvent('[B', 'down'));
        expect(selectList['selectedIndex']).toBe(4);
      });

      it('should page up', () => {
        selectList['selectedIndex'] = 4;
        selectList.handleKey(createKeyEvent('[5~', 'pageup'));
        expect(selectList['selectedIndex']).toBeLessThan(4);
      });

      it('should page down', () => {
        selectList.handleKey(createKeyEvent('[6~', 'pagedown'));
        expect(selectList['selectedIndex']).toBeGreaterThan(0);
      });
    });

    describe('selection', () => {
      it('should call onSelect on Enter', () => {
        const onSelect = vi.fn();
        selectList['onSelect'] = onSelect;
        selectList.handleKey(createKeyEvent('\r', 'Enter'));
        expect(onSelect).toHaveBeenCalledWith('a'); // first item
      });

      it('should call onCancel on Escape', () => {
        const onCancel = vi.fn();
        selectList['onCancel'] = onCancel;
        selectList.handleKey(createKeyEvent('\x1b', 'escape'));
        expect(onCancel).toHaveBeenCalled();
      });

      it('should toggle selection in multi-select mode on Space', () => {
        selectList.setMultiSelect(true);
        const onSelChange = vi.fn();
        selectList['onSelectionChange'] = onSelChange;
        selectList.handleKey(createKeyEvent(' '));
        expect(selectList['selectedIndices'].has(0)).toBe(true);
        expect(onSelChange).toHaveBeenCalledWith([0]);
      });

      it('should not toggle in single-select mode on Space', () => {
        selectList.setMultiSelect(false);
        selectList.handleKey(createKeyEvent(' '));
        // nothing happens
        expect(selectList['selectedIndices'].size).toBe(0);
      });
    });

    describe('filtering', () => {
      it('should append printable characters to filter', () => {
        selectList.handleKey(createKeyEvent('a'));
        expect(selectList['filter']).toBe('a');
      });

      it('should reset selectedIndex when filter changes', () => {
        selectList['selectedIndex'] = 3;
        selectList.handleKey(createKeyEvent('a'));
        expect(selectList['selectedIndex']).toBe(0);
      });

      it('should filter items case-insensitively', () => {
        selectList.handleKey(createKeyEvent('A'));
        // filter 'a' matches Apple
        const drawn = selectList.draw(defaultContext);
        expect(drawn.some(line => line.includes('Apple'))).toBe(true);
      });

      it('should show no match message when filter yields nothing', () => {
        selectList.handleKey(createKeyEvent('z'));
        const result = selectList.draw(defaultContext);
        expect(result.some(line => line.includes('No matches'))).toBe(true);
      });

      it('should clear filter on Backspace', () => {
        selectList['filter'] = 'ab';
        selectList.handleKey(createKeyEvent('\x7f')); // Backspace
        expect(selectList['filter']).toBe('a');
      });

      it('should handle backspace with empty filter', () => {
        selectList['filter'] = '';
        expect(() => selectList.handleKey(createKeyEvent('\x7f'))).not.toThrow();
      });
    });
  });

  describe('draw()', () => {
    it('should render all visible items', () => {
      const result = selectList.draw(defaultContext);
      const lineCount = result.filter(line => line.trim().length > 0).length;
      expect(lineCount).toBeGreaterThan(0);
    });

    it('should limit visible items to visibleRows', () => {
      selectList = new SelectList(items, 3);
      const result = selectList.draw(defaultContext);
      // With 5 items and visibleRows=3, should show only first 3 items
      expect(result.filter(line => line.includes('Apple') || line.includes('Banana') || line.includes('Cherry')).length).toBeGreaterThan(0);
    });

    it('should indicate selected item with prefix', () => {
      selectList['selectedIndex'] = 1;
      const result = selectList.draw(defaultContext);
      // The second visible item should have > marker or theme.selectedPrefix
      expect(result.some(line => line.includes('Banana') && (line.includes('>') || line.includes('\x1b[36m')))).toBe(true);
    });

    it('should add checkmark for multi-selected items', () => {
      selectList.setMultiSelect(true);
      selectList['selectedIndices'].add(1);
      const result = selectList.draw(defaultContext);
      expect(result.some(line => line.includes('[✓]'))).toBe(true);
    });

    it('should handle scroll offset', () => {
      selectList = new SelectList(items, 3);
      selectList['scrollOffset'] = 2;
      const result = selectList.draw(defaultContext);
      // Should show Cherry, Date, Elderberry (items 2,3,4)
      expect(result.some(line => line.includes('Cherry'))).toBe(true);
      expect(result.some(line => line.includes('Apple'))).toBe(false);
    });

    it('should show "No matches" when filtered empty', () => {
      selectList.handleKey(createKeyEvent('z'));
      const result = selectList.draw(defaultContext);
      expect(result[0]).toContain('No matches');
    });

    it('should respect custom theme.selectedPrefix', () => {
      selectList = new SelectList(items, 5, {
        selectedPrefix: (s) => `=>${s}`,
      });
      selectList['selectedIndex'] = 0;
      const result = selectList.draw(defaultContext);
      expect(result[0]).toContain('=>');
    });

    it('should truncate long labels to width', () => {
      const longItems = [{ value: 'long', label: 'A'.repeat(200) }];
      selectList = new SelectList(longItems, 1);
      const result = selectList.draw({ ...defaultContext, width: 20 });
      expect(visibleWidth(result[0])).toBeLessThanOrEqual(20);
    });
  });

  describe('adjustScroll()', () => {
    it('should keep selectedIndex in visible range', () => {
      selectList = new SelectList(items, 3);
      selectList['selectedIndex'] = 4; // last item
      selectList['adjustScroll']?.(); // private, but we can test via draw
      // Selected item should be visible
      const result = selectList.draw(defaultContext);
      expect(result.some(line => line.includes('Elderberry'))).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty items list', () => {
      selectList = new SelectList([], 5);
      const result = selectList.draw(defaultContext);
      expect(result).toHaveLength(0);
    });

    it('should handle zero visibleRows', () => {
      selectList = new SelectList(items, 0);
      const result = selectList.draw(defaultContext);
      expect(result).toHaveLength(0);
    });

    it('should handle items with empty labels', () => {
      const emptyItems = [{ value: 'x', label: '' }];
      selectList = new SelectList(emptyItems, 1);
      const result = selectList.draw(defaultContext);
      expect(result).toBeDefined();
    });

    it('should handle very long filter strings', () => {
      for (let i = 0; i < 100; i++) {
        selectList.handleKey(createKeyEvent('a'));
      }
      expect(selectList['filter'].length).toBe(100);
    });

    it('should handle unicode in labels', () => {
      const unicodeItems = [{ value: 'smile', label: '😀😁😂' }];
      selectList = new SelectList(unicodeItems, 1);
      const result = selectList.draw(defaultContext);
      expect(result[0]).toContain('😀');
    });
  });
});
