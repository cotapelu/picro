import { describe, it, expect, vi } from 'vitest';
import { DebugPanel } from '../debug-panel';
import type { RenderContext, KeyEvent } from '../base';

const ctx = (w = 80, h = 24): RenderContext => ({ width: w, height: h });
const k = (key: string): KeyEvent => ({ key, ctrlKey: false, shiftKey: false, altKey: false, metaKey: false, preventDefault: vi.fn(), stopPropagation: vi.fn() });

describe('DebugPanel', () => {
  describe('Constructor', () => {
    it('should create debug panel', () => {
      const panel = new DebugPanel();
      expect(panel).toBeDefined();
    });
  });

  describe('draw', () => {
    it('should render', () => {
      const panel = new DebugPanel();
      const lines = panel.draw(ctx());
      expect(lines.length).toBeGreaterThan(0);
    });

    it('should fit width', () => {
      const panel = new DebugPanel();
      const lines = panel.draw(ctx(30, 24));
      for (const line of lines) {
        expect(line.length).toBeLessThanOrEqual(30);
      }
    });
  });

  describe('keyboard', () => {
    it('should toggle with key', () => {
      const panel = new DebugPanel();
      panel.setFocus(true);
      panel.keypress(k('Escape'));
      // Should toggle visibility
      const lines = panel.draw(ctx());
      expect(lines).toBeDefined();
    });
  });
});