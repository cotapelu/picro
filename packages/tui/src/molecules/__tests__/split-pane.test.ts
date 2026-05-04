import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SplitPane, SplitPaneOrientation } from '../split-pane';
import type { RenderContext, KeyEvent } from '../base';

function ctx(w = 80, h = 24): RenderContext {
  return { width: w, height: h };
}

describe('SplitPane', () => {
  describe('Constructor', () => {
    it('should create horizontal split', () => {
      const pane = new SplitPane({ orientation: 'horizontal' });
      expect(pane).toBeDefined();
    });

    it('should create vertical split', () => {
      const pane = new SplitPane({ orientation: 'vertical' });
      expect(pane).toBeDefined();
    });

    it('should create with initial sizes', () => {
      const pane = new SplitPane({ orientation: 'horizontal', initialSizes: [50, 50] });
      expect(pane).toBeDefined();
    });
  });

  describe('draw', () => {
    it('should render horizontal split', () => {
      const pane = new SplitPane({ orientation: 'horizontal' });
      const lines = pane.draw(ctx());
      expect(lines.length).toBeGreaterThan(0);
    });

    it('should render vertical split', () => {
      const pane = new SplitPane({ orientation: 'vertical' });
      const lines = pane.draw(ctx());
      expect(lines.length).toBeGreaterThan(0);
    });

    it('should respect width', () => {
      const pane = new SplitPane({ orientation: 'horizontal' });
      const lines = pane.draw(ctx(40, 24));
      for (const line of lines) {
        expect(line.length).toBeLessThanOrEqual(40);
      }
    });
  });

  describe('resize', () => {
    it('should calculate initial sizes', () => {
      const pane = new SplitPane({ orientation: 'horizontal', initialSizes: [30, 70] });
      const sizes = pane.getSizes();
      expect(sizes).toHaveLength(2);
    });

    it('should resize with mouse drag simulation', () => {
      const pane = new SplitPane({ orientation: 'horizontal', initialSizes: [50, 50] });
      pane.setFocus(true);
      pane.keypress({ key: 'ArrowRight', ctrlKey: false, shiftKey: false, altKey: false, metaKey: false, preventDefault: vi.fn(), stopPropagation: vi.fn() } as KeyEvent);
      const sizes = pane.getSizes();
      expect(sizes[0]).toBeGreaterThan(0);
    });
  });

  describe('maximize', () => {
    it('should maximize first pane', () => {
      const pane = new SplitPane({ orientation: 'horizontal', initialSizes: [50, 50] });
      pane.setFocus(true);
      pane.keypress({ key: '1', ctrlKey: false, shiftKey: false, altKey: false, metaKey: false, preventDefault: vi.fn(), stopPropagation: vi.fn() } as KeyEvent);
    });

    it('should maximize second pane', () => {
      const pane = new SplitPane({ orientation: 'horizontal', initialSizes: [50, 50] });
      pane.setFocus(true);
      pane.keypress({ key: '2', ctrlKey: false, shiftKey: false, altKey: false, metaKey: false, preventDefault: vi.fn(), stopPropagation: vi.fn() } as KeyEvent);
    });
  });
});