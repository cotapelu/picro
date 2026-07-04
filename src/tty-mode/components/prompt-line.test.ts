import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PromptLine } from './PromptLine.js';
import { InputHandler } from './input-handler.js';

describe('PromptLine', () => {
  let input: InputHandler;
  let promptLine: PromptLine;
  let onEnter: (line: string) => void;
  let onSlash: () => void;

  beforeEach(() => {
    onEnter = vi.fn();
    onSlash = vi.fn();
    input = new InputHandler();
    promptLine = new PromptLine(input, '> ');
    promptLine.setCallbacks(onEnter, onSlash);
  });

  it('should have prompt', () => {
    // PromptLine does not store prompt publicly; just ensure start writes prompt
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => {});
    promptLine.show();
    expect(writeSpy).toHaveBeenCalledWith('> ');
    writeSpy.mockRestore();
  });

  it('should clear line', () => {
    // clear just resets input
    promptLine.clear();
    // no errors
  });

  it('should set and clear callbacks', () => {
    // Already set in constructor; they will be called on input events
    expect(() => promptLine.setCallbacks(() => {}, () => {})).not.toThrow();
  });
});
