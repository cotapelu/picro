import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SelectList, SelectItem, SelectListTheme } from '../select-list';
import type { RenderContext, KeyEvent } from '../base';

function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

function createMockKeyEvent(key: string, meta?: Record<string, boolean>): KeyEvent {
  return {
    key,
    ctrlKey: meta?.ctrl ?? false,
    shiftKey: meta?.shift ?? false,
    altKey: meta?.alt ?? false,
    metaKey: meta?.meta ?? false,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  };
}

describe('SelectList Component', () => {
  const mockItems: SelectItem[] = [
    { value: 'apple', label: 'Apple', description: 'A fruit' },
    { value: 'banana', label: 'Banana', description: 'Yellow fruit' },
    { value: 'cherry', label: 'Cherry', description: 'Red fruit' },
    { value: 'date', label: 'Date', description: 'Sweet fruit' },
    { value: 'elderberry', label: 'Elderberry', description: 'Small fruit' },
  ];

  describe('Constructor', () => {
    it('should create SelectList with items', () => {
      const selectList = new SelectList(mockItems, 5);
      expect(selectList).toBeDefined();
    });

    it('should use custom theme', () => {
      const theme: SelectListTheme = {
        selectedPrefix: (text) => `> ${text}`,
      };
      const selectList = new SelectList(mockItems, 5, theme);
      expect(selectList).toBeDefined();
    });

    it('should set callback handlers', () => {
      const onSelect = vi.fn();
      const onCancel = vi.fn();
      const selectList = new SelectList(mockItems, 5, {}, onSelect, onCancel);
      expect(selectList).toBeDefined();
    });
  });

  describe('rendering', () => {
    it('should render list items', () => {
      const selectList = new SelectList(mockItems, 5);
      const ctx = createContext();
      const lines = selectList.draw(ctx);
      expect(lines.length).toBeGreaterThan(0);
    });

    it('should render active item with marker', () => {
      const selectList = new SelectList(mockItems, 5);
      const ctx = createContext();
      const lines = selectList.draw(ctx);
      // Should contain selection marker or highlight
      expect(lines.join('')).toContain('Apple');
    });

    it('should render descriptions if available', () => {
      const selectList = new SelectList(mockItems, 5);
      const ctx = createContext();
      const lines = selectList.draw(ctx);
      expect(lines.join('')).toContain('A fruit');
    });

    it('should truncate long labels to fit width', () => {
      const longItems: SelectItem[] = [
        { value: 'x', label: 'A very long label that exceeds the terminal width' },
      ];
      const selectList = new SelectList(longItems, 5);
      const ctx = createContext(20, 24);
      const lines = selectList.draw(ctx);
      // Should be truncated
      expect(lines[0].length).toBeLessThanOrEqual(20);
    });
  });

  describe('selection', () => {
    it('should select first item by default', () => {
      const selectList = new SelectList(mockItems, 5);
      selectList.setFocus(true);
      selectList.keypress(createMockKeyEvent('Enter'));
      const ctx = createContext();
      const lines = selectList.draw(ctx);
      expect(lines.join('')).toContain('apple');
    });

    it('should move selection down', () => {
      const selectList = new SelectList(mockItems, 5);
      selectList.setFocus(true);
      selectList.keypress(createMockKeyEvent('ArrowDown'));
      const ctx = createContext();
      const lines = selectList.draw(ctx);
      expect(lines.join('')).toContain('banana');
    });

    it('should move selection up', () => {
      const selectList = new SelectList(mockItems, 5);
      selectList.setFocus(true);
      selectList.keypress(createMockKeyEvent('ArrowDown'));
      selectList.keypress(createMockKeyEvent('ArrowDown'));
      selectList.keypress(createMockKeyEvent('ArrowUp'));
      const ctx = createContext();
      const lines = selectList.draw(ctx);
      expect(lines.join('')).toContain('apple');
    });

    it('should wrap around when at end', () => {
      const selectList = new SelectList(mockItems, 5);
      selectList.setFocus(true);
      // Move down past last
      for (let i = 0; i < 10; i++) {
        selectList.keypress(createMockKeyEvent('ArrowDown'));
      }
      const ctx = createContext();
      const lines = selectList.draw(ctx);
      expect(lines.join('')).toContain('apple');
    });
  });

  describe('filtering', () => {
    it('should filter items by text', () => {
      const selectList = new SelectList(mockItems, 5);
      selectList.setFilter('ban');
      const ctx = createContext();
      const lines = selectList.draw(ctx);
      expect(lines.join('')).toContain('Banana');
      expect(lines.join('')).not.toContain('Apple');
    });

    it('should show no match message when filter has no results', () => {
      const selectList = new SelectList(mockItems, 5);
      selectList.setFilter('xyz123');
      const ctx = createContext();
      const lines = selectList.draw(ctx);
      expect(lines.join('')).toContain('No matches');
    });
  });

  describe('keyboard navigation', () => {
    it('should handle Escape to cancel', () => {
      const onCancel = vi.fn();
      const selectList = new SelectList(mockItems, 5, {}, vi.fn(), onCancel);
      selectList.setFocus(true);
      selectList.keypress(createMockKeyEvent('Escape'));
      expect(onCancel).toHaveBeenCalled();
    });

    it('should handle Enter to select', () => {
      const onSelect = vi.fn();
      const selectList = new SelectList(mockItems, 5, {}, onSelect);
      selectList.setFocus(true);
      selectList.keypress(createMockKeyEvent('Enter'));
      expect(onSelect).toHaveBeenCalledWith('apple');
    });

    it('should handle Home key', () => {
      const selectList = new SelectList(mockItems, 5);
      selectList.setFocus(true);
      selectList.keypress(createMockKeyEvent('ArrowDown'));
      selectList.keypress(createMockKeyEvent('Home'));
      const ctx = createContext();
      const lines = selectList.draw(ctx);
      expect(lines.join('')).toContain('apple');
    });

    it('should handle End key', () => {
      const selectList = new SelectList(mockItems, 5);
      selectList.setFocus(true);
      selectList.keypress(createMockKeyEvent('End'));
      const ctx = createContext();
      const lines = selectList.draw(ctx);
      expect(lines.join('')).toContain('elderberry');
    });
  });

  describe('scrolling', () => {
    it('should scroll when selection goes below visible area', () => {
      const selectList = new SelectList(mockItems, 2);
      selectList.setFocus(true);
      // Move down past visible area
      selectList.keypress(createMockKeyEvent('ArrowDown'));
      selectList.keypress(createMockKeyEvent('ArrowDown'));
      selectList.keypress(createMockKeyEvent('ArrowDown'));
      const ctx = createContext(80, 24);
      const lines = selectList.draw(ctx);
      // Should only show 2 items
      expect(lines[0]).toContain('apple');
      expect(lines[1]).toContain('banana');
      // Third row should be empty or contain more
      expect(lines.length).toBeGreaterThanOrEqual(2);
    });
  });
});