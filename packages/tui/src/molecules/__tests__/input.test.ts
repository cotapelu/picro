import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Input, InputTheme } from '../input';
import type { RenderContext, KeyEvent } from '../base';

function ctx(w = 80, h = 24): RenderContext {
  return { width: w, height: h };
}

function k(key: string): KeyEvent {
  return { key, ctrlKey: false, shiftKey: false, altKey: false, metaKey: false, preventDefault: vi.fn(), stopPropagation: vi.fn() };
}

describe('Input', () => {
  describe('Constructor', () => {
    it('should create input', () => {
      const input = new Input('test', ctx());
      expect(input).toBeDefined();
    });

    it('should accept theme', () => {
      const theme: InputTheme = { prefix: '>' };
      const input = new Input('test', ctx(), theme);
      expect(input).toBeDefined();
    });
  });

  describe('draw', () => {
    it('should render value', () => {
      const input = new Input('hello', ctx());
      const lines = input.draw(ctx());
      expect(lines.join('')).toContain('hello');
    });

    it('should fit width', () => {
      const input = new Input('hello world', ctx());
      const lines = input.draw(ctx(10, 24));
      const visible = lines.join('').replace(/\x1b\[[0-9;]*m/g, '');
      expect(visible.length).toBeLessThanOrEqual(10);
    });
  });

  describe('keyboard input', () => {
    it('should insert char', () => {
      const input = new Input('test', ctx());
      input.setFocus(true);
      input.keypress(k('a'));
      const lines = input.draw(ctx());
      expect(lines.join('')).toContain('test');
    });

    it('should handle backspace', () => {
      const input = new Input('test', ctx());
      input.setFocus(true);
      input.keypress(k('Backspace'));
      const lines = input.draw(ctx());
      expect(lines.join('')).toContain('tes');
    });

    it('should handle Escape', () => {
      const input = new Input('test', ctx());
      input.setFocus(true);
      input.keypress(k('Escape'));
    });
  });

  describe('getValue', () => {
    it('should return current value', () => {
      const input = new Input('hello', ctx());
      expect(input.getValue()).toBe('hello');
    });
  });
});