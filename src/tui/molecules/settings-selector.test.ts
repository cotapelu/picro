// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for SettingsSelector molecule component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SettingsSelector, type SettingsSelectorSettingItem } from './settings-selector';
import type { RenderContext, KeyEvent } from '../atoms/base';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

function createKeyEvent(raw: string): KeyEvent {
  return { raw, name: raw, modifiers: {} };
}

describe('SettingsSelector', () => {
  let settings: SettingsSelectorSettingItem[];
  let onChange: vi.Mock;
  let onCancel: vi.Mock;
  let selector: SettingsSelector;

  beforeEach(() => {
    settings = [
      { id: 'theme', name: 'Theme', type: 'string', value: 'dark' },
      { id: 'images', name: 'Show Images', type: 'boolean', value: true },
      { id: 'fontSize', name: 'Font Size', type: 'number', value: 14 },
    ];
    onChange = vi.fn();
    onCancel = vi.fn();
  });

  describe('constructor', () => {
    it('should create with settings and callbacks', () => {
      selector = new SettingsSelector({ settings, onChange, onCancel });
      expect(selector).toBeInstanceOf(SettingsSelector);
      expect(selector['settings']).toHaveLength(3);
    });

    it('should default selectedIndex to 0', () => {
      selector = new SettingsSelector({ settings });
      expect(selector['selectedIndex']).toBe(0);
    });

    it('should initialize isFocused false', () => {
      selector = new SettingsSelector({ settings });
      expect(selector.isFocused).toBe(false);
    });
  });

  describe('draw()', () => {
    beforeEach(() => {
      selector = new SettingsSelector({ settings });
    });

    it('should render a bordered box', () => {
      const result = selector.draw(defaultContext);
      expect(result[0].startsWith('┌')).toBe(true);
      expect(result[result.length - 1].startsWith('┘')).toBe(true);
    });

    it('should display title " Settings "', () => {
      const result = selector.draw(defaultContext);
      expect(result.some(l => l.includes('Settings'))).toBe(true);
    });

    it('should list settings with name and value', () => {
      const result = selector.draw(defaultContext);
      expect(result.some(l => l.includes('Theme = dark'))).toBe(true);
      expect(result.some(l => l.includes('Show Images = true'))).toBe(true);
      expect(result.some(l => l.includes('Font Size = 14'))).toBe(true);
    });

    it('should indicate selected with ▶ prefix', () => {
      selector['selectedIndex'] = 1;
      const result = selector.draw(defaultContext);
      const line = result.find(l => l.includes('Show Images'));
      expect(line?.startsWith('│▶')).toBe(true);
    });

    it('should show help text', () => {
      const result = selector.draw(defaultContext);
      expect(result.some(l => l.includes('↑↓ navigate  Space toggle  Esc cancel'))).toBe(true);
    });

    it('should limit visible items by height', () => {
      const many = Array.from({ length: 20 }, (_, i) => ({ id: `s${i}`, name: `S${i}`, type: 'boolean' as const, value: false }));
      selector = new SettingsSelector({ settings: many });
      const result = selector.draw({ ...defaultContext, height: 10 });
      const settingLines = result.filter(l => l.includes('S'));
      expect(settingLines.length).toBeLessThan(5);
    });
  });

  describe('handleKey()', () => {
    beforeEach(() => {
      selector = new SettingsSelector({ settings, onChange, onCancel });
      selector.isFocused = true;
    });

    it('should move selection up/down', () => {
      selector.handleKey(createKeyEvent('\x1b[A'));
      expect(selector['selectedIndex']).toBe(0); // already at top
      selector.handleKey(createKeyEvent('\x1b[B'));
      expect(selector['selectedIndex']).toBe(1);
    });

    it('should not exceed bounds', () => {
      selector['selectedIndex'] = 2;
      selector.handleKey(createKeyEvent('down'));
      expect(selector['selectedIndex']).toBe(2);
    });

    it('should call onCancel on Escape', () => {
      selector.handleKey(createKeyEvent('\x1b'));
      expect(onCancel).toHaveBeenCalled();
    });

    it('should toggle boolean settings on Space', () => {
      expect(settings[1].value).toBe(true);
      selector['selectedIndex'] = 1;
      selector.handleKey(createKeyEvent(' '));
      expect(settings[1].value).toBe(false);
      expect(onChange).toHaveBeenCalledWith(settings[1]);
    });

    it('should not toggle non-boolean on Space', () => {
      selector['selectedIndex'] = 0;
      selector.handleKey(createKeyEvent(' '));
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('clearCache()', () => {
    it('should be no-op', () => {
      selector = new SettingsSelector({ settings });
      expect(() => selector.clearCache()).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty settings array', () => {
      selector = new SettingsSelector({ settings: [] });
      const result = selector.draw(defaultContext);
      expect(result[0].startsWith('┌')).toBe(true);
    });

    it('should handle settings with null/undefined values', () => {
      const weird = [{ id: 'x', name: 'X', type: 'string' as const, value: null }];
      selector = new SettingsSelector({ settings: weird });
      expect(() => selector.draw(defaultContext)).not.toThrow();
    });

    it('should handle unicode in names', () => {
      const uni = [{ id: 'x', name: '😀', type: 'boolean', value: true }];
      selector = new SettingsSelector({ settings: uni });
      const result = selector.draw(defaultContext);
      expect(result.some(l => l.includes('😀'))).toBe(true);
    });
  });
});