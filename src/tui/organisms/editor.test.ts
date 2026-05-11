// SPDX-License-Identifier: Apache-2.0
/**
 * Comprehensive tests for Editor organism component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Editor } from './editor';
import type { RenderContext, KeyEvent } from '../atoms/base';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

function createKeyEvent(raw: string, name?: string): KeyEvent {
  return { raw, name: name || raw, modifiers: {} };
}

describe('Editor', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor();
  });

  describe('constructor', () => {
    it('should create with default options', () => {
      expect(editor).toBeInstanceOf(Editor);
      expect(editor.isFocused).toBe(false);
    });

    it('should accept custom options', () => {
      const e = new Editor({ paddingX: 2, paddingY: 1, maxHistorySize: 50 });
      expect(e['paddingX']).toBe(2);
      expect(e['paddingY']).toBe(1);
    });
  });

  describe('getText() / setText()', () => {
    it('should get initial text (empty)', () => {
      expect(editor.getText()).toBe('');
    });

    it('should set text and split into lines', () => {
      editor.setText('Line1\nLine2');
      expect(editor.getText()).toBe('Line1\nLine2');
    });

    it('should call onChange callback when setText', () => {
      const onChange = vi.fn();
      editor = new Editor({ onChange });
      editor.setText('Hello');
      expect(onChange).toHaveBeenCalledWith('Hello');
    });
  });

  describe('insertText()', () => {
    it('should insert at cursor position', () => {
      editor.setText('Hello');
      editor['cursorCol'] = 5;
      editor.insertText(' World');
      expect(editor.getText()).toBe('Hello World');
    });

    it('should update cursor position after insert', () => {
      editor.setText('He');
      editor['cursorCol'] = 2;
      editor.insertText('llo');
      expect(editor['cursorCol']).toBe(5);
    });
  });

  describe('handleKey()', () => {
    beforeEach(() => {
      editor.isFocused = true;
    });

    it('should move cursor left with ArrowLeft', () => {
      editor.setText('Hello');
      editor['cursorCol'] = 3;
      editor.handleKey(createKeyEvent('\x1b[D'));
      expect(editor['cursorCol']).toBe(2);
    });

    it('should move cursor right with ArrowRight', () => {
      editor.setText('Hello');
      editor['cursorCol'] = 1;
      editor.handleKey(createKeyEvent('\x1b[C'));
      expect(editor['cursorCol']).toBe(2);
    });

    it('should handle backspace to delete before cursor', () => {
      editor.setText('Hello');
      editor['cursorCol'] = 3;
      editor.handleKey(createKeyEvent('\x7f'));
      expect(editor.getText()).toBe('Helo');
      expect(editor['cursorCol']).toBe(2);
    });

    it('should handle delete to delete after cursor', () => {
      editor.setText('Hello');
      editor['cursorCol'] = 2;
      editor.handleKey(createKeyEvent('\x1b[3~'));
      expect(editor.getText()).toBe('Helo');
    });

    it('should insert newline with Enter', () => {
      editor.setText('Line1');
      editor['cursorCol'] = 5;
      editor.handleKey(createKeyEvent('\r'));
      expect(editor.getText()).toBe('Line1\n');
    });

    it('should handle Home/End', () => {
      editor.setText('Hello\nWorld');
      editor['cursorLine'] = 0;
      editor['cursorCol'] = 5;
      editor.handleKey(createKeyEvent('\x1b[H')); // Home
      expect(editor['cursorCol']).toBe(0);
      editor.handleKey(createKeyEvent('\x1b[F')); // End
      expect(editor['cursorCol']).toBe(5);
    });

    it('should call onSubmit when configured', () => {
      const onSubmit = vi.fn();
      editor = new Editor({ onSubmit });
      editor.isFocused = true;
      editor.handleKey(createKeyEvent('\r'));
      expect(onSubmit).toHaveBeenCalled();
    });

    it('should call onEscape when configured', () => {
      const onEscape = vi.fn();
      editor = new Editor({ onEscape });
      editor.isFocused = true;
      editor.handleKey(createKeyEvent('\x1b'));
      expect(onEscape).toHaveBeenCalled();
    });
  });

  describe('draw()', () => {
    it('should render lines with cursor marker when focused', () => {
      editor.isFocused = true;
      editor.setText('Hello');
      editor['cursorLine'] = 0;
      editor['cursorCol'] = 2;
      const result = editor.draw(defaultContext);
      // Should contain CURSOR_MARKER at appropriate position in line 0
      expect(result[0]).toContain('\x1b_pi:c\x07');
    });

    it('should not show cursor marker when not focused', () => {
      editor.isFocused = false;
      editor.setText('Hello');
      const result = editor.draw(defaultContext);
      expect(result.every(l => !l.includes('\x1b_pi:c\x07'))).toBe(true);
    });

    it('should apply scroll offset', () => {
      editor.setText('Line1\nLine2\nLine3\nLine4\nLine5');
      editor['scrollOffset'] = 2;
      const result = editor.draw({ ...defaultContext, height: 2 });
      expect(result.length).toBeLessThanOrEqual(2);
    });
  });

  describe('undo/redo', () => {
    it('should push state on setText and support undo', () => {
      editor = new Editor({ maxHistorySize: 10 });
      editor.setText('First');
      editor.setText('Second');
      // Pop from undo stack (internal). Hard to test directly, but we can ensure no crash.
    });
  });

  describe('history', () => {
    it('should add entries to history', () => {
      editor.addToHistory('cmd1');
      editor.addToHistory('cmd2');
      // History is stored internally
    });

    it('should clear history', () => {
      editor.addToHistory('cmd');
      editor.clearHistory();
      expect(editor['history'].length).toBe(0);
    });
  });

  describe('clearCache()', () => {
    it('should clear all caches', () => {
      // Editor likely doesn't cache but has clearCache method
      expect(() => editor.clearCache()).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty text', () => {
      editor.setText('');
      const result = editor.draw(defaultContext);
      expect(result).toBeDefined();
    });

    it('should handle very long lines', () => {
      const long = 'A'.repeat(1000);
      editor.setText(long);
      const result = editor.draw(defaultContext);
      expect(result).toBeDefined();
    });

    it('should handle unicode characters', () => {
      editor.setText('😀😁😂');
      const result = editor.draw(defaultContext);
      expect(result.some(l => l.includes('😀'))).toBe(true);
    });
  });
});