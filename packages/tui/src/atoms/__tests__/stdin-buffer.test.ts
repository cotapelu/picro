import { describe, it, expect } from 'vitest';
import { StdinBuffer, isCompleteSequence, ESC, BRACKETED_PASTE_START, BRACKETED_PASTE_END } from '../stdin-buffer.js';

describe('StdinBuffer', () => {
  it('should recognize bracketed paste start', () => {
    expect(isCompleteSequence(BRACKETED_PASTE_START)).toBe('complete');
  });

  it('should recognize simple escape', () => {
    expect(isCompleteSequence('\x1b')).toBe('incomplete');
    expect(isCompleteSequence('\x1b[A')).toBe('complete');
  });

  it('should process single character', () => {
    const buffer = new StdinBuffer();
    const events: string[] = [];
    buffer.on('data', (seq: string) => events.push(seq));

    buffer.process('a');
    expect(events).toContain('a');
  });

  it('should accumulate incomplete sequences', () => {
    const buffer = new StdinBuffer();
    const events: string[] = [];
    buffer.on('data', (seq: string) => events.push(seq));

    buffer.process('\x1b');
    expect(events.length).toBe(0); // incomplete
    buffer.process('[A');
    expect(events).toContain('\x1b[A');
  });
});
