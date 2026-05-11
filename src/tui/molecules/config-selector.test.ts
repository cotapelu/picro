// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for ConfigSelector molecule component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigSelector, type ConfigItem } from './config-selector';
import type { RenderContext, KeyEvent } from '../atoms/base';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

function createKeyEvent(raw: string): KeyEvent {
  return { raw, name: raw, modifiers: {} };
}

describe('ConfigSelector', () => {
  let items: ConfigItem[];
  let onCancel: vi.Mock;
  let selector: ConfigSelector;

  beforeEach(() => {
    items = [
      { key: 'theme', value: 'dark', type: 'string' },
      { key: 'fontSize', value: '14', type: 'number' },
      { key: 'showImages', value: 'true', type: 'boolean' },
    ];
    onCancel = vi.fn();
  });

  describe('constructor', () => {
    it('should create with items and callbacks', () => {
      selector = new ConfigSelector({ items });
      expect(selector).toBeInstanceOf(ConfigSelector);
      expect(selector['items']).toHaveLength(3);
    });

    it('should default selectedIndex to 0', () => {
      selector = new ConfigSelector({ items });
      expect(selector['selectedIndex']).toBe(0);
    });

    it('should initialize isFocused false', () => {
      selector = new ConfigSelector({ items });
      expect(selector.isFocused).toBe(false);
    });
  });

  describe('draw()', () => {
    beforeEach(() => {
      selector = new ConfigSelector({ items });
    });

    it('should render bordered box with title Config Editor', () => {
      const result = selector.draw(defaultContext);
      expect(result[0].startsWith('┌')).toBe(true);
      expect(result.some(l => l.includes('Config Editor'))).toBe(true);
    });

    it('should list config items as key = value', () => {
      const result = selector.draw(defaultContext);
      expect(result.some(l => l.includes('theme = dark'))).toBe(true);
      expect(result.some(l => l.includes('fontSize = 14'))).toBe(true);
    });

    it('should mark selected with ▶ prefix', () => {
      selector['selectedIndex'] = 1;
      const result = selector.draw(defaultContext);
      expect(result.some(l => l.startsWith('│▶'))).toBe(true);
    });

    it('should show help text', () => {
      const result = selector.draw(defaultContext);
      expect(result.some(l => l.includes('Esc cancel'))).toBe(true);
    });
  });

  describe('handleKey()', () => {
    beforeEach(() => {
      selector = new ConfigSelector({ items, onCancel });
      selector.isFocused = true;
    });

    it('should move selection up/down', () => {
      selector.handleKey(createKeyEvent('down'));
      expect(selector['selectedIndex']).toBe(1);
      selector.handleKey(createKeyEvent('up'));
      expect(selector['selectedIndex']).toBe(0);
    });

    it('should not move past boundaries', () => {
      selector['selectedIndex'] = 2;
      selector.handleKey(createKeyEvent('down'));
      expect(selector['selectedIndex']).toBe(2);
    });

    it('should call onCancel on Escape', () => {
      selector.handleKey(createKeyEvent('\x1b'));
      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('clearCache()', () => {
    it('should be no-op', () => {
      selector = new ConfigSelector({ items });
      expect(() => selector.clearCache()).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty items', () => {
      selector = new ConfigSelector({ items: [] });
      const result = selector.draw(defaultContext);
      expect(result[0].startsWith('┌')).toBe(true);
    });

    it('should handle long values', () => {
      const longItems = [{ key: 'long', value: 'A'.repeat(200), type: 'string' }];
      selector = new ConfigSelector({ items: longItems });
      const result = selector.draw({ ...defaultContext, width: 50 });
      result.forEach(l => {
        expect(l.length).toBeLessThanOrEqual(50);
      });
    });
  });
});