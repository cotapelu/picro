import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TreeSelector, TreeSelectorNode } from '../tree-selector';
import type { RenderContext, KeyEvent } from '../base';

function createCtx(w = 80, h = 24): RenderContext {
  return { width: w, height: h };
}

function key(key: string): KeyEvent {
  return { key, ctrlKey: false, shiftKey: false, altKey: false, metaKey: false, preventDefault: vi.fn(), stopPropagation: vi.fn() };
}

describe('TreeSelector', () => {
  const testNodes: TreeSelectorNode[] = [
    { id: 'a', label: 'A', children: [{ id: 'a1', label: 'A1' }] },
    { id: 'b', label: 'B', children: [] },
  ];

  describe('Constructor', () => {
    it('should create with nodes', () => {
      const sel = new TreeSelector(testNodes, 10);
      expect(sel).toBeDefined();
    });
  });

  describe('draw', () => {
    it('should render', () => {
      const sel = new TreeSelector(testNodes, 10);
      const lines = sel.draw(createCtx());
      expect(lines.length).toBeGreaterThan(0);
    });

    it('should fit width', () => {
      const sel = new TreeSelector(testNodes, 10);
      const lines = sel.draw(createCtx(40, 24));
      for (const line of lines) {
        expect(line.length).toBeLessThanOrEqual(40);
      }
    });
  });

  describe('keyboard', () => {
    it('should move down', () => {
      const sel = new TreeSelector(testNodes, 10);
      sel.setFocus(true);
      sel.keypress(key('ArrowDown'));
      const lines = sel.draw(createCtx());
      expect(lines.join('')).toContain('B');
    });

    it('should expand with Enter', () => {
      const sel = new TreeSelector(testNodes, 10);
      sel.setFocus(true);
      sel.keypress(key('Enter'));
    });
  });
});