// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for ScopedModelsSelector molecule component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScopedModelsSelector, type ScopedModelInfo } from './scoped-models-selector';
import type { RenderContext, KeyEvent } from '../atoms/base';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

function createKeyEvent(raw: string): KeyEvent {
  return { raw, name: raw, modifiers: {} };
}

describe('ScopedModelsSelector', () => {
  let models: ScopedModelInfo[];
  let onSelect: vi.Mock;
  let onCancel: vi.Mock;
  let selector: ScopedModelsSelector;

  beforeEach(() => {
    models = [
      { id: 'm1', name: 'Model 1', provider: 'Anthropic', scope: 'user' },
      { id: 'm2', name: 'Model 2', provider: 'OpenAI', scope: 'project' },
      { id: 'm3', name: 'Model 3', provider: 'Google', scope: 'global' },
    ];
    onSelect = vi.fn();
    onCancel = vi.fn();
  });

  describe('constructor', () => {
    it('should create with models', () => {
      selector = new ScopedModelsSelector({ models });
      expect(selector['models']).toHaveLength(3);
    });

    it('should set callbacks', () => {
      selector = new ScopedModelsSelector({ models, onSelect, onCancel });
      expect(selector['onSelect']).toBe(onSelect);
      expect(selector['onCancel']).toBe(onCancel);
    });
  });

  describe('draw()', () => {
    it('should render with title Scoped Models', () => {
      selector = new ScopedModelsSelector({ models });
      const result = selector.draw(defaultContext);
      expect(result.some(l => l.includes('Scoped Models'))).toBe(true);
    });

    it('should display scope tags', () => {
      selector = new ScopedModelsSelector({ models });
      const result = selector.draw(defaultContext);
      expect(result.some(l => l.includes('[user]'))).toBe(true);
      expect(result.some(l => l.includes('[project]'))).toBe(true);
      expect(result.some(l => l.includes('[global]'))).toBe(true);
    });

    it('should truncate long model names', () => {
      const longModels = [{ id: 'x', name: 'A'.repeat(50), provider: 'P', scope: 'user' }];
      selector = new ScopedModelsSelector({ models: longModels });
      const result = selector.draw({ ...defaultContext, width: 30 });
      // All lines within width
      result.forEach(l => {
        const visible = l.replace(/\x1b\[[0-9;]*m/g, '').length;
        expect(visible).toBeLessThanOrEqual(30);
      });
    });
  });

  describe('handleKey()', () => {
    beforeEach(() => {
      selector = new ScopedModelsSelector({ models, onSelect, onCancel });
      selector.isFocused = true;
    });

    it('should navigate and select', () => {
      selector.handleKey(createKeyEvent('down'));
      expect(selector['selectedIndex']).toBe(1);
      selector.handleKey(createKeyEvent('\r'));
      expect(onSelect).toHaveBeenCalledWith(models[1]);
    });

    it('should cancel', () => {
      selector.handleKey(createKeyEvent('\x1b'));
      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('clearCache()', () => {
    it('should no-op', () => {
      selector = new ScopedModelsSelector({ models });
      expect(() => selector.clearCache()).not.toThrow();
    });
  });
});