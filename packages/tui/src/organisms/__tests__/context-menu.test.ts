import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContextMenu, ContextMenuItem } from '../context-menu';
import type { RenderContext, KeyEvent } from '../base';

const ctx = (w = 80, h = 24): RenderContext => ({ width: w, height: h });
const k = (key: string): KeyEvent => ({ key, ctrlKey: false, shiftKey: false, altKey: false, metaKey: false, preventDefault: vi.fn(), stopPropagation: vi.fn() });

describe('ContextMenu', () => {
  const items: ContextMenuItem[] = [
    { id: 'copy', label: 'Copy', shortcut: 'Ctrl+C' },
    { id: 'paste', label: 'Paste', shortcut: 'Ctrl+V' },
    { id: 'cut', label: 'Cut', shortcut: 'Ctrl+X' },
    { type: 'separator' },
    { id: 'selectAll', label: 'Select All', shortcut: 'Ctrl+A' },
  ];

  describe('Constructor', () => {
    it('should create context menu', () => {
      const menu = new ContextMenu(items, { x: 10, y: 10 });
      expect(menu).toBeDefined();
    });

    it('should create with nested items', () => {
      const nestedItems: ContextMenuItem[] = [
        {
          id: 'submenu',
          label: 'Submenu',
          children: [
            { id: 'item1', label: 'Item 1' },
            { id: 'item2', label: 'Item 2' },
          ],
        },
      ];
      const menu = new ContextMenu(nestedItems, { x: 10, y: 10 });
      expect(menu).toBeDefined();
    });
  });

  describe('draw', () => {
    it('should render menu items', () => {
      const menu = new ContextMenu(items, { x: 10, y: 10 });
      const lines = menu.draw(ctx());
      expect(lines.join('')).toContain('Copy');
    });

    it('should render shortcuts', () => {
      const menu = new ContextMenu(items, { x: 10, y: 10 });
      const lines = menu.draw(ctx());
      expect(lines.join('')).toContain('Ctrl+C');
    });

    it('should fit within width', () => {
      const menu = new ContextMenu(items, { x: 10, y: 10 });
      const lines = menu.draw(ctx(30, 24));
      for (const line of lines) {
        expect(line.length).toBeLessThanOrEqual(30);
      }
    });

    it('should show separator', () => {
      const menu = new ContextMenu(items, { x: 10, y: 10 });
      const lines = menu.draw(ctx());
      const content = lines.join('');
      expect(content).toContain('─');
    });
  });

  describe('keyboard navigation', () => {
    it('should move selection down', () => {
      const menu = new ContextMenu(items, { x: 10, y: 10 });
      menu.setFocus(true);
      menu.keypress(k('ArrowDown'));
      const lines = menu.draw(ctx());
      expect(lines.join('')).toContain('Paste');
    });

    it('should move selection up', () => {
      const menu = new ContextMenu(items, { x: 10, y: 10 });
      menu.setFocus(true);
      menu.keypress(k('ArrowDown'));
      menu.keypress(k('ArrowUp'));
      const lines = menu.draw(ctx());
      expect(lines.join('')).toContain('Copy');
    });

    it('should select with Enter', () => {
      const onSelect = vi.fn();
      const menu = new ContextMenu(items, { x: 10, y: 10 }, { onSelect });
      menu.setFocus(true);
      menu.keypress(k('Enter'));
      expect(onSelect).toHaveBeenCalledWith('copy');
    });
  });

  describe('isActive', () => {
    it('should be active by default', () => {
      const menu = new ContextMenu(items, { x: 10, y: 10 });
      expect(menu.isActive()).toBe(true);
    });
  });

  describe('close', () => {
    it('should close with Escape', () => {
      const onClose = vi.fn();
      const menu = new ContextMenu(items, { x: 10, y: 10 }, { onClose });
      menu.setFocus(true);
      menu.keypress(k('Escape'));
      expect(onClose).toHaveBeenCalled();
    });
  });
});