// SPDX-License-Identifier: Apache-2.0
/**
 * Comprehensive tests for Input molecule component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Input } from './input';
import type { RenderContext, KeyEvent } from '../core/base';
import { visibleWidth } from '../core/internal-utils';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

function createKeyEvent(raw: string, name?: string, modifiers: Partial<KeyEvent['modifiers']> = {}): KeyEvent {
  return {
    raw,
    name: name || raw,
    modifiers: {
      ctrl: false,
      alt: false,
      shift: false,
      meta: false,
      ...modifiers,
    },
  };
}

describe('Input', () => {
  let input: Input;

  beforeEach(() => {
    input = new Input();
  });

  describe('constructor', () => {
    it('should create with default options', () => {
      expect(input).toBeInstanceOf(Input);
      expect(input.getValue()).toBe('');
      expect(input['maxWidth']).toBe(80);
    });

    it('should accept initial value', () => {
      const i = new Input({ value: 'Hello' });
      expect(i.getValue()).toBe('Hello');
    });

    it('should accept placeholder', () => {
      const i = new Input({ placeholder: 'Type here...' });
      expect(i['placeholder']).toBe('Type here...');
    });

    it('should accept maxWidth', () => {
      const i = new Input({ maxWidth: 50 });
      expect(i['maxWidth']).toBe(50);
    });

    it('should support password mode', () => {
      const i = new Input({ password: true });
      expect(i['password']).toBe(true);
      expect(i['maskChar']).toBe('*');
    });

    it('should accept custom mask char', () => {
      const i = new Input({ password: true, maskChar: '•' });
      expect(i['maskChar']).toBe('•');
    });
  });

  describe('value management', () => {
    it('should get current value', () => {
      input.setValue('Test');
      expect(input.getValue()).toBe('Test');
    });

    it('should set value and trigger onChange', () => {
      const onChange = vi.fn();
      input = new Input({ onChange });
      input.setValue('New');
      expect(onChange).toHaveBeenCalledWith('New');
    });

    it('should keep cursor within bounds after setValue', () => {
      input = new Input({ value: 'Hello' });
      input['cursorPos'] = 10; // beyond length
      input.setValue('Hi');
      expect(input['cursorPos']).toBe(2); // clamp to length
    });

    it('should insert text at cursor position', () => {
      input = new Input({ value: 'He', onChange: vi.fn() });
      input['cursorPos'] = 2;
      input.insertText('llo');
      expect(input.getValue()).toBe('Hello');
      expect(input['cursorPos']).toBe(5);
    });

    it('should trigger onChange on insertText', () => {
      const onChange = vi.fn();
      input = new Input({ onChange });
      input.insertText('A');
      expect(onChange).toHaveBeenCalled();
    });
  });

  describe('draw()', () => {
    it('should render value when focused or non-empty', () => {
      input = new Input({ value: 'Hello' });
      input.isFocused = true;
      const result = input.draw(defaultContext);
      expect(result).toHaveLength(1);
      expect(result[0]).toContain('Hello');
    });

    it('should show placeholder when not focused and empty', () => {
      input = new Input({ placeholder: 'Enter text...' });
      input.isFocused = false;
      const result = input.draw(defaultContext);
      expect(result[0]).toContain('Enter text...');
      expect(result[0]).toContain('\x1b[2m'); // dim
    });

    it('should mask password', () => {
      input = new Input({ value: 'secret', password: true });
      input.isFocused = true;
      const result = input.draw(defaultContext);
      expect(result[0]).not.toContain('secret');
      expect(result[0]).toContain('******'); // mask
    });

    it('should include cursor marker when focused', () => {
      input = new Input({ value: 'Hello' });
      input.isFocused = true;
      input['cursorPos'] = 2;
      const result = input.draw(defaultContext);
      expect(result[0]).toContain('\x1b_pi:c\x07');
    });

    it('should not include cursor marker when not focused', () => {
      input = new Input({ value: 'Hello' });
      input.isFocused = false;
      const result = input.draw(defaultContext);
      expect(result[0]).not.toContain('\x1b_pi:c\x07');
    });

    it('should respect maxWidth for rendering', () => {
      input = new Input({ value: 'Hello World', maxWidth: 5 });
      input.isFocused = true;
      const result = input.draw(defaultContext);
      // The rendered line should be truncated
      expect(visibleWidth(result[0])).toBeLessThanOrEqual(5); // maxWidth
    });

    it('should handle empty value when focused', () => {
      input = new Input({});
      input.isFocused = true;
      const result = input.draw(defaultContext);
      expect(result[0]).toBe('\x1b_pi:c\x07'); // just cursor
    });
  });

  describe('handleKey()', () => {
    it('should move cursor left with ArrowLeft', () => {
      input = new Input({ value: 'Hello' });
      input.isFocused = true;
      input['cursorPos'] = 3;
      input.handleKey(createKeyEvent('\u001b[D', 'left'));
      expect(input['cursorPos']).toBe(2);
    });

    it('should move cursor right with ArrowRight', () => {
      input = new Input({ value: 'Hello' });
      input.isFocused = true;
      input['cursorPos'] = 1;
      input.handleKey(createKeyEvent('\u001b[C', 'right'));
      expect(input['cursorPos']).toBe(2);
    });

    it('should not move cursor past start', () => {
      input = new Input({ value: 'Hi' });
      input.isFocused = true;
      input['cursorPos'] = 0;
      input.handleKey(createKeyEvent('\u001b[D', 'left'));
      expect(input['cursorPos']).toBe(0);
    });

    it('should not move cursor past end', () => {
      input = new Input({ value: 'Hi' });
      input.isFocused = true;
      input['cursorPos'] = 2;
      input.handleKey(createKeyEvent('\u001b[C', 'right'));
      expect(input['cursorPos']).toBe(2);
    });

    it('should insert character on regular key', () => {
      const onChange = vi.fn();
      input = new Input({ value: 'He', onChange });
      input.isFocused = true;
      input['cursorPos'] = 2;
      input.handleKey(createKeyEvent('l'));
      expect(input.getValue()).toBe('Hel');
    });

    it('should delete with Backspace', () => {
      input = new Input({ value: 'Hello' });
      input.isFocused = true;
      input['cursorPos'] = 3;
      input.handleKey(createKeyEvent('', 'backspace'));
      expect(input.getValue()).toBe('Helo');
    });

    it('should delete forward with Delete', () => {
      input = new Input({ value: 'Hello' });
      input.isFocused = true;
      input['cursorPos'] = 2;
      input.handleKey(createKeyEvent('\u001b[3~', 'delete'));
      expect(input.getValue()).toBe('Helo');
    });

    it('should submit on Enter', () => {
      const onSubmit = vi.fn();
      input = new Input({ onSubmit });
      input.isFocused = true;
      input.handleKey(createKeyEvent('\r', 'enter'));
      expect(onSubmit).toHaveBeenCalledWith('');
    });

    it('should cancel on Escape', () => {
      const onCancel = vi.fn();
      input = new Input({ onCancel });
      input.isFocused = true;
      input.handleKey(createKeyEvent('\u001b', 'escape'));
      expect(onCancel).toHaveBeenCalled();
    });

    it('should call onAutocompleteRequested on Tab', () => {
      const onAutocomplete = vi.fn();
      input = new Input({ onAutocompleteRequested: onAutocomplete });
      input.isFocused = true;
      input.handleKey(createKeyEvent('\t', 'tab'));
      expect(onAutocomplete).toHaveBeenCalled();
    });

    it('should move to line start with Home', () => {
      input = new Input({ value: 'Hello' });
      input.isFocused = true;
      input['cursorPos'] = 3;
      input.handleKey(createKeyEvent('\u001b[H', 'home'));
      expect(input['cursorPos']).toBe(0);
    });

    it('should move to line end with End', () => {
      input = new Input({ value: 'Hello' });
      input.isFocused = true;
      input['cursorPos'] = 1;
      input.handleKey(createKeyEvent('\u001b[F', 'end'));
      expect(input['cursorPos']).toBe(5);
    });
  });

  describe('history', () => {
    it('should add entries to history', () => {
      input.addToHistory('cmd1');
      input.addToHistory('cmd2');
      expect(input['history']).toHaveLength(2);
    });

    it('should not add duplicate consecutive entries', () => {
      input.addToHistory('cmd1');
      input.addToHistory('cmd1');
      expect(input['history']).toHaveLength(1);
    });

    it('should not add empty entries', () => {
      input.addToHistory('');
      expect(input['history']).toHaveLength(0);
    });

    it('should clear history', () => {
      input.addToHistory('cmd1');
      input.clearHistory();
      expect(input['history']).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle very long value', () => {
      const longString = 'a'.repeat(10000);
      input = new Input({ value: longString });
      input.isFocused = true;
      const result = input.draw(defaultContext);
      expect(result).toHaveLength(1);
    });

    it('should handle unicode characters', () => {
      input = new Input({ value: '😀😁😂' });
      input.isFocused = true;
      const result = input.draw(defaultContext);
      expect(result[0]).toContain('😀');
    });

    it('should handle cursor at boundaries', () => {
      input = new Input({ value: 'A' });
      expect(input['cursorPos']).toBe(0); // default
      input['cursorPos'] = 1;
      // at end
      expect(input['cursorPos']).toBe(1);
    });

    it('should handle multiple insertions', () => {
      input = new Input({});
      input.insertText('Hello');
      input.insertText(' ');
      input.insertText('World');
      expect(input.getValue()).toBe('Hello World');
    });
  });
});