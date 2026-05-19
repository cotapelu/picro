// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for stdin-buffer atom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StdinBuffer, isCompleteSequence, isCompleteCsiSequence, ESC, BRACKETED_PASTE_START, BRACKETED_PASTE_END } from './stdin-buffer';

describe('stdin-buffer', () => {
  describe('isCompleteSequence()', () => {
    it('should return not-escape for non-escape', () => {
      expect(isCompleteSequence('a')).toBe('not-escape');
    });

    it('should return incomplete for single ESC', () => {
      expect(isCompleteSequence(ESC)).toBe('incomplete');
    });

    it('should handle simple ESC + char', () => {
      expect(isCompleteSequence(ESC + 'a')).toBe('complete');
    });

    it('should handle CSI sequences', () => {
      expect(isCompleteSequence('\x1b[A')).toBe('complete'); // Arrow up
      expect(isCompleteSequence('\x1b[')).toBe('incomplete');
    });

    it('should handle bracketed paste start', () => {
      expect(isCompleteSequence(BRACKETED_PASTE_START)).toBe('complete');
    });
  });

  describe('StdinBuffer class', () => {
    let buffer: StdinBuffer;
    let onData: vi.Mock;
    let onPaste: vi.Mock;

    beforeEach(() => {
      onData = vi.fn();
      onPaste = vi.fn();
      buffer = new StdinBuffer({ timeout: 10, pasteThreshold: 10 });
      buffer.on('data', onData);
      buffer.on('paste', onPaste);
    });

    afterEach(() => {
      buffer.destroy?.();
    });

    it('should process complete escape sequences immediately', () => {
      buffer.process('\x1b[A');
      expect(onData).toHaveBeenCalledWith('\x1b[A');
    });

    it('should buffer incomplete sequences until more data arrives', () => {
      buffer.process('\x1b[');
      expect(onData).not.toHaveBeenCalled();
      buffer.process('A');
      expect(onData).toHaveBeenCalledWith('\x1b[A');
    });

    it('should detect bracketed paste', () => {
      buffer.process(BRACKETED_PASTE_START);
      buffer.process('hello');
      buffer.process(BRACKETED_PASTE_END);
      expect(onPaste).toHaveBeenCalledWith('hello');
    });

    it('should flush buffer on timeout', async () => {
      vi.useFakeTimers();
      buffer.process('abc');
      // Fast-forward time
      vi.advanceTimersByTime(20);
      expect(onData).toHaveBeenCalledWith('abc');
      vi.useRealTimers();
    });

    it('should clear buffer on destroy', () => {
      buffer.process('abc');
      (buffer as any).destroy();
      // After destroy, further processing should not emit
      buffer.process('xyz');
      expect(onData).toHaveBeenCalledTimes(1); // only flush once before destroy
    });
  });
});