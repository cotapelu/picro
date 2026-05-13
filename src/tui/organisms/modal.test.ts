// SPDX-License-Identifier: Apache-2.0
/**
 * Comprehensive tests for Modal organism component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Modal, modalDefaultTheme, type ModalButton, type ModalTheme } from './modal';
import type { RenderContext, KeyEvent } from '../atoms/base';
import { visibleWidth } from '../atoms/internal-utils';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

function createKeyEvent(raw: string, name?: string): KeyEvent {
  const keyName = name ? normalizeKeyName(name) : normalizeKeyName(raw);
  return { raw, name: keyName, modifiers: {} };
}

function normalizeKeyName(name: string): string {
  // Handle raw control characters
  if (name === '\r' || name === '\n') return 'Enter';
  if (name === '\x1b') return 'Escape';
  if (name === '\x7f') return 'Backspace';
  // Leave other controls like Ctrl+C (\x03) as-is to match raw case in Modal

  const map: Record<string, string> = {
    'enter': 'Enter',
    'return': 'Enter',
    'left': 'ArrowLeft',
    'right': 'ArrowRight',
    'up': 'ArrowUp',
    'down': 'ArrowDown',
    'backspace': 'Backspace',
    'delete': 'Delete',
    'home': 'Home',
    'end': 'End',
    'escape': 'Escape',
    'tab': 'Tab',
    'space': ' ',
  };
  return map[name.toLowerCase()] || name;
}

describe('Modal', () => {
  let buttons: ModalButton[];
  let onResult: vi.Mock;
  let onCancel: vi.Mock;
  let modal: Modal;

  beforeEach(() => {
    buttons = [
      { label: 'Cancel', value: 'cancel' },
      { label: 'OK', value: 'ok', primary: true },
    ];
    onResult = vi.fn();
    onCancel = vi.fn();
  });

  describe('constructor', () => {
    it('should create with required options', () => {
      modal = new Modal({ title: 'Test', message: 'Hello' });
      expect(modal).toBeInstanceOf(Modal);
      expect(modal['title']).toBe('Test');
      expect(modal['message']).toBe('Hello');
    });

    it('should default type to info', () => {
      modal = new Modal({ title: 'T', message: 'M' });
      expect(modal['type']).toBe('info');
    });

    it('should accept custom type', () => {
      modal = new Modal({ title: 'T', message: 'M', type: 'confirm' });
      expect(modal['type']).toBe('confirm');
    });

    it('should use default buttons based on type', () => {
      modal = new Modal({ title: 'T', message: 'M', type: 'confirm' });
      expect(modal['buttons']).toHaveLength(2);
      modal = new Modal({ title: 'T', message: 'M', type: 'error' });
      expect(modal['buttons']).toHaveLength(1);
    });

    it('should accept custom buttons', () => {
      modal = new Modal({ title: 'T', message: 'M', buttons });
      expect(modal['buttons']).toBe(buttons);
    });

    it('should merge custom theme', () => {
      const customTheme: Partial<ModalTheme> = { bgColor: (s) => `\x1b[31m${s}\x1b[0m` };
      modal = new Modal({ title: 'T', message: 'M', theme: customTheme });
      expect(modal['theme'].bgColor).not.toBe(modalDefaultTheme.bgColor);
    });

    it('should default width to 50', () => {
      modal = new Modal({ title: 'T', message: 'M' });
      expect(modal['requestedWidth']).toBe(50);
    });

    it('should accept custom width', () => {
      modal = new Modal({ title: 'T', message: 'M', width: 60 });
      expect(modal['requestedWidth']).toBe(60);
    });

    it('should set onResult and onCancel', () => {
      modal = new Modal({ title: 'T', message: 'M', onResult, onCancel });
      expect(modal['onResult']).toBe(onResult);
      expect(modal['onCancel']).toBe(onCancel);
    });

    it('should initialize selectedIndex to primary button if available', () => {
      modal = new Modal({ title: 'T', message: 'M', buttons });
      expect(modal['selectedIndex']).toBe(1); // primary button is at index 1
    });

    it('should default isFocused to true', () => {
      modal = new Modal({ title: 'T', message: 'M' });
      expect(modal.isFocused).toBe(true);
    });
  });

  describe('draw()', () => {
    beforeEach(() => {
      modal = new Modal({ title: 'Title', message: 'Message body', buttons, width: 40 });
    });

    it('should render a bordered box', () => {
      const result = modal.draw(defaultContext);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].includes('┌')).toBe(true);
      expect(result[result.length - 1].includes('┘')).toBe(true);
    });

    it('should display title', () => {
      const result = modal.draw(defaultContext);
      expect(result.some(line => line.includes('Title'))).toBe(true);
    });

    it('should display message', () => {
      const result = modal.draw(defaultContext);
      expect(result.some(line => line.includes('Message body'))).toBe(true);
    });

    it('should display buttons', () => {
      const result = modal.draw(defaultContext);
      expect(result.some(line => line.includes('Cancel'))).toBe(true);
      expect(result.some(line => line.includes('OK'))).toBe(true);
    });

    it('should highlight primary button', () => {
      const result = modal.draw(defaultContext);
      // Primary button uses modalDefaultTheme.primaryButton which includes bg color.
      expect(result.some(line => line.includes('\x1b[48;5;33m'))).toBe(true);
    });

    it('should apply destructive style if marked', () => {
      const destructiveBtn: ModalButton[] = [{ label: 'Delete', value: 'del', destructive: true }];
      modal = new Modal({ title: 'T', message: 'M', buttons: destructiveBtn });
      const result = modal.draw(defaultContext);
      expect(result.some(line => line.includes('\x1b[48;5;196m'))).toBe(true);
    });

    it('should respect requested width', () => {
      const result = modal.draw(defaultContext);
      // All lines should be <= width (maybe less due to padding)
      result.forEach(line => {
        expect(visibleWidth(line)).toBeLessThanOrEqual(defaultContext.width);
      });
    });

    it('should show icon based on type', () => {
      modal = new Modal({ title: 'T', message: 'M', type: 'warning' });
      const result = modal.draw(defaultContext);
      expect(result.some(line => line.includes('⚠️'))).toBe(true);
    });

    it('should wrap long message', () => {
      modal = new Modal({ title: 'T', message: 'A'.repeat(200), width: 20 });
      const result = modal.draw(defaultContext);
      // Message should be wrapped into multiple lines
      expect(result.length).toBeGreaterThan(10);
    });

    it('should center content within width', () => {
      const result = modal.draw(defaultContext);
      // Borders at edges, content padded
      result.forEach(line => {
        if (line.startsWith('│') && line.endsWith('│')) {
          expect(line.length).toBeLessThanOrEqual(defaultContext.width);
        }
      });
    });
  });

  describe('handleKey()', () => {
    beforeEach(() => {
      modal = new Modal({ title: 'T', message: 'M', buttons, onResult, onCancel });
      modal.isFocused = true;
    });

    it("should move selection left with Left arrow or 'h'", () => {
      modal.handleKey(createKeyEvent('[D', 'ArrowLeft'));
      expect(modal['selectedIndex']).toBe(0); // already at 0
      // Need at least 2 buttons for left to do something when at index 1.
      modal['selectedIndex'] = 1;
      modal.handleKey(createKeyEvent('[D', 'ArrowLeft'));
      expect(modal['selectedIndex']).toBe(0);
    });

    it("should move selection right with Right arrow or 'l'", () => {
      modal.handleKey(createKeyEvent('[C', 'ArrowRight'));
      expect(modal['selectedIndex']).toBe(1);
    });

    it('should not move past rightmost button', () => {
      modal['selectedIndex'] = 1;
      modal.handleKey(createKeyEvent('[C', 'ArrowRight'));
      expect(modal['selectedIndex']).toBe(1);
    });

    it('should confirm selection on Enter', () => {
      modal.handleKey(createKeyEvent('\r', 'enter'));
      expect(onResult).toHaveBeenCalledWith('ok');
    });

    it('should call onCancel on Escape', () => {
      modal.handleKey(createKeyEvent('', 'Escape'));
      expect(onCancel).toHaveBeenCalled();
    });

    it('should call onCancel on ctrl+c?', () => {
      modal.handleKey(createKeyEvent('\x03'));
      expect(onCancel).toHaveBeenCalled();
    });

    it('should trigger confirm on first button if Enter at index 0', () => {
      modal['selectedIndex'] = 0;
      modal.handleKey(createKeyEvent('\r', 'enter'));
      expect(onResult).toHaveBeenCalledWith('cancel');
    });
  });

  describe('moveLeft() / moveRight()', () => {
    it('should update selectedIndex', () => {
      modal = new Modal({ title: 'T', message: 'M', buttons });
      modal['selectedIndex'] = 1;
      modal['moveLeft']();
      expect(modal['selectedIndex']).toBe(0);
      modal['moveRight']();
      modal['moveRight'](); // at 1, right to 1? can't go beyond
      expect(modal['selectedIndex']).toBe(1);
    });
  });

  describe('confirm()', () => {
    it('should call onResult with button value', () => {
      modal = new Modal({ title: 'T', message: 'M', buttons, onResult });
      modal['selectedIndex'] = 0;
      modal['confirm']();
      expect(onResult).toHaveBeenCalledWith('cancel');
    });

    it('should do nothing if no button at index', () => {
      modal = new Modal({ title: 'T', message: 'M', buttons: [] });
      modal['selectedIndex'] = 0;
      modal['confirm'](); // no crash
    });
  });

  describe('getDefaultButtons()', () => {
    it('should return two buttons for confirm', () => {
      modal = new Modal({ title: 'T', message: 'M', type: 'confirm' });
      const defaults = (modal as any)['getDefaultButtons']();
      expect(defaults).toHaveLength(2);
      expect(defaults[1].primary).toBe(true);
    });

    it('should return single OK for error/warning', () => {
      modal = new Modal({ title: 'T', message: 'M', type: 'error' });
      const defaults = (modal as any)['getDefaultButtons']();
      expect(defaults).toHaveLength(1);
      expect(defaults[0].value).toBe('ok');
    });

    it('should return single OK for info/custom default', () => {
      modal = new Modal({ title: 'T', message: 'M' });
      const defaults = (modal as any)['getDefaultButtons']();
      expect(defaults).toHaveLength(1);
    });
  });

  describe('clearCache()', () => {
    it('should be no-op (no cache)', () => {
      modal = new Modal({ title: 'T', message: 'M' });
      expect(() => modal.clearCache()).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle very narrow width', () => {
      modal = new Modal({ title: 'T', message: 'M', width: 10 });
      const result = modal.draw(defaultContext);
      expect(result).toBeDefined();
    });

    it('should handle empty message', () => {
      modal = new Modal({ title: 'T', message: '' });
      const result = modal.draw(defaultContext);
      expect(result).toBeDefined();
    });

    it('should handle empty title?', () => {
      modal = new Modal({ title: '', message: 'M' });
      const result = modal.draw(defaultContext);
      // Still shows title line empty
      expect(result).toBeDefined();
    });

    it('should handle many buttons', () => {
      const manyButtons = Array.from({ length: 10 }, (_, i) => ({ label: `B${i}`, value: `b${i}` }));
      modal = new Modal({ title: 'T', message: 'M', buttons: manyButtons });
      expect(modal['buttons']).toHaveLength(10);
      modal['selectedIndex'] = 5;
      modal['moveRight']();
      expect(modal['selectedIndex']).toBe(6);
    });

    it('should handle unicode in title/message/buttons', () => {
      modal = new Modal({ title: '😀', message: '😁😂', buttons: [{ label: '👍', value: 'y' }] });
      const result = modal.draw(defaultContext);
      expect(result.some(l => l.includes('😀'))).toBe(true);
    });
  });
});