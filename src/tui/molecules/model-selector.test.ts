// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for ModelSelector molecule component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModelSelector, type ModelInfo } from './model-selector';
import type { RenderContext, KeyEvent } from '../atoms/base';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

function createKeyEvent(raw: string): KeyEvent {
  return { raw, name: raw, modifiers: {} };
}

describe('ModelSelector', () => {
  let models: ModelInfo[];
  let onSelect: vi.Mock;
  let onCancel: vi.Mock;
  let selector: ModelSelector;

  beforeEach(() => {
    models = [
      { id: 'claude-3', name: 'Claude 3', provider: 'Anthropic', contextWindow: 200000 },
      { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI', contextWindow: 8192 },
      { id: 'llama-3', name: 'Llama 3', provider: 'Meta', contextWindow: 8192 },
    ];
    onSelect = vi.fn();
    onCancel = vi.fn();
  });

  describe('constructor', () => {
    it('should create with models', () => {
      selector = new ModelSelector({ models });
      expect(selector).toBeInstanceOf(ModelSelector);
      expect(selector['models']).toHaveLength(3);
    });

    it('should set callbacks', () => {
      selector = new ModelSelector({ models, onSelect, onCancel });
      expect(selector['onSelect']).toBe(onSelect);
      expect(selector['onCancel']).toBe(onCancel);
    });

    it('should default selectedIndex to 0', () => {
      selector = new ModelSelector({ models });
      expect(selector['selectedIndex']).toBe(0);
    });
  });

  describe('draw()', () => {
    beforeEach(() => {
      selector = new ModelSelector({ models });
    });

    it('should render a bordered box', () => {
      const result = selector.draw(defaultContext);
      expect(result[0].startsWith('┌')).toBe(true);
      expect(result[result.length - 1].startsWith('┘')).toBe(true);
    });

    it('should display title " Select Model "', () => {
      const result = selector.draw(defaultContext);
      expect(result.some(l => l.includes('Select Model'))).toBe(true);
    });

    it('should list models with name, provider, and context window', () => {
      const result = selector.draw(defaultContext);
      expect(result.some(l => l.includes('Claude 3'))).toBe(true);
      expect(result.some(l => l.includes('[Anthropic]'))).toBe(true);
      expect(result.some(l => l.includes('200K'))).toBe(true); // 200k -> 200K?
    });

    it('should format context window in K/M', () => {
      const result = selector.draw(defaultContext);
      expect(result.some(l => l.includes('200K'))).toBe(true);
      expect(result.some(l => l.includes('8K'))).toBe(true);
    });

    it('should mark selected with ▶ prefix', () => {
      selector['selectedIndex'] = 1;
      const result = selector.draw(defaultContext);
      const line = result.find(l => l.includes('GPT-4'));
      expect(line?.startsWith('│▶')).toBe(true);
    });

    it('should show help text', () => {
      const result = selector.draw(defaultContext);
      expect(result.some(l => l.includes('↑↓ navigate  Enter select  Esc cancel'))).toBe(true);
    });

    it('should truncate long lines', () => {
      const longName = 'A'.repeat(100);
      const longModels = [{ id: 'x', name: longName, provider: 'P', contextWindow: 1000 }];
      selector = new ModelSelector({ models: longModels });
      const result = selector.draw({ ...defaultContext, width: 30 });
      result.forEach(l => {
        const visible = l.replace(/\x1b\[[0-9;]*m/g, '').length;
        expect(visible).toBeLessThanOrEqual(30);
      });
    });
  });

  describe('handleKey()', () => {
    beforeEach(() => {
      selector = new ModelSelector({ models, onSelect, onCancel });
      selector.isFocused = true;
    });

    it('should move selection up/down', () => {
      selector.handleKey(createKeyEvent('down'));
      expect(selector['selectedIndex']).toBe(1);
      selector.handleKey(createKeyEvent('down'));
      expect(selector['selectedIndex']).toBe(2);
    });

    it('should not move past boundaries', () => {
      selector['selectedIndex'] = 2;
      selector.handleKey(createKeyEvent('down'));
      expect(selector['selectedIndex']).toBe(2);
      selector['selectedIndex'] = 0;
      selector.handleKey(createKeyEvent('up'));
      expect(selector['selectedIndex']).toBe(0);
    });

    it('should call onSelect on Enter', () => {
      selector.handleKey(createKeyEvent('\r'));
      expect(onSelect).toHaveBeenCalledWith(models[0]);
    });

    it('should call onCancel on Escape', () => {
      selector.handleKey(createKeyEvent('\x1b'));
      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('clearCache()', () => {
    it('should clear cached lines', () => {
      selector = new ModelSelector({ models });
      selector['cache'] = [];
      selector.clearCache();
      expect(selector['cache']).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty models array', () => {
      selector = new ModelSelector({ models: [] });
      const result = selector.draw(defaultContext);
      expect(result[0].startsWith('┌')).toBe(true);
    });

    it('should handle very large context window (10M)', () => {
      const huge = [{ id: 'h', name: 'Huge', provider: 'X', contextWindow: 10_000_000 }];
      selector = new ModelSelector({ models: huge });
      const result = selector.draw(defaultContext);
      expect(result.some(l => l.includes('10M'))).toBe(true);
    });

    it('should handle unicode in names', () => {
      const unicode = [{ id: 'x', name: '😀 Model', provider: '😁', contextWindow: 1000 }];
      selector = new ModelSelector({ models: unicode });
      const result = selector.draw(defaultContext);
      expect(result.some(l => l.includes('😀'))).toBe(true);
    });
  });
});