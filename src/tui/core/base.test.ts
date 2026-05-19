// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for base module (types and utilities)
 */

import { describe, it, expect } from 'vitest';
import {
  isInteractive,
  CURSOR_MARKER,
  resolveDimension,
  ElementContainer,
  type UIElement,
  type InteractiveElement,
  type RenderContext,
  type KeyEvent,
  type MouseEvent,
  type PanelAnchor,
  type PanelOptions,
  type PanelHandle,
  type UITheme,
} from './base';

// Mock UIElement
const createElement = (): UIElement => ({
  draw: vi.fn().mockReturnValue([]),
  clearCache: vi.fn(),
});

// Mock InteractiveElement
const createInteractive = (): InteractiveElement => ({ isFocused: false });

const defaultRenderContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

describe('base', () => {
  describe('isInteractive type guard', () => {
    it('should return true for InteractiveElement', () => {
      const el = createInteractive() as any;
      el.draw = () => [];
      el.clearCache = () => {};
      expect(isInteractive(el)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isInteractive(null)).toBe(false);
    });

    it('should return false for UIElement without isFocused', () => {
      const el = createElement();
      expect(isInteractive(el)).toBe(false);
    });
  });

  describe('resolveDimension', () => {
    it('should return number as is', () => {
      expect(resolveDimension(10, 100)).toBe(10);
    });

    it('should parse percentage string', () => {
      expect(resolveDimension('50%', 100)).toBe(50);
      expect(resolveDimension('100%', 80)).toBe(80);
    });

    it('should clamp percentage 0-100', () => {
      expect(resolveDimension('150%', 100)).toBe(100);
      expect(resolveDimension('-10%', 100)).toBe(0);
    });

    it('should return undefined for undefined', () => {
      expect(resolveDimension(undefined, 100)).toBeUndefined();
    });

    it('should parse fractional percentages', () => {
      expect(resolveDimension('33.3%', 100)).toBe(33);
    });

    it('should floor number values', () => {
      expect(resolveDimension(10.7, 100)).toBe(10);
    });
  });

  describe('CURSOR_MARKER', () => {
    it('should be defined escape sequence', () => {
      expect(CURSOR_MARKER).toBe('\x1b_pi:c\x07');
    });
  });

  describe('ElementContainer', () => {
    it('should create empty children', () => {
      const container = new ElementContainer();
      expect(container.children).toHaveLength(0);
    });

    it('should append children', () => {
      const container = new ElementContainer();
      const child = createElement();
      container.append(child);
      expect(container.children).toContain(child);
    });

    it('should remove children', () => {
      const container = new ElementContainer();
      const child = createElement();
      container.append(child);
      container.remove(child);
      expect(container.children).not.toContain(child);
    });

    it('should clear all children', () => {
      const container = new ElementContainer();
      container.append(createElement());
      container.append(createElement());
      container.clear();
      expect(container.children).toHaveLength(0);
    });

    it('draw should concatenate children lines', () => {
      const container = new ElementContainer();
      container.append({ draw: () => ['A'], clearCache: () => {} } as any);
      container.append({ draw: () => ['B'], clearCache: () => {} } as any);
      const result = container.draw(defaultRenderContext);
      expect(result).toEqual(['A', 'B']);
    });

    it('clearCache should clear all children caches', () => {
      const container = new ElementContainer();
      const child = { clearCache: vi.fn(), draw: () => [] } as any;
      container.append(child);
      container.clearCache();
      expect(child.clearCache).toHaveBeenCalled();
    });
  });
});