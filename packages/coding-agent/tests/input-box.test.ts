import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InputBox } from '../src/input-box.ts';
import type { RenderContext } from '@picro/tui';

// Mock theme
const mockTheme = {
  accent: '\x1b[36m',
  reset: '\x1b[0m',
};

describe('InputBox', () => {
  let onEnter: vi.Mock;
  let onCancel: vi.Mock;
  let input: InputBox;

  beforeEach(() => {
    onEnter = vi.fn();
    onCancel = vi.fn();
    input = new InputBox('> ', onEnter, onCancel, mockTheme);
  });

  it('should render prompt and value', () => {
    const lines = input.draw({ width: 80, height: 10 } as RenderContext);
    expect(lines[0]).toContain('> ');
  });

  it('should update value on character input', () => {
    input.handleKey?.({ name: 'KeyA', raw: 'a', modifiers: undefined } as any);
    expect(input['value']).toBe('a');
  });

  it('should handle backspace', () => {
    input['value'] = 'abc';
    input['cursorPos'] = 3;
    input.handleKey?.({ name: 'Backspace', raw: '\x7f', modifiers: undefined } as any);
    expect(input['value']).toBe('ab');
  });

  it('should move cursor left', () => {
    input['value'] = 'abc';
    input['cursorPos'] = 3;
    input.handleKey?.({ name: 'ArrowLeft', raw: '\x1b[D', modifiers: undefined } as any);
    expect(input['cursorPos']).toBe(2);
  });

  it('should move cursor right', () => {
    input['value'] = 'abc';
    input['cursorPos'] = 0;
    input.handleKey?.({ name: 'ArrowRight', raw: '\x1b[C', modifiers: undefined } as any);
    expect(input['cursorPos']).toBe(1);
  });

  it('should call onEnter on Enter key', () => {
    input['value'] = 'test';
    input.handleKey?.({ name: 'Enter', raw: '\r', modifiers: undefined } as any);
    expect(onEnter).toHaveBeenCalledWith('test');
  });

  it('should call onCancel on Ctrl+C', () => {
    input.handleKey?.({ name: 'c', raw: '\x03', modifiers: { ctrl: true } } as any);
    expect(onCancel).toHaveBeenCalled();
  });

  it('should insert at cursor position', () => {
    input['value'] = 'ac';
    input['cursorPos'] = 1;
    input.handleKey?.({ name: 'KeyB', raw: 'b', modifiers: undefined } as any);
    expect(input['value']).toBe('abc');
    expect(input['cursorPos']).toBe(2);
  });

  it('should handle Home and End', () => {
    input['value'] = 'abc';
    input['cursorPos'] = 1;
    input.handleKey?.({ name: 'End', raw: '\x1b[F', modifiers: undefined } as any);
    expect(input['cursorPos']).toBe(3);
    input.handleKey?.({ name: 'Home', raw: '\x1b[H', modifiers: undefined } as any);
    expect(input['cursorPos']).toBe(0);
  });
});
