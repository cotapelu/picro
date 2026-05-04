import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Blink, Slide } from '../animations';
import type { UIElement, RenderContext } from '../base';

// Mock child component
class MockChild implements UIElement {
  private lines: string[];

  constructor(lines: string[]) {
    this.lines = lines;
  }

  draw(context: RenderContext): string[] {
    return this.lines.map(line => line.slice(0, context.width));
  }

  clearCache(): void {}
}

describe('Animations', () => {
  describe('Blink', () => {
    let blink: Blink;
    let child: MockChild;

    beforeEach(() => {
      child = new MockChild(['Hello', 'World']);
      blink = new Blink(child, 100);
      vi.useFakeTimers();
    });

    afterEach(() => {
      blink.stop();
      vi.useRealTimers();
    });

    it('should create blink with child and default interval', () => {
      const defaultBlink = new Blink(child);
      expect(defaultBlink).toBeInstanceOf(Blink);
    });

    it('should start visible', () => {
      const ctx: RenderContext = { width: 80, height: 24 };
      const result = blink.draw(ctx);
      expect(result).toEqual(['Hello', 'World']);
    });

    it('should toggle visibility after interval', () => {
      const ctx: RenderContext = { width: 80, height: 24 };

      // Initial draw - visible
      let result = blink.draw(ctx);
      expect(result.length).toBe(2);

      // Start the blink
      blink.start();

      // After half interval - still visible (not toggled yet)
      vi.advanceTimersByTime(50);
      result = blink.draw(ctx);
      expect(result.length).toBe(2);

      // After full interval - toggled to invisible
      vi.advanceTimersByTime(50);
      result = blink.draw(ctx);
      expect(result.length).toBe(0);

      // After another interval - back to visible
      vi.advanceTimersByTime(100);
      result = blink.draw(ctx);
      expect(result.length).toBe(2);
    });

    it('stop should make visible and clear timer', () => {
      blink.start();
      vi.advanceTimersByTime(100); // toggle to hidden
      blink.stop();

      const ctx: RenderContext = { width: 80, height: 24 };
      const result = blink.draw(ctx);
      expect(result.length).toBe(2); // visible again
      // Non-trivial to check timer cleared, but we can verify no more toggling
      vi.advanceTimersByTime(200);
      const result2 = blink.draw(ctx);
      expect(result2.length).toBe(2); // still visible
    });

    it('should not start multiple timers', () => {
      blink.start();
      blink.start(); // second call
      vi.advanceTimersByTime(100);
      // Should only toggle once per interval
      const result = blink.draw(ctx({ width: 80, height: 24 }));
      expect(result.length).toBe(0);
    });

    it('clearCache should call child clearCache', () => {
      const clearSpy = vi.spyOn(child, 'clearCache');
      blink.clearCache();
      expect(clearSpy).toHaveBeenCalled();
    });

    it('should handle child returning empty array', () => {
      const emptyChild = new MockChild([]);
      const blink = new Blink(emptyChild);
      const ctx: RenderContext = { width: 80, height: 24 };
      expect(blink.draw(ctx)).toEqual([]);
    });
  });

  describe('Slide', () => {
    let slide: Slide;
    let child: MockChild;

    beforeEach(() => {
      vi.useFakeTimers();
      child = new MockChild(['Hello', 'World']);
      slide = new Slide(child, 300);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should create slide with child and default duration', () => {
      const defaultSlide = new Slide(child);
      expect(defaultSlide).toBeInstanceOf(Slide);
    });

    it('should start with child fully off-screen (right)', () => {
      const ctx: RenderContext = { width: 20, height: 24 };
      const result = slide.draw(ctx);
      // Should have left padding equal to width (5 spaces * 20 = 100? Actually leftPad = Math.floor((1-0)*20) = 20)
      // Each line gets 20 spaces prefix
      expect(result[0]).toBe('                    Hello'); // 20 spaces
      expect(result[1]).toBe('                    World'); // 20 spaces
    });

    it('should slide in over duration', () => {
      const ctx: RenderContext = { width: 20, height: 24 };

      // At start
      let result = slide.draw(ctx);
      expect(result[0].startsWith(' '.repeat(20))).toBe(true);

      // At 50% progress - should be halfway
      vi.advanceTimersByTime(150);
      result = slide.draw(ctx);
      const leftPad1 = result[0].length - result[0].trimStart().length;
      expect(leftPad1).toBeLessThan(20);
      expect(leftPad1).toBeGreaterThan(0);

      // At 100% progress - fully visible
      vi.advanceTimersByTime(150);
      result = slide.draw(ctx);
      const leftPad2 = result[0].length - result[0].trimStart().length;
      expect(leftPad2).toBe(0);

      // Beyond 100% - stays at 0
      vi.advanceTimersByTime(100);
      result = slide.draw(ctx);
      const leftPad3 = result[0].length - result[0].trimStart().length;
      expect(leftPad3).toBe(0);
    });

    it('should clamp progress to 1', () => {
      const ctx: RenderContext = { width: 20, height: 24 };
      vi.advanceTimersByTime(1000); // way over duration
      const result = slide.draw(ctx);
      const leftPad = result[0].length - result[0].trimStart().length;
      expect(leftPad).toBe(0);
    });

    it('should respect different durations', () => {
      const fastSlide = new Slide(child, 50);
      const ctx: RenderContext = { width: 20, height: 24 };

      let result = fastSlide.draw(ctx);
      expect(result[0].startsWith(' '.repeat(20))).toBe(true);

      vi.advanceTimersByTime(25);
      result = fastSlide.draw(ctx);
      const leftPad = result[0].length - result[0].trimStart().length;
      expect(leftPad).toBeLessThan(20);
    });

    it('clearCache should call child clearCache', () => {
      const clearSpy = vi.spyOn(child, 'clearCache');
      slide.clearCache();
      expect(clearSpy).toHaveBeenCalled();
    });

    it('should handle narrow terminals where child line < width', () => {
      const shortChild = new MockChild(['Hi']);
      const slide = new Slide(shortChild, 100);
      const ctx: RenderContext = { width: 10, height: 24 };

      vi.advanceTimersByTime(100);
      const result = slide.draw(ctx);
      expect(result[0]).toBe('Hi'); // Should slide in without overflow
    });

    it('should handle child with multiple lines', () => {
      const multiChild = new MockChild(['Line 1', 'Line 2', 'Line 3']);
      const slide = new Slide(multiChild, 200);
      const ctx: RenderContext = { width: 20, height: 24 };

      expect(slide.draw(ctx)).toHaveLength(3);

      vi.advanceTimersByTime(100);
      const result = slide.draw(ctx);
      expect(result).toHaveLength(3);
      // All lines should have same left padding
      const pad0 = result[0].length - result[0].trimStart().length;
      const pad1 = result[1].length - result[1].trimStart().length;
      const pad2 = result[2].length - result[2].trimStart().length;
      expect(pad0).toBe(pad1);
      expect(pad1).toBe(pad2);
    });

    it('should not throw on very small width', () => {
      const ctx: RenderContext = { width: 1, height: 24 };
      expect(() => slide.draw(ctx)).not.toThrow();
    });

    it('should recalc progress on each draw call', () => {
      const ctx: RenderContext = { width: 20, height: 24 };

      const r1 = slide.draw(ctx);
      vi.advanceTimersByTime(50);
      const r2 = slide.draw(ctx);
      vi.advanceTimersByTime(50);
      const r3 = slide.draw(ctx);

      const pad1 = r1[0].length - r1[0].trimStart().length;
      const pad2 = r2[0].length - r2[0].trimStart().length;
      const pad3 = r3[0].length - r3[0].trimStart().length;

      expect(pad1).toBeGreaterThan(pad2);
      expect(pad2).toBeGreaterThan(pad3);
    });
  });

  describe('Integration - Animation workflows', () => {
    it('should work with realistic terminal sizes', () => {
      const child = new MockChild(['Status: Ready', 'Progress: 100%']);
      const slide = new Slide(child, 500);
      const ctx: RenderContext = { width: 80, height: 24 };

      // Slide in
      vi.advanceTimersByTime(250);
      let result = slide.draw(ctx);
      expect(result[0].startsWith(' ')).toBe(true);

      vi.advanceTimersByTime(250);
      result = slide.draw(ctx);
      expect(result[0].startsWith('Status:')).toBe(true);
    });

    it('should combine Blink and Slide', () => {
      const inner = new MockChild(['Important!']);
      const slide = new Slide(inner, 100);
      const blink = new Blink(slide, 500);

      const ctx: RenderContext = { width: 80, height: 24 };

      vi.advanceTimersByTime(50);
      // After 50ms, slide hasn't moved much, but blink may still be visible
      let result = blink.draw(ctx);
      expect(result.length).toBeGreaterThan(0);

      vi.advanceTimersByTime(200);
      result = blink.draw(ctx);
      // May or may not blink off; but if slide hasn't completed, still some content
    });
  });
});
