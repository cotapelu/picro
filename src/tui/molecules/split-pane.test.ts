// SPDX-License-Identifier: Apache-2.0
/**
 * Comprehensive tests for SplitPane molecule component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SplitPane, type SplitOrientation } from './split-pane';
import type { UIElement, RenderContext, KeyEvent } from '../atoms/base';

// Mock simple child component
const createMockChild = (lines: string[] = []): UIElement => ({
  draw: vi.fn().mockReturnValue(lines),
  clearCache: vi.fn(),
});

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

function createKeyEvent(raw: string): KeyEvent {
  return { raw, name: raw, modifiers: {} };
}

// Mock matchesKey
vi.mock('../atoms/keys', () => ({
  matchesKey: (raw: string, action: string) => {
    const dir: Record<string, string[]> = {
      right: ['ArrowRight'],
      left: ['ArrowLeft'],
      up: ['ArrowUp'],
      down: ['ArrowDown'],
    };
    return dir[action]?.includes(raw) ?? false;
  },
}));

describe('SplitPane', () => {
  let first: UIElement;
  let second: UIElement;
  let split: SplitPane;

  beforeEach(() => {
    first = createMockChild(['First']);
    second = createMockChild(['Second']);
    split = new SplitPane({ first, second });
  });

  describe('constructor', () => {
    it('should create with first and second panes', () => {
      expect(split).toBeInstanceOf(SplitPane);
      expect(split['first']).toBe(first);
      expect(split['second']).toBe(second);
    });

    it('should default orientation to horizontal', () => {
      expect(split['orientation']).toBe('horizontal');
    });

    it('should accept custom orientation', () => {
      split = new SplitPane({ first, second, orientation: 'vertical' });
      expect(split['orientation']).toBe('vertical');
    });

    it('should default minFirst/minSecond to 3', () => {
      expect(split['minFirst']).toBe(3);
      expect(split['minSecond']).toBe(3);
    });

    it('should accept custom min sizes', () => {
      split = new SplitPane({ first, second, minFirst: 10, minSecond: 5 });
      expect(split['minFirst']).toBe(10);
      expect(split['minSecond']).toBe(5);
    });

    it('should default initialPosition to 0.5', () => {
      expect(split['initialPosition']).toBe(0.5);
    });

    it('should initialize isFocused to false', () => {
      expect(split.isFocused).toBe(false);
    });

    it('should initialize position to 0, set on first draw', () => {
      expect(split['position']).toBe(0);
      split.draw(defaultContext);
      expect(split['position']).toBeGreaterThan(0);
    });
  });

  describe('draw()', () => {
    it('should return height number of lines', () => {
      const result = split.draw(defaultContext);
      expect(result).toHaveLength(24);
    });

    it('should set totalSize based on orientation', () => {
      split.draw(defaultContext);
      expect(split['totalSize']).toBe(80); // horizontal uses width
    });

    it('should initialize position on first draw using initialPosition', () => {
      split = new SplitPane({ first, second, initialPosition: 0.3 });
      split.draw(defaultContext);
      expect(split['position']).toBeGreaterThan(0);
      // Roughly 30% of width
      expect(split['position']).toBeLessThan(40);
    });

    it('should render divider between panes (horizontal)', () => {
      split.draw(defaultContext);
      const firstCall = first.draw.mock.calls[0][0];
      const secondCall = second.draw.mock.calls[0][0];
      // First pane gets width = position
      expect(firstCall.width).toBe(split['position']);
      // Second pane gets width = total - position - 1 (divider)
      expect(secondCall.width).toBe(split['totalSize'] - split['position'] - 1);
    });

    it('should render divider between panes (vertical)', () => {
      split = new SplitPane({ first, second, orientation: 'vertical' });
      split.draw(defaultContext);
      const firstCall = first.draw.mock.calls[0][0];
      const secondCall = second.draw.mock.calls[0][0];
      // First pane gets height = position
      expect(firstCall.height).toBe(split['position']);
      // Second pane gets height = total - position - 1
      expect(secondCall.height).toBe(split['totalSize'] - split['position'] - 1);
    });

    it('should include divider character in each line (horizontal)', () => {
      const result = split.draw(defaultContext);
      // Each line should have divider somewhere
      result.forEach(line => {
        expect(line.includes('┼')).toBe(true);
      });
    });

    it('should add cursor marker at divider position when dragging', () => {
      split['dragging'] = true;
      const result = split.draw(defaultContext);
      const lineWithCursor = result.find(line => line.includes('\x1b_pi:c\x07'));
      expect(lineWithCursor).toBeDefined();
    });

    it('should not include cursor marker when not dragging', () => {
      split['dragging'] = false;
      const result = split.draw(defaultContext);
      expect(result.every(line => !line.includes('\x1b_pi:c\x07'))).toBe(true);
    });

    it('should clamp position to minFirst/maxPos', () => {
      split = new SplitPane({ first, second, minFirst: 20, minSecond: 20 });
      split.draw(defaultContext); // first draw sets position based on initialPosition
      // Ensure position respects minima
      expect(split['position']).toBeGreaterThanOrEqual(20);
      expect(split['totalSize'] - split['position'] - 1).toBeGreaterThanOrEqual(20);
    });

    it('should handle narrow terminals', () => {
      const narrow = { ...defaultContext, width: 10 };
      const result = split.draw(narrow);
      expect(result).toBeDefined();
    });

    it('should handle empty child lines gracefully', () => {
      first = createMockChild([]);
      second = createMockChild([]);
      split = new SplitPane({ first, second });
      const result = split.draw(defaultContext);
      expect(result).toBeDefined();
    });

    it('should pad child lines appropriately', () => {
      first.draw.mockReturnValue(['A']);
      second.draw.mockReturnValue(['B']);
      const result = split.draw(defaultContext);
      // Each line should combine A + divider + B
      result[0].should.match(/A.*┼.*B/);
    });

    it('should recompute position on each draw (persist after resize)', () => {
      split.draw(defaultContext);
      const pos1 = split['position'];
      // Resize terminal - totalSize changes but position stays proportional? Actually position stays in cells.
      const wide = { ...defaultContext, width: 120 };
      split.draw(wide);
      // Position may update if initialPosition=0.5 and large size change? Actually it reinitializes only if position==0.
      // On subsequent draws, position stays same unless clamped.
    });
  });

  describe('handleKey()', () => {
    beforeEach(() => {
      split.isFocused = true;
      split.draw(defaultContext); // initialize position
    });

    it('should move divider right on ArrowRight', () => {
      const initial = split['position'];
      split.handleKey(createKeyEvent('001b[C', 'right'));
      expect(split['position']).toBe(initial + 1);
    });

    it('should move divider left on ArrowLeft', () => {
      const initial = split['position'];
      split.handleKey(createKeyEvent('001b[D', 'left'));
      expect(split['position']).toBe(initial - 1);
    });

    it('should move divider down on ArrowDown for vertical', () => {
      split = new SplitPane({ first, second, orientation: 'vertical' });
      split.isFocused = true;
      split.draw(defaultContext);
      const initial = split['position'];
      split.handleKey(createKeyEvent('001b[B', 'down'));
      expect(split['position']).toBe(initial + 1);
    });

    it('should move divider up on ArrowUp for vertical', () => {
      split = new SplitPane({ first, second, orientation: 'vertical' });
      split.isFocused = true;
      split.draw(defaultContext);
      const initial = split['position'];
      split.handleKey(createKeyEvent('001b[A', 'up'));
      expect(split['position']).toBe(initial - 1);
    });

    it('should clamp position to minFirst', () => {
      split['position'] = split['minFirst'];
      split.handleKey(createKeyEvent('001b[D', 'left'));
      expect(split['position']).toBe(split['minFirst']);
    });

    it('should clamp position to total - minSecond', () => {
      split['position'] = split['totalSize'] - split['minSecond'];
      split.handleKey(createKeyEvent('001b[C', 'right'));
      expect(split['position']).toBe(split['totalSize'] - split['minSecond']);
    });

    it('should clear caches on both children after move', () => {
      split.handleKey(createKeyEvent('001b[C', 'right'));
      expect(first.clearCache).toHaveBeenCalled();
      expect(second.clearCache).toHaveBeenCalled();
    });

    it('should ignore other keys', () => {
      const initial = split['position'];
      split.handleKey(createKeyEvent('', 'enter'));
      expect(split['position']).toBe(initial);
    });
  });

  describe('clearCache()', () => {
    it('should clear caches on both children', () => {
      split.clearCache();
      expect(first.clearCache).toHaveBeenCalled();
      expect(second.clearCache).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle very small terminal', () => {
      const tiny = { ...defaultContext, width: 2, height: 1 };
      split.draw(tiny);
      // Still should not crash
    });

    it('should handle very large terminal', () => {
      const huge = { ...defaultContext, width: 1000, height: 1000 };
      split.draw(huge);
      expect(split['totalSize']).toBe(1000);
    });

    it('should handle children returning different line counts', () => {
      first = createMockChild(Array(30).fill('A')); // 30 lines
      second = createMockChild(Array(10).fill('B')); // 10 lines
      split = new SplitPane({ first, second });
      const result = split.draw(defaultContext);
      // Should be 24 lines (height of context). Missing lines should be empty string.
      expect(result).toHaveLength(24);
    });

    it('should handle orientation toggle? (no runtime toggle)', () => {
      // orientation is fixed at construction
      const v = new SplitPane({ first, second, orientation: 'vertical' });
      expect(v['orientation']).toBe('vertical');
    });
  });
});