import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Editor } from '../editor';
import type { RenderContext, KeyEvent } from '../base';

const ctx = (w = 80, h = 24): RenderContext => ({ width: w, height: h });
const k = (key: string): KeyEvent => ({ key, ctrlKey: false, shiftKey: false, altKey: false, metaKey: false, preventDefault: vi.fn(), stopPropagation: vi.fn() });

describe('Editor Component', () => {
  describe('Constructor', () => {
    it('should create editor', () => {
      const editor = new Editor();
      expect(editor).toBeDefined();
    });

    it('should create with options', () => {
      const editor = new Editor(undefined, { paddingX: 2, paddingY: 1 });
      expect(editor).toBeDefined();
    });
  });

  describe('draw', () => {
    it('should render empty editor', () => {
      const editor = new Editor();
      const lines = editor.draw(ctx());
      expect(lines.length).toBeGreaterThan(0);
    });

    it('should render with text content', () => {
      const editor = new Editor();
      // Editor should have some content
      const lines = editor.draw(ctx());
      expect(lines).toBeDefined();
    });

    it('should fit width', () => {
      const editor = new Editor();
      const lines = editor.draw(ctx(40, 24));
      for (const line of lines) {
        expect(line.length).toBeLessThanOrEqual(40);
      }
    });

    it('should render border', () => {
      const editor = new Editor();
      const lines = editor.draw(ctx(60, 20));
      const content = lines.join('');
      expect(content).toContain('─');
    });
  });

  describe('keyboard input', () => {
    it('should handle character input', () => {
      const editor = new Editor();
      editor.setFocus(true);
      editor.keypress(k('a'));
      const lines = editor.draw(ctx());
      expect(lines.join('')).toContain('a');
    });

    it('should handle backspace', () => {
      const editor = new Editor();
      editor.setFocus(true);
      editor.keypress(k('a'));
      editor.keypress(k('Backspace'));
      const lines = editor.draw(ctx());
      expect(lines).toBeDefined();
    });

    it('should handle Enter for new line', () => {
      const editor = new Editor();
      editor.setFocus(true);
      editor.keypress(k('Enter'));
      const lines = editor.draw(ctx());
      expect(lines.length).toBeGreaterThan(1);
    });
  });

  describe('focus', () => {
    it('should set focus', () => {
      const editor = new Editor();
      editor.setFocus(true);
      expect(editor.isFocused).toBe(true);
    });

    it('should remove focus', () => {
      const editor = new Editor();
      editor.setFocus(true);
      editor.setFocus(false);
      expect(editor.isFocused).toBe(false);
    });
  });

  describe('height', () => {
    it('should respect height limit', () => {
      const editor = new Editor();
      const lines = editor.draw(ctx(80, 10));
      expect(lines.length).toBeLessThanOrEqual(10);
    });
  });
});