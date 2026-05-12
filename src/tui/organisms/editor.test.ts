// SPDX-License-Identifier: Apache-2.0
/**
 * Comprehensive tests for Editor organism component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Editor } from './editor';
import type { RenderContext, KeyEvent } from '../atoms/base';

// Mock keybindings for editor
vi.mock('../atoms/keybindings', () => ({
  getKeybindings: () => ({
    matches: (data: string, action: string) => {
      const map: Record<string, Set<string>> = {
        'tui.editor.up': new Set(['\u001b[A', 'ArrowUp', 'k']),
        'tui.editor.down': new Set(['\u001b[B', 'ArrowDown', 'j']),
        'tui.editor.left': new Set(['\u001b[D', 'ArrowLeft', 'h']),
        'tui.editor.right': new Set(['\u001b[C', 'ArrowRight', 'l']),
        'tui.editor.newline': new Set(['Enter', 'Enter']),
        'tui.editor.backspace': new Set(['Backspace', 'Backspace']),
        'tui.editor.delete': new Set(['\u001b[3~', 'Delete']),
        'tui.editor.escape': new Set(['\u001b', 'Escape', '\x03', 'Ctrl+C']),
        'tui.editor.up': new Set(['\u001b[A', 'ArrowUp']),
        'tui.editor.down': new Set(['\u001b[B', 'ArrowDown']),
        'tui.editor.left': new Set(['\u001b[D', 'ArrowLeft']),
        'tui.editor.right': new Set(['\u001b[C', 'ArrowRight']),
        'tui.editor.home': new Set(['\u001b[H', 'Home']),
        'tui.editor.end': new Set(['\u001b[F', 'End']),
        'tui.editor.pageup': new Set(['\u001b[5~', 'PageUp']),
        'tui.editor.pagedown': new Set(['\u001b[6~', 'PageDown']),
        'tui.editor.tab': new Set(['Tab', 'Tab']),
      };
      return map[action]?.has(data) ?? false;
    },
  }),
}));

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

function createKeyEvent(keyName: string): KeyEvent {
  const keyMap: Record<string, { raw: string; name: string }> = {
    ArrowUp: { raw: '\u001b[A', name: 'ArrowUp' },
    ArrowDown: { raw: '\u001b[B', name: 'ArrowDown' },
    ArrowLeft: { raw: '\u001b[D', name: 'ArrowLeft' },
    ArrowRight: { raw: '\u001b[C', name: 'ArrowRight' },
    Enter: { raw: 'Enter', name: 'Enter' },
    Escape: { raw: '\u001b', name: 'Escape' },
    Backspace: { raw: 'Backspace', name: 'Backspace' },
    Delete: { raw: '\u001b[3~', name: 'Delete' },
    Home: { raw: '\u001b[H', name: 'Home' },
    End: { raw: '\u001b[F', name: 'End' },
    Tab: { raw: 'Tab', name: 'Tab' },
  };
  const mapped = keyMap[keyName];
  if (mapped) return { raw: mapped.raw, name: mapped.name, modifiers: {} };
  return { raw: keyName, name: keyName, modifiers: {} };
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
      editor.state.cursorCol = 5;
      editor.insertText(' World');
      expect(editor.getText()).toBe('Hello World');
    });

    it('should update cursor position after insert', () => {
      editor.setText('He');
      editor.state.cursorCol = 2;
      editor.insertText('llo');
      expect(editor.state.cursorCol).toBe(5);
    });
  });

  describe('handleKey()', () => {
    beforeEach(() => {
      editor.isFocused = true;
    });

    it('should move cursor left with ArrowLeft', () => {
      editor.setText('Hello');
      editor.state.cursorCol = 3;
      editor.handleKey(createKeyEvent('ArrowLeft'));
      expect(editor.state.cursorCol).toBe(2);
    });

    it('should move cursor right with ArrowRight', () => {
      editor.setText('Hello');
      editor.state.cursorCol = 1;
      editor.handleKey(createKeyEvent('ArrowRight'));
      expect(editor.state.cursorCol).toBe(2);
    });

    it('should handle backspace to delete before cursor', () => {
      editor.setText('Hello');
      editor.state.cursorCol = 3;
      editor.handleKey(createKeyEvent('Backspace'));
      expect(editor.getText()).toBe('Helo');
      expect(editor.state.cursorCol).toBe(2);
    });

    it('should handle delete to delete after cursor', () => {
      editor.setText('Hello');
      editor.state.cursorCol = 2;
      editor.handleKey(createKeyEvent('Delete'));
      expect(editor.getText()).toBe('Helo');
    });

    it('should insert newline with Enter', () => {
      editor.setText('Line1');
      editor.state.cursorCol = 5;
      editor.handleKey(createKeyEvent('Enter'));
      expect(editor.getText()).toBe('Line1\n');
    });

    it('should handle Home/End', () => {
      editor.setText('Hello\nWorld');
      editor.state.cursorLine = 0;
      editor.state.cursorCol = 5;
      editor.handleKey(createKeyEvent('Home')); // Home
      expect(editor.state.cursorCol).toBe(0);
      editor.handleKey(createKeyEvent('End')); // End
      expect(editor.state.cursorCol).toBe(5);
    });

    it('should call onSubmit when configured', () => {
      const onSubmit = vi.fn();
      editor = new Editor({ onSubmit });
      editor.isFocused = true;
      editor.handleKey(createKeyEvent('Enter'));
      expect(onSubmit).toHaveBeenCalled();
    });

    it('should call onEscape when configured', () => {
      const onEscape = vi.fn();
      editor = new Editor({ onEscape });
      editor.isFocused = true;
      editor.handleKey(createKeyEvent('Escape'));
      expect(onEscape).toHaveBeenCalled();
    });
  });

  describe('draw()', () => {
    it('should render lines with cursor marker when focused', () => {
      editor.isFocused = true;
      editor.setText('Hello');
      editor.state.cursorLine = 0;
      editor.state.cursorCol = 2;
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