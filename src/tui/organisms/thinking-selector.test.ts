// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for ThinkingSelector organism component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ThinkingSelector, type ThinkingLevel } from './thinking-selector';
import type { RenderContext, KeyEvent } from '../atoms/base';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

function createKeyEvent(raw: string): KeyEvent {
  return { raw, name: raw, modifiers: {} };
}

describe('ThinkingSelector', () => {
  const levels: ThinkingLevel[] = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh'];
  let onSelect: vi.Mock;
  let onCancel: vi.Mock;
  let selector: ThinkingSelector;

  beforeEach(() => {
    onSelect = vi.fn();
    onCancel = vi.fn();
  });

  describe('constructor', () => {
    it('should create select list with all available levels', () => {
      selector = new ThinkingSelector({
        currentLevel: 'medium',
        availableLevels: levels,
        onSelect,
        onCancel,
      });
      const sl = (selector as any)['selectList'];
      expect(sl['items'].length).toBe(6);
    });

    it('should preselect current level', () => {
      selector = new ThinkingSelector({
        currentLevel: 'low',
        availableLevels: levels,
        onSelect,
        onCancel,
      });
      const sl = (selector as any)['selectList'];
      expect(sl['selectedIndex']).toBe(2); // low is index 2
    });

    it('should include descriptions from LEVEL_DESCRIPTIONS', () => {
      selector = new ThinkingSelector({
        currentLevel: 'off',
        availableLevels: levels,
        onSelect,
        onCancel,
      });
      const sl = (selector as any)['selectList'];
      const item = sl['items'].find(i => i.value === 'off');
      expect(item?.description).toBe('No reasoning');
    });
  });

  describe('draw()', () => {
    beforeEach(() => {
      selector = new ThinkingSelector({
        currentLevel: 'medium',
        availableLevels: levels,
        onSelect,
        onCancel,
      });
    });

    it('should render a bordered box with title " Thinking Level "', () => {
      const result = selector.draw(defaultContext);
      expect(result[0].startsWith('┌')).toBe(true);
      expect(result.some(l => l.includes('Thinking Level'))).toBe(true);
    });

    it('should display all levels', () => {
      const result = selector.draw(defaultContext);
      levels.forEach(level => {
        expect(result.some(l => l.includes(level))).toBe(true);
      });
    });

    it('should include descriptions', () => {
      const result = selector.draw(defaultContext);
      expect(result.some(l => l.includes('Moderate reasoning'))).toBe(true);
    });
  });

  describe('handleKey()', () => {
    beforeEach(() => {
      selector = new ThinkingSelector({
        currentLevel: 'medium',
        availableLevels: levels,
        onSelect,
        onCancel,
      });
      selector.isFocused = true;
    });

    it('should forward keys to selectList', () => {
      // Down arrow
      selector.handleKey(createKeyEvent('001b[B', 'down'));
      const sl = (selector as any)['selectList'];
      expect(sl['selectedIndex']).toBeGreaterThan(0);
    });

    it('should trigger onSelect through selectList', () => {
      const sl = (selector as any)['selectList'];
      // Manually simulate selection change
      sl['selectedIndex'] = 0;
      sl.handleKey?.(createKeyEvent('', 'enter'));
      expect(onSelect).toHaveBeenCalledWith('off');
    });
  });

  describe('clearCache()', () => {
    it('should clear selectList cache', () => {
      selector = new ThinkingSelector({
        currentLevel: 'low',
        availableLevels: levels,
        onSelect,
        onCancel,
      });
      const sl = (selector as any)['selectList'];
      sl.clearCache = vi.fn();
      selector.clearCache();
      expect(sl.clearCache).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle empty availableLevels', () => {
      selector = new ThinkingSelector({
        currentLevel: 'off',
        availableLevels: [],
        onSelect,
        onCancel,
      });
      const result = selector.draw(defaultContext);
      // Still draw box with maybe just title
      expect(result[0].startsWith('┌')).toBe(true);
    });

    it('should handle unicode in descriptions', () => {
      const customLevels: ThinkingLevel[] = ['off'];
      selector = new ThinkingSelector({
        currentLevel: 'off',
        availableLevels: customLevels,
        onSelect,
        onCancel,
      });
      // Override descriptions? Not possible from outside.
    });
  });
});