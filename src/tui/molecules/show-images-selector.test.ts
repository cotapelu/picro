// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for ShowImagesSelector molecule component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ShowImagesSelector, type ImageInfo } from './show-images-selector';
import type { RenderContext, KeyEvent } from '../atoms/base';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

function createKeyEvent(raw: string): KeyEvent {
  return { raw, name: raw, modifiers: {} };
}

describe('ShowImagesSelector', () => {
  let images: ImageInfo[];
  let onToggle: vi.Mock;
  let onCancel: vi.Mock;
  let selector: ShowImagesSelector;

  beforeEach(() => {
    images = [
      { id: 'img1', name: 'Graph.png' },
      { id: 'img2', name: 'Diagram.jpg' },
    ];
    onToggle = vi.fn();
    onCancel = vi.fn();
  });

  describe('constructor', () => {
    it('should create with images and defaults', () => {
      selector = new ShowImagesSelector({ images });
      expect(selector).toBeInstanceOf(ShowImagesSelector);
      expect(selector['enabled']).toBe(false);
    });

    it('should accept initial enabled state', () => {
      selector = new ShowImagesSelector({ images, enabled: true });
      expect(selector['enabled']).toBe(true);
    });

    it('should set callbacks', () => {
      selector = new ShowImagesSelector({ images, onToggle, onCancel });
      expect(selector['onToggle']).toBe(onToggle);
      expect(selector['onCancel']).toBe(onCancel);
    });
  });

  describe('draw()', () => {
    beforeEach(() => {
      selector = new ShowImagesSelector({ images });
    });

    it('should render bordered box with title Image Display', () => {
      const result = selector.draw(defaultContext);
      expect(result[0].startsWith('┌')).toBe(true);
      expect(result.some(l => l.includes('Image Display'))).toBe(true);
    });

    it('should show enabled/disabled status', () => {
      selector['enabled'] = true;
      let result = selector.draw(defaultContext);
      expect(result.some(l => l.includes('● Enabled'))).toBe(true);
      selector['enabled'] = false;
      result = selector.draw(defaultContext);
      expect(result.some(l => l.includes('○ Disabled'))).toBe(true);
    });

    it('should list images with emoji', () => {
      const result = selector.draw(defaultContext);
      expect(result.some(l => l.includes('🖼 Graph.png'))).toBe(true);
    });

    it('should mark selected image with ▶', () => {
      selector['selectedIndex'] = 1;
      const result = selector.draw(defaultContext);
      expect(result.some(l => l.startsWith('│▶'))).toBe(true);
    });
  });

  describe('handleKey()', () => {
    beforeEach(() => {
      selector = new ShowImagesSelector({ images, onToggle, onCancel });
      selector.isFocused = true;
    });

    it('should toggle enabled on Space', () => {
      expect(selector['enabled']).toBe(false);
      selector.handleKey(createKeyEvent(' '));
      expect(selector['enabled']).toBe(true);
      expect(onToggle).toHaveBeenCalledWith(true);
    });

    it('should call onCancel on Escape', () => {
      selector.handleKey(createKeyEvent('\x1b'));
      expect(onCancel).toHaveBeenCalled();
    });

    it('should move selection up/down', () => {
      selector.handleKey(createKeyEvent('down'));
      expect(selector['selectedIndex']).toBe(1);
      selector.handleKey(createKeyEvent('up'));
      expect(selector['selectedIndex']).toBe(0);
    });
  });

  describe('clearCache()', () => {
    it('should be no-op', () => {
      selector = new ShowImagesSelector({ images });
      expect(() => selector.clearCache()).not.toThrow();
    });
  });
});