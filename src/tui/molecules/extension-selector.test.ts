// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for ExtensionSelector molecule component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExtensionSelector, type ExtensionInfo } from './extension-selector';
import type { RenderContext, KeyEvent } from '../atoms/base';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

function createKeyEvent(raw: string): KeyEvent {
  return { raw, name: raw, modifiers: {} };
}

describe('ExtensionSelector', () => {
  let extensions: ExtensionInfo[];
  let onSelect: vi.Mock;
  let onToggle: vi.Mock;
  let onCancel: vi.Mock;
  let selector: ExtensionSelector;

  beforeEach(() => {
    extensions = [
      { id: 'ext1', name: 'Extension One', enabled: true },
      { id: 'ext2', name: 'Extension Two', enabled: false },
    ];
    onSelect = vi.fn();
    onToggle = vi.fn();
    onCancel = vi.fn();
  });

  describe('constructor', () => {
    it('should create with extensions', () => {
      selector = new ExtensionSelector({ extensions });
      expect(selector['extensions']).toHaveLength(2);
    });

    it('should set callbacks', () => {
      selector = new ExtensionSelector({ extensions, onSelect, onToggle, onCancel });
      expect(selector['onSelect']).toBe(onSelect);
      expect(selector['onToggle']).toBe(onToggle);
      expect(selector['onCancel']).toBe(onCancel);
    });

    it('should default selectedIndex to 0', () => {
      selector = new ExtensionSelector({ extensions });
      expect(selector['selectedIndex']).toBe(0);
    });
  });

  describe('draw()', () => {
    beforeEach(() => {
      selector = new ExtensionSelector({ extensions });
    });

    it('should render bordered box with title " Extensions "', () => {
      const result = selector.draw(defaultContext);
      expect(result[0].startsWith('┌')).toBe(true);
      expect(result.some(l => l.includes('Extensions'))).toBe(true);
    });

    it('should show checkmark for enabled, circle for disabled', () => {
      const result = selector.draw(defaultContext);
      expect(result.some(l => l.includes('✓'))).toBe(true);
      expect(result.some(l => l.includes('○'))).toBe(true);
    });

    it('should mark selected with ▶', () => {
      selector['selectedIndex'] = 1;
      const result = selector.draw(defaultContext);
      const line = result.find(l => l.includes('Extension Two'));
      expect(line?.startsWith('│▶')).toBe(true);
    });

    it('should show help text', () => {
      const result = selector.draw(defaultContext);
      expect(result.some(l => l.includes('Space toggle'))).toBe(true);
    });
  });

  describe('handleKey()', () => {
    beforeEach(() => {
      selector = new ExtensionSelector({ extensions, onSelect, onToggle, onCancel });
      selector.isFocused = true;
    });

    it('should move selection up/down', () => {
      selector.handleKey(createKeyEvent('down'));
      expect(selector['selectedIndex']).toBe(1);
      selector.handleKey(createKeyEvent('up'));
      expect(selector['selectedIndex']).toBe(0);
    });

    it('should call onCancel on Escape', () => {
      selector.handleKey(createKeyEvent('\x1b'));
      expect(onCancel).toHaveBeenCalled();
    });

    it('should call onSelect on Enter', () => {
      selector.handleKey(createKeyEvent('\r'));
      expect(onSelect).toHaveBeenCalledWith(extensions[0]);
    });

    it('should toggle enabled via Space', () => {
      expect(extensions[0].enabled).toBe(true);
      selector.handleKey(createKeyEvent(' '));
      expect(extensions[0].enabled).toBe(false);
      expect(onToggle).toHaveBeenCalledWith(extensions[0], false);
    });

    it('should not toggle if onToggle not provided', () => {
      selector = new ExtensionSelector({ extensions, onSelect });
      expect(() => selector.handleKey(createKeyEvent(' '))).not.toThrow();
    });
  });

  describe('clearCache()', () => {
    it('should be no-op', () => {
      selector = new ExtensionSelector({ extensions });
      expect(() => selector.clearCache()).not.toThrow();
    });
  });
});