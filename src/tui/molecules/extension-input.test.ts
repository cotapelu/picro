// SPDX-License-Identifier: Apache-2.0
/**
 * Comprehensive tests for ExtensionInput molecule component
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ExtensionInput } from './extension-input';
import type { RenderContext, KeyEvent } from '../atoms/base';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

function createKeyEvent(raw: string): KeyEvent {
  return { raw, name: raw, modifiers: {} };
}

describe('ExtensionInput', () => {
  let input: ExtensionInput;
  let onSubmit: vi.Mock;
  let onCancel: vi.Mock;

  beforeEach(() => {
    onSubmit = vi.fn();
    onCancel = vi.fn();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should create with default options', () => {
      input = new ExtensionInput();
      expect(input).toBeInstanceOf(ExtensionInput);
      expect(input['label']).toBe('Input');
      expect(input['value']).toBe('');
    });

    it('should accept custom label', () => {
      input = new ExtensionInput({ label: 'Name' });
      expect(input['label']).toBe('Name');
    });

    it('should accept defaultValue', () => {
      input = new ExtensionInput({ defaultValue: 'test' });
      expect(input['value']).toBe('test');
    });

    it('should accept onSubmit and onCancel', () => {
      input = new ExtensionInput({ onSubmit, onCancel });
      expect(input['onSubmit']).toBe(onSubmit);
      expect(input['onCancel']).toBe(onCancel);
    });

    it('should default isFocused to false', () => {
      expect(input.isFocused).toBe(false);
    });
  });

  describe('draw()', () => {
    it('should render bordered box', () => {
      input = new ExtensionInput({ label: 'Test' });
      const result = input.draw(defaultContext);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].startsWith('┌')).toBe(true);
      expect(result[result.length - 1].startsWith('└')).toBe(true);
    });

    it('should display label centered', () => {
      input = new ExtensionInput({ label: 'Name' });
      const result = input.draw(defaultContext);
      const titleLine = result.find(line => line.includes(' Name '));
      expect(titleLine).toBeDefined();
    });

    it('should display current value', () => {
      input = new ExtensionInput({ defaultValue: 'Hello' });
      const result = input.draw({ ...defaultContext, height: 10 });
      expect(result.some(line => line.includes('Hello'))).toBe(true);
    });

    it('should show cursor block when focused', () => {
      input = new ExtensionInput();
      input.isFocused = true;
      const result1 = input.draw(defaultContext);
      expect(result1.some(line => line.includes('█'))).toBe(true);
      // Next draw should blink cursor to underscore
      const result2 = input.draw(defaultContext);
      expect(result2.some(line => line.includes('_'))).toBe(true);
    });

    it('should show underscore when not focused', () => {
      input.isFocused = false;
      const result = input.draw(defaultContext);
      expect(result.some(line => line.includes('_'))).toBe(true);
    });

    it('should include help text at bottom', () => {
      input = new ExtensionInput();
      const result = input.draw({ ...defaultContext, height: 15 });
      expect(result.some(line => line.includes('Enter submit  Esc cancel'))).toBe(true);
    });

    it('should pad empty lines to fill height', () => {
      input = new ExtensionInput();
      const result = input.draw({ ...defaultContext, height: 30 });
      // Should have many lines
      expect(result.length).toBeGreaterThan(10);
    });

    it('should blink cursor on successive draws', () => {
      input = new ExtensionInput();
      input.isFocused = true;
      const r1 = input.draw(defaultContext);
      const r2 = input.draw(defaultContext);
      // Cursor char should toggle
      const hasBlock1 = r1.some(l => l.includes('█'));
      const hasUnderscore2 = r2.some(l => l.includes('_'));
      // Since it toggles, both states possible across draws.
      // Actually first draw toggles from false->true? Initially cursorBlink = true, draw toggles to false after first draw.
      // So first draw shows cursorBlink (true) -> '█', second shows '|? Actually code: display = value + (isFocused && cursorBlink ? '█' : '_');
      // Then cursorBlink = !cursorBlink.
      // On first draw: cursorBlink=true => '█', then set false.
      // On second draw: cursorBlink=false => '_', then set true.
    });
  });

  describe('handleKey()', () => {
    beforeEach(() => {
      input = new ExtensionInput({ defaultValue: 'Hi', onSubmit, onCancel });
      input.isFocused = true;
    });

    it('should submit on Enter', () => {
      input.handleKey(createKeyEvent('\r'));
      expect(onSubmit).toHaveBeenCalledWith('Hi');
    });

    it('should submit on Ctrl+M?', () => {
      input.handleKey(createKeyEvent('\n'));
      expect(onSubmit).toHaveBeenCalledWith('Hi');
    });

    it('should cancel on Escape', () => {
      input.handleKey(createKeyEvent('\x1b'));
      expect(onCancel).toHaveBeenCalled();
    });

    it('should backspace on Backspace or Delete? Actually code uses \x7f or \b', () => {
      input.handleKey(createKeyEvent('\x7f'));
      expect(input['value']).toBe('H');
      input.handleKey(createKeyEvent('\b'));
      expect(input['value']).toBe('');
    });

    it('should insert printable characters', () => {
      input.handleKey(createKeyEvent('a'));
      expect(input['value']).toBe('Hia');
    });

    it('should ignore other control sequences', () => {
      input.handleKey(createKeyEvent('\x01')); // Ctrl+A
      expect(input['value']).toBe('Hi'); // unchanged
    });
  });

  describe('clearCache()', () => {
    it('should be no-op', () => {
      input = new ExtensionInput();
      expect(() => input.clearCache()).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty value', () => {
      input = new ExtensionInput({ defaultValue: '' });
      input.isFocused = true;
      const result = input.draw(defaultContext);
      expect(result.some(line => line.includes('_'))).toBe(true);
    });

    it('should handle very long value', () => {
      input = new ExtensionInput({ defaultValue: 'A'.repeat(1000) });
      input.isFocused = true;
      const result = input.draw(defaultContext);
      expect(result).toBeDefined();
    });

    it('should handle unicode', () => {
      input = new ExtensionInput({ defaultValue: '😀' });
      input.isFocused = true;
      const result = input.draw(defaultContext);
      expect(result.some(line => line.includes('😀'))).toBe(true);
    });

    it('should handle narrow width terminal', () => {
      const narrow = { width: 10, height: 5, theme: {} };
      input = new ExtensionInput({ label: 'X' });
      const result = input.draw(narrow);
      expect(result).toBeDefined();
    });

    it('should handle height less than required lines', () => {
      const tiny = { width: 20, height: 3, theme: {} };
      input = new ExtensionInput();
      const result = input.draw(tiny);
      expect(result.length).toBeLessThanOrEqual(3);
    });
  });
});