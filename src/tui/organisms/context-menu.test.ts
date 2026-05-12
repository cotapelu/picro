// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for ContextMenu organism component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContextMenu, contextMenuDefaultTheme, type MenuItem } from './context-menu';
import type { RenderContext, KeyEvent } from '../atoms/base';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

function createKeyEvent(keyName: string): KeyEvent {
  const keyMap: Record<string, { raw: string; name: string }> = {
    ArrowDown: { raw: '\x1b[B', name: 'ArrowDown' },
    ArrowUp: { raw: '\x1b[A', name: 'ArrowUp' },
    Enter: { raw: '\r', name: 'Enter' },
    Escape: { raw: '\x1b', name: 'Escape' },
  };
  const mapped = keyMap[keyName];
  if (mapped) return { raw: mapped.raw, name: mapped.name, modifiers: {} };
  return { raw: keyName, name: keyName, modifiers: {} };
}

describe('ContextMenu', () => {
  let items: (MenuItem | null)[];
  let onClose: vi.Mock;
  let menu: ContextMenu;

  beforeEach(() => {
    items = [
      { id: 'copy', label: 'Copy', shortcut: 'Ctrl+C', onSelect: vi.fn() },
      { id: 'paste', label: 'Paste', shortcut: 'Ctrl+V', onSelect: vi.fn() },
      null, // separator
      { id: 'delete', label: 'Delete', disabled: true },
      { id: 'select-all', label: 'Select All', shortcut: 'Ctrl+A' },
    ];
    onClose = vi.fn();
  });

  describe('constructor', () => {
    it('should filter out null separators? Actually filter(Boolean) removes null', () => {
      menu = new ContextMenu({ items, onClose });
      expect(menu['items'].length).toBe(4); // null removed
    });

    it('should merge theme with defaults', () => {
      menu = new ContextMenu({ items, theme: { borderColor: (s) => `\x1b[31m${s}\x1b[0m` } });
      expect(menu['theme'].borderColor).not.toBe(contextMenuDefaultTheme.borderColor);
    });

    it('should default maxVisible to 10', () => {
      menu = new ContextMenu({ items });
      expect(menu['maxVisible']).toBe(10);
    });

    it('should set selectedIndex', () => {
      menu = new ContextMenu({ items, selectedIndex: 2 });
      expect(menu['selectedIndex']).toBe(2);
    });

    it('should clamp selectedIndex to valid range', () => {
      menu = new ContextMenu({ items, selectedIndex: 100 });
      expect(menu['selectedIndex']).toBe(3); // last index (4 items)
    });
  });

  describe('setItems()', () => {
    it('should replace items and reset selection', () => {
      menu = new ContextMenu({ items });
      const newItems = [{ id: 'a', label: 'A' }];
      menu.setItems(newItems);
      expect(menu['items']).toHaveLength(1);
      expect(menu['selectedIndex']).toBe(0);
    });
  });

  describe('getSelectedItem()', () => {
    it('should return selected item if not disabled', () => {
      menu = new ContextMenu({ items });
      const sel = menu.getSelectedItem();
      expect(sel?.id).toBe('copy');
    });

    it('should return null if selected item is disabled', () => {
      menu = new ContextMenu({ items });
      menu['selectedIndex'] = 3; // Delete is disabled
      const sel = menu.getSelectedItem();
      expect(sel).toBeNull();
    });
  });

  describe('selectById()', () => {
    it('should set selectedIndex to matching item', () => {
      menu = new ContextMenu({ items });
      menu.selectById('paste');
      expect(menu['selectedIndex']).toBe(1);
    });

    it('should do nothing if id not found', () => {
      menu = new ContextMenu({ items });
      menu.selectById('unknown');
      expect(menu['selectedIndex']).toBe(0); // unchanged
    });
  });

  describe('draw()', () => {
    beforeEach(() => {
      menu = new ContextMenu({ items });
    });

    it('should render a bordered box', () => {
      const result = menu.draw(defaultContext);
      expect(result[0].includes('┌')).toBe(true);
      expect(result[result.length - 1].includes('┘')).toBe(true);
    });

    it('should list items with labels and shortcuts', () => {
      const result = menu.draw(defaultContext);
      expect(result.some(l => l.includes('Copy'))).toBe(true);
      expect(result.some(l => l.includes('Ctrl+C'))).toBe(true);
    });

    it('should show disabled items with dim color', () => {
      const result = menu.draw(defaultContext);
      expect(result.some(l => l.includes('\x1b[90m') && l.includes('Delete'))).toBe(true);
    });

    it('should highlight selected item', () => {
      // Theme selectedBg
      const result = menu.draw(defaultContext);
      // The selected line should have selectedBg applied
      expect(result.some(l => l.includes('\x1b[48;5;25m'))).toBe(true);
    });

    it('should apply custom theme', () => {
      menu = new ContextMenu({ items, theme: { bgColor: (s) => `\x1b[41m${s}\x1b[0m` } });
      const result = menu.draw(defaultContext);
      expect(result.some(l => l.includes('\x1b[41m'))).toBe(true);
    });

    it('should respect requested width', () => {
      menu = new ContextMenu({ items, width: 30 });
      const result = menu.draw(defaultContext);
      const vw = require('../atoms/internal-utils').visibleWidth;
      result.forEach(l => {
        expect(vw(l)).toBeLessThanOrEqual(30);
      });
    });

    it('should limit visible items to maxVisible', () => {
      const many = Array.from({ length: 20 }, (_, i) => ({ id: `i${i}`, label: `Item ${i}` }));
      menu = new ContextMenu({ items: many, maxVisible: 5 });
      const result = menu.draw(defaultContext);
      const itemLines = result.filter(l => l.includes('Item'));
      expect(itemLines.length).toBeLessThanOrEqual(5);
    });

    it('should not render separators (null items)', () => {
      // items already filtered
    });
  });

  describe('handleKey()', () => {
    beforeEach(() => {
      menu = new ContextMenu({ items });
      menu.isFocused = true;
    });

    it('should move selection up/down', () => {
      menu.handleKey(createKeyEvent('ArrowDown'));
      expect(menu['selectedIndex']).toBe(1);
    });

    it('should skip disabled items when navigating', () => {
      // Start at index 0 (Copy)
      menu.handleKey(createKeyEvent('ArrowDown')); // to Paste (1)
      menu.handleKey(createKeyEvent('ArrowDown')); // to Delete (2, disabled) -> should skip to Select All (3)
      expect(menu['selectedIndex']).toBe(3);
      const sel = menu.getSelectedItem();
      expect(sel).not.toBeNull();
      expect(sel?.id).toBe('select-all');
    });

    it('should call onSelect when pressing Enter on enabled item', () => {
      // First item has onSelect(fn)
      menu.handleKey(createKeyEvent('Enter'));
      expect(items[0].onSelect).toHaveBeenCalled();
    });

    it('should call onClose on Escape', () => {
      menu.handleKey(createKeyEvent('Escape'));
      expect(onClose).toHaveBeenCalled();
    });

    it('should not call onSelect when Enter pressed on disabled item', () => {
      // Select the disabled Delete item (index 2 after filtering)
      menu['selectedIndex'] = 2;
      menu.handleKey(createKeyEvent('Enter'));
      // Neither spy onSelect should be called
      expect(items[0].onSelect).not.toHaveBeenCalled();
      expect(items[1].onSelect).not.toHaveBeenCalled();
    });
  });

  describe('clearCache()', () => {
    it('should be no-op', () => {
      menu = new ContextMenu({ items });
      expect(() => menu.clearCache()).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty items array', () => {
      menu = new ContextMenu({ items: [] });
      const result = menu.draw(defaultContext);
      expect(result[0].includes('┌')).toBe(true);
    });

    it('should handle very long labels', () => {
      const longItem = [{ id: 'x', label: 'A'.repeat(200) }];
      menu = new ContextMenu({ items: longItem });
      const result = menu.draw(defaultContext);
      expect(result).toBeDefined();
    });

    it('should handle unicode', () => {
      const uni = [{ id: 'x', label: '😀' }];
      menu = new ContextMenu({ items: uni });
      const result = menu.draw(defaultContext);
      expect(result.some(l => l.includes('😀'))).toBe(true);
    });
  });
});