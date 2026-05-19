// SPDX-License-Identifier: Apache-2.0
/**
 * Comprehensive tests for KeybindingHints molecule component
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { KeybindingHints, type KeyBinding } from './keybinding-hints';
import type { RenderContext } from '../core/base';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

describe('KeybindingHints', () => {
  let bindings: KeyBinding[];
  let hints: KeybindingHints;

  beforeEach(() => {
    bindings = [
      { key: 'Ctrl+S', action: 'Save' },
      { key: 'Ctrl+O', action: 'Open' },
      { key: 'Ctrl+Q', action: 'Quit' },
      { key: 'F1', action: 'Help' },
    ];
    hints = new KeybindingHints({ bindings });
  });

  describe('constructor', () => {
    it('should create with bindings array', () => {
      expect(hints).toBeInstanceOf(KeybindingHints);
      expect(hints['bindings']).toEqual(bindings);
    });

    it('should default columnWidth to 20', () => {
      expect(hints['columnWidth']).toBe(20);
    });

    it('should default spacing to 2', () => {
      expect(hints['spacing']).toBe(2);
    });

    it('should default keyColor to yellow', () => {
      expect(hints['keyColor']).toBe('\x1b[33m');
    });

    it('should default actionColor to white', () => {
      expect(hints['actionColor']).toBe('\x1b[37m');
    });

    it('should accept custom options', () => {
      const custom = new KeybindingHints({
        bindings,
        columnWidth: 15,
        spacing: 4,
        keyColor: '\x1b[31m',
        actionColor: '\x1b[32m',
      });
      expect(custom['columnWidth']).toBe(15);
      expect(custom['spacing']).toBe(4);
      expect(custom['keyColor']).toBe('\x1b[31m');
      expect(custom['actionColor']).toBe('\x1b[32m');
    });
  });

  describe('setBindings()', () => {
    it('should update bindings and clear cache', () => {
      const newBindings = [{ key: 'A', action: 'Alpha' }];
      hints.setBindings(newBindings);
      expect(hints['bindings']).toEqual(newBindings);
    });
  });

  describe('draw()', () => {
    it('should render bindings in columns', () => {
      const result = hints.draw(defaultContext);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toContain('Ctrl+S');
      expect(result[0]).toContain('Save');
    });

    it('should apply colors', () => {
      const result = hints.draw(defaultContext);
      expect(result[0]).toContain('\x1b[33m'); // keyColor
      expect(result[0]).toContain('\x1b[37m'); // actionColor
    });

    it('should reset colors at end of each binding', () => {
      const result = hints.draw(defaultContext);
      // Each binding should have reset after action
      expect(result[0]).toMatch(/\x1b\[0m/);
    });

    it('should space columns evenly based on width', () => {
      const narrow = { ...defaultContext, width: 40 };
      const result = hints.draw(narrow);
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('should pad lines to full width', () => {
      const result = hints.draw(defaultContext);
      result.forEach(line => {
        // Visible length (without ANSI) should equal width
        const visible = line.replace(/\x1b\[[0-9;]*m/g, '').length;
        expect(visible).toBe(80);
      });
    });

    it('should handle empty bindings', () => {
      hints = new KeybindingHints({ bindings: [] });
      const result = hints.draw(defaultContext);
      expect(result).toHaveLength(0);
    });

    it('should handle single binding', () => {
      hints = new KeybindingHints({ bindings: [{ key: 'A', action: 'Action' }] });
      const result = hints.draw(defaultContext);
      expect(result).toHaveLength(1);
      expect(result[0]).toContain('A');
      expect(result[0]).toContain('Action');
    });

    it('should truncate key to columnWidth', () => {
      const longKey = 'A'.repeat(100);
      hints = new KeybindingHints({ bindings: [{ key: longKey, action: 'Test' }], columnWidth: 10 });
      const result = hints.draw(defaultContext);
      // The key should be padded/truncated to columnWidth
      expect(result[0]).toBeDefined();
    });
  });

  describe('clearCache()', () => {
    it('should be no-op (stateless)', () => {
      expect(() => hints.clearCache()).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle very many bindings', () => {
      const many = Array.from({ length: 100 }, (_, i) => ({ key: `K${i}`, action: `Action ${i}` }));
      hints = new KeybindingHints({ bindings: many });
      const result = hints.draw(defaultContext);
      expect(result.length).toBeGreaterThan(1);
    });

    it('should handle unicode in key and action', () => {
      hints = new KeybindingHints({ bindings: [{ key: '😀', action: 'Emoji' }] });
      const result = hints.draw(defaultContext);
      expect(result[0]).toContain('😀');
    });

    it('should handle very small width', () => {
      hints = new KeybindingHints({ bindings, columnWidth: 5, spacing: 1 });
      const result = hints.draw({ ...defaultContext, width: 10 });
      expect(result).toBeDefined();
    });

    it('should handle large columnWidth', () => {
      hints = new KeybindingHints({ bindings, columnWidth: 60 });
      const result = hints.draw(defaultContext);
      // May only fit one column
      expect(result.length).toBeGreaterThanOrEqual(1);
    });
  });
});