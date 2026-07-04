import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InputHandler } from './input-handler.js';

describe('InputHandler', () => {
  let handler: InputHandler;
  let onEnter: (line: string) => void;
  let onSlash: () => void;

  // Mock process.stdout.write
  const mockWrite = vi.fn();
  beforeEach(() => {
    vi.stubGlobal('process', {
      stdin: { setRawMode: vi.fn(), resume: vi.fn(), setEncoding: vi.fn(), on: vi.fn(), removeAllListeners: vi.fn() },
      stdout: { write: mockWrite },
      exit: vi.fn(),
    });
    onEnter = vi.fn();
    onSlash = vi.fn();
    handler = new InputHandler();
    handler.setCallbacks(onEnter, onSlash);
  });

  it('should accumulate printable characters', () => {
    handler.handleKey({ name: 'a' }, 'a');
    handler.handleKey({ name: 'b' }, 'b');
    handler.handleKey({ name: 'c' }, 'c');
    expect(mockWrite).toHaveBeenCalledWith('a');
    expect(mockWrite).toHaveBeenCalledWith('b');
    expect(mockWrite).toHaveBeenCalledWith('c');
  });

  it('should handle backspace', () => {
    handler.handleKey({ name: 'a' }, 'a');
    handler.handleKey({ name: 'a' }, 'a');
    handler.handleKey({ name: 'backspace' }, undefined);
    expect(mockWrite).toHaveBeenCalledWith('\b \b');
  });

  it('should call onEnter on return with trimmed non-empty line', () => {
    handler.handleKey({ name: 'a' }, 'a');
    handler.handleKey({ name: 'b' }, 'b');
    handler.handleKey({ name: 'return' }, undefined);
    expect(onEnter).toHaveBeenCalledWith('ab');
  });

  it('should not call onEnter if line is empty after trim', () => {
    handler.handleKey({ name: 'space' }, ' ');
    handler.handleKey({ name: 'return' }, undefined);
    expect(onEnter).not.toHaveBeenCalled();
  });

  it('should trigger onSlash when slash at start of line', () => {
    handler.handleKey({ name: '/' }, '/');
    expect(onSlash).toHaveBeenCalled();
  });

  it('should not trigger onSlash when slash not at start', () => {
    handler.handleKey({ name: 'a' }, 'a');
    handler.handleKey({ name: '/' }, '/');
    expect(onSlash).not.toHaveBeenCalled();
  });

  it('should exit on Ctrl+C', () => {
    handler.handleKey({ name: 'c' }, '\x03');
    expect((process.exit as any)).toHaveBeenCalledWith(0);
  });

  it('should clear line', () => {
    handler.handleKey({ name: 'a' }, 'a');
    handler.handleKey({ name: 'b' }, 'b');
    handler.clear();
    // internal state should be empty; subsequent return should not call onEnter
    handler.handleKey({ name: 'return' }, undefined);
    expect(onEnter).not.toHaveBeenCalled();
  });
});
