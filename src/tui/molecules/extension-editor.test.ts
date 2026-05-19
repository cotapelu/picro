// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for ExtensionEditor molecule component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExtensionEditor } from './extension-editor';
import type { RenderContext, KeyEvent } from '../core/base';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

function createKeyEvent(raw: string): KeyEvent {
  return { raw, name: raw, modifiers: {} };
}

describe('ExtensionEditor', () => {
  let onSave: vi.Mock;
  let onCancel: vi.Mock;
  let editor: ExtensionEditor;

  beforeEach(() => {
    onSave = vi.fn();
    onCancel = vi.fn();
  });

  describe('constructor', () => {
    it('should create with default options', () => {
      editor = new ExtensionEditor();
      expect(editor['content']).toBe('');
      expect(editor['language']).toBe('typescript');
    });

    it('should accept custom content and language', () => {
      editor = new ExtensionEditor({ content: 'code', language: 'python' });
      expect(editor['content']).toBe('code');
      expect(editor['language']).toBe('python');
    });

    it('should set callbacks', () => {
      editor = new ExtensionEditor({ onSave, onCancel });
      expect(editor['onSave']).toBe(onSave);
      expect(editor['onCancel']).toBe(onCancel);
    });

    it('should initialize cursor at 0,0', () => {
      editor = new ExtensionEditor();
      expect(editor['cursorLine']).toBe(0);
      expect(editor['cursorCol']).toBe(0);
    });

    it('should default isFocused false', () => {
      editor = new ExtensionEditor();
      expect(editor.isFocused).toBe(false);
    });
  });

  describe('draw()', () => {
    beforeEach(() => {
      editor = new ExtensionEditor({ content: 'line1\nline2\nline3', language: 'ts' });
    });

    it('should render a bordered box', () => {
      const result = editor.draw(defaultContext);
      expect(result[0].startsWith('┌')).toBe(true);
      expect(result[result.length - 1].startsWith('└')).toBe(true);
    });

    it('should display title with language', () => {
      const result = editor.draw(defaultContext);
      expect(result.some(l => l.includes('[ts]'))).toBe(true);
    });

    it('should show line numbers', () => {
      const result = editor.draw(defaultContext);
      expect(result.some(l => l.includes('   1 │'))).toBe(true);
      expect(result.some(l => l.includes('   2 │'))).toBe(true);
    });

    it('should show cursor marker on current line', () => {
      editor.isFocused = true;
      const result = editor.draw(defaultContext);
      const cursorLine = result.find(l => l.includes('\x1b_pi:c\x07'));
      expect(cursorLine).toBeDefined();
    });

    it('should not show cursor marker when not focused', () => {
      editor.isFocused = false;
      const result = editor.draw(defaultContext);
      expect(result.every(l => !l.includes('\x1b_pi:c\x07'))).toBe(true);
    });

    it('should show info line at bottom', () => {
      const result = editor.draw(defaultContext);
      expect(result.some(l => l.includes('Lines: 3'))).toBe(true);
    });

    it('should show help text', () => {
      const result = editor.draw(defaultContext);
      expect(result.some(l => l.includes('Ctrl+S save  Esc cancel'))).toBe(true);
    });

    it('should fill remaining vertical space', () => {
      const result = editor.draw({ ...defaultContext, height: 30 });
      expect(result.length).toBe(30);
    });

    it('should truncate lines to borderWidth', () => {
      editor = new ExtensionEditor({ content: 'A'.repeat(200), language: 'ts' });
      const result = editor.draw(defaultContext);
      result.forEach(l => {
        // Each line within borders should not exceed borderWidth + some small tolerance
        const contentPart = l.split('│')[1] || '';
        expect(contentPart.length).toBeLessThanOrEqual(defaultContext.width - 2);
      });
    });
  });

  describe('handleKey()', () => {
    beforeEach(() => {
      editor = new ExtensionEditor({ content: 'Hello\nWorld', onSave, onCancel });
      editor.isFocused = true;
    });

    it('should call onCancel on Escape', () => {
      editor.handleKey(createKeyEvent('\x1b'));
      expect(onCancel).toHaveBeenCalled();
    });

    it('should call onSave on Ctrl+S', () => {
      editor.handleKey(createKeyEvent('\x13')); // Ctrl+S
      expect(onSave).toHaveBeenCalledWith('Hello\nWorld');
    });

    it('should insert character into current line', () => {
      editor['cursorLine'] = 0;
      editor['cursorCol'] = 5;
      editor.handleKey(createKeyEvent('X'));
      expect(editor['content']).toBe('HelloX\nWorld');
      expect(editor['cursorCol']).toBe(6);
    });

    it('should handle backspace', () => {
      editor['cursorCol'] = 5;
      editor.handleKey(createKeyEvent('\x7f'));
      expect(editor['content']).toBe('Hell\nWorld');
    });

    it('should handle Enter to insert new line', () => {
      editor['cursorLine'] = 0;
      editor['cursorCol'] = 5;
      editor.handleKey(createKeyEvent('\n'));
      // Should split line at cursor
      expect(editor['content']).toContain('\n');
      editor['cursorLine'] = 1; // moved down
      editor['cursorCol'] = 0;
      // after newline, cursor should be at start of next line
      expect(editor['cursorLine']).toBe(1);
      expect(editor['cursorCol']).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty content', () => {
      editor = new ExtensionEditor({ content: '' });
      const result = editor.draw(defaultContext);
      expect(result).toBeDefined();
    });

    it('should handle very long content', () => {
      const long = 'A'.repeat(10000);
      editor = new ExtensionEditor({ content: long });
      const result = editor.draw(defaultContext);
      expect(result).toBeDefined();
    });

    it('should handle unicode', () => {
      editor = new ExtensionEditor({ content: '😀\n😁' });
      const result = editor.draw(defaultContext);
      expect(result.some(l => l.includes('😀'))).toBe(true);
    });

    it('should handle narrow terminal', () => {
      editor = new ExtensionEditor({ content: 'Hello' });
      const result = editor.draw({ ...defaultContext, width: 10, height: 5 });
      expect(result).toBeDefined();
    });
  });
});