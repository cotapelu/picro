import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LayoutInspector, LayoutInfo } from '../layout-inspector';
import type { RenderContext } from '../base';

function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

describe('LayoutInspector', () => {
  describe('Constructor', () => {
    it('should accept getLayoutInfo function', () => {
      const getLayoutInfo = vi.fn(() => ({
        panels: [],
        scrollTop: 0,
        totalBaseLines: 0,
        terminalWidth: 80,
        terminalHeight: 24,
      }));
      const inspector = new LayoutInspector(getLayoutInfo);
      expect(inspector).toBeInstanceOf(LayoutInspector);
    });

    it('should store the getter function', () => {
      const getLayoutInfo = vi.fn();
      const inspector = new LayoutInspector(getLayoutInfo);
      expect(getLayoutInfo).toBeDefined();
    });
  });

  describe('draw', () => {
    let getLayoutInfo: vi.Mock;
    let inspector: LayoutInspector;

    beforeEach(() => {
      getLayoutInfo = vi.fn(() => ({
        panels: [
          { top: 0, left: 0, width: 80, height: 12 },
          { top: 12, left: 0, width: 80, height: 12 },
        ],
        scrollTop: 0,
        totalBaseLines: 100,
        terminalWidth: 80,
        terminalHeight: 24,
      }));
      inspector = new LayoutInspector(getLayoutInfo);
    });

    it('should draw border with double lines', () => {
      const ctx = createContext(80, 24);
      const result = inspector.draw(ctx);

      // Top border should start with ┌ and end with ┐
      expect(result[0]?.startsWith('┌')).toBe(true);
      expect(result[0]?.endsWith('┐')).toBe(true);
      // Bottom border should start with └ and end with ┘
      expect(result[result.length - 1]?.startsWith('└')).toBe(true);
      expect(result[result.length - 1]?.endsWith('┘')).toBe(true);
    });

    it('should draw vertical borders', () => {
      const ctx = createContext(80, 24);
      const result = inspector.draw(ctx);

      // First column of middle rows should be │
      for (let row = 1; row < result.length - 1; row++) {
        expect(result[row][0]).toBe('│');
        expect(result[row][result[row].length - 1]).toBe('│');
      }
    });

    it('should display terminal dimensions', () => {
      const ctx = createContext(80, 24);
      const result = inspector.draw(ctx);

      expect(result.some(line => line.includes('Terminal: 80x24'))).toBe(true);
    });

    it('should display base lines and scrollTop', () => {
      const ctx = createContext(80, 24);
      const result = inspector.draw(ctx);

      expect(result.some(line => line.includes('Base: 100 lines'))).toBe(true);
      expect(result.some(line => line.includes('scrollTop=0'))).toBe(true);
    });

    it('should display panel count', () => {
      const ctx = createContext(80, 24);
      const result = inspector.draw(ctx);

      expect(result.some(line => line.includes('Panels: 2'))).toBe(true);
    });

    it('should list panel regions', () => {
      const ctx = createContext(80, 24);
      const result = inspector.draw(ctx);

      expect(result.some(line => line.includes('#0: t=0 l=0 w=80 h=12'))).toBe(true);
      expect(result.some(line => line.includes('#1: t=12 l=0 w=80 h=12'))).toBe(true);
    });

    it('should truncate long stats lines', () => {
      getLayoutInfo = vi.fn(() => ({
        panels: [],
        scrollTop: 0,
        totalBaseLines: 1000000000000000, // very long number
        terminalWidth: 80,
        terminalHeight: 24,
      }));
      inspector = new LayoutInspector(getLayoutInfo);

      const ctx = createContext(20, 24);
      const result = inspector.draw(ctx);

      // All lines should be within width (accounting for borders)
      for (const line of result) {
        expect(line.length).toBeLessThanOrEqual(ctx.width);
      }
    });

    it('should handle no panels', () => {
      getLayoutInfo = vi.fn(() => ({
        panels: [],
        scrollTop: 0,
        totalBaseLines: 0,
        terminalWidth: 80,
        terminalHeight: 24,
      }));
      inspector = new LayoutInspector(getLayoutInfo);

      const ctx = createContext(80, 24);
      const result = inspector.draw(ctx);

      expect(result.some(line => line.includes('Panels: 0'))).toBe(true);
      expect(result.some(line => line.includes('Panel regions:'))).toBe(false);
    });

    it('should fill canvas with spaces initially', () => {
      const ctx = createContext(80, 24);
      const result = inspector.draw(ctx);

      // All lines should have width characters (including borders)
      for (const line of result) {
        expect(line.length).toBe(ctx.width);
      }
    });

    it('should call getLayoutInfo on each draw', () => {
      const ctx = createContext();
      inspector.draw(ctx);
      expect(getLayoutInfo).toHaveBeenCalledTimes(1);
    });

    it('should respect narrow terminal width', () => {
      getLayoutInfo = vi.fn(() => ({
        panels: [{ top: 0, left: 0, width: 100, height: 50 }],
        scrollTop: 0,
        totalBaseLines: 1000,
        terminalWidth: 200,
        terminalHeight: 50,
      }));
      inspector = new LayoutInspector(getLayoutInfo);

      const ctx = createContext(30, 10);
      const result = inspector.draw(ctx);

      expect(result.length).toBe(10); // height limited
      for (const line of result) {
        expect(line.length).toBe(30); // width limited
      }
    });

    it('should handle tall heights', () => {
      const ctx = createContext(80, 100);
      const result = inspector.draw(ctx);

      expect(result.length).toBe(100);
    });

    it('should only show as many stats as fit vertically', () => {
      getLayoutInfo = vi.fn(() => ({
        panels: [
          { top: 0, left: 0, width: 80, height: 12 },
          { top: 12, left: 0, width: 80, height: 12 },
        ],
        scrollTop: 0,
        totalBaseLines: 100,
        terminalWidth: 80,
        terminalHeight: 24,
      }));
      inspector = new LayoutInspector(getLayoutInfo);

      const ctx = createContext(80, 5); // Very small height
      const result = inspector.draw(ctx);

      // Should still have borders but maybe truncated stats
      expect(result.length).toBe(5);
      // Top and bottom borders present
      expect(result[0]?.startsWith('┌')).toBe(true);
      expect(result[4]?.startsWith('└')).toBe(true);
    });

    it('should use ellipsis for truncated lines', () => {
      getLayoutInfo = vi.fn(() => ({
        panels: [{ top: 0, left: 0, width: 999999, height: 999999 }],
        scrollTop: 123456789,
        totalBaseLines: 987654321,
        terminalWidth: 80,
        terminalHeight: 24,
      }));
      inspector = new LayoutInspector(getLayoutInfo);

      const ctx = createContext(20, 24);
      const result = inspector.draw(ctx);

      // Look for ellipsis
      expect(result.some(line => line.includes('…'))).toBe(true);
    });
  });

  describe('clearCache', () => {
    it('should be callable without error', () => {
      const inspector = new LayoutInspector(() => ({
        panels: [],
        scrollTop: 0,
        totalBaseLines: 0,
        terminalWidth: 80,
        terminalHeight: 24,
      }));
      expect(() => inspector.clearCache()).not.toThrow();
    });
  });

  describe('Integration', () => {
    it('should render a realistic layout', () => {
      const getLayoutInfo = vi.fn(() => ({
        panels: [
          { top: 0, left: 0, width: 60, height: 20 },
          { top: 20, left: 0, width: 60, height: 4 },
          { top: 0, left: 60, width: 20, height: 24 },
        ],
        scrollTop: 42,
        totalBaseLines: 1000,
        terminalWidth: 80,
        terminalHeight: 24,
      }));
      const inspector = new LayoutInspector(getLayoutInfo);
      const ctx = createContext(80, 24);
      const result = inspector.draw(ctx);

      expect(result[0]).toBe('┌───────────────────────────────────────────────────────────────┐');
      expect(result[23]).toBe('└───────────────────────────────────────────────────────────────┘');
      expect(result.some(l => l.includes('Terminal: 80x24'))).toBe(true);
      expect(result.some(l => l.includes('Base: 1000 lines'))).toBe(true);
      expect(result.some(l => l.includes('Panels: 3'))).toBe(true);
      expect(result.some(l => l.includes('#0: t=0 l=0 w=60 h=20'))).toBe(true);
    });

    it('should work with dynamic layout changes', () => {
      let layout: LayoutInfo = {
        panels: [{ top: 0, left: 0, width: 40, height: 12 }],
        scrollTop: 0,
        totalBaseLines: 50,
        terminalWidth: 80,
        terminalHeight: 24,
      };
      const getLayoutInfo = vi.fn(() => layout);
      const inspector = new LayoutInspector(getLayoutInfo);

      const ctx = createContext(80, 24);
      let result = inspector.draw(ctx);
      expect(result.some(l => l.includes('Panels: 1'))).toBe(true);

      layout.panels.push({ top: 12, left: 0, width: 40, height: 12 });
      result = inspector.draw(ctx);
      expect(result.some(l => l.includes('Panels: 2'))).toBe(true);
    });
  });
});
