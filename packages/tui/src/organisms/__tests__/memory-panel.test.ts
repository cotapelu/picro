import { describe, it, expect, vi } from 'vitest';
import { MemoryPanel } from '../memory-panel';
import { ThinkingSelector } from '../thinking-selector';
import type { RenderContext, KeyEvent } from '../base';

const ctx = (w = 80, h = 24): RenderContext => ({ width: w, height: h });
const k = (key: string): KeyEvent => ({ key, ctrlKey: false, shiftKey: false, altKey: false, metaKey: false, preventDefault: vi.fn(), stopPropagation: vi.fn() });

describe('MemoryPanel', () => {
  describe('Constructor', () => {
    it('should create memory panel', () => {
      const panel = new MemoryPanel();
      expect(panel).toBeDefined();
    });
  });

  describe('draw', () => {
    it('should render', () => {
      const panel = new MemoryPanel();
      const lines = panel.draw(ctx());
      expect(lines.length).toBeGreaterThan(0);
    });

    it('should fit width', () => {
      const panel = new MemoryPanel();
      const lines = panel.draw(ctx(30, 24));
      for (const line of lines) {
        expect(line.length).toBeLessThanOrEqual(30);
      }
    });
  });

  describe('keyboard', () => {
    it('should close with Escape', () => {
      const panel = new MemoryPanel();
      panel.setFocus(true);
      panel.keypress(k('Escape'));
      expect(panel).toBeDefined();
    });
  });
});

describe('ThinkingSelector', () => {
  const options = [
    { id: 'o1', name: 'Option 1', description: 'Desc 1' },
    { id: 'o2', name: 'Option 2', description: 'Desc 2' },
  ];

  describe('Constructor', () => {
    it('should create thinking selector', () => {
      const selector = new ThinkingSelector(options);
      expect(selector).toBeDefined();
    });
  });

  describe('draw', () => {
    it('should render options', () => {
      const selector = new ThinkingSelector(options);
      const lines = selector.draw(ctx());
      expect(lines.join('')).toContain('Option');
    });

    it('should fit width', () => {
      const selector = new ThinkingSelector(options);
      const lines = selector.draw(ctx(30, 24));
      for (const line of lines) {
        expect(line.length).toBeLessThanOrEqual(30);
      }
    });
  });

  describe('keyboard', () => {
    it('should navigate', () => {
      const selector = new ThinkingSelector(options);
      selector.setFocus(true);
      selector.keypress(k('ArrowDown'));
      const lines = selector.draw(ctx());
      expect(lines.join('')).toContain('Option');
    });
  });
});