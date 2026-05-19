// SPDX-License-Identifier: Apache-2.0
/**
 * Comprehensive tests for BorderedLoader molecule component
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BorderedLoader } from './loader';
import type { RenderContext, KeyEvent } from '../core/base';

// Mock TUI
const createMockTUI = () => ({
  requestRender: vi.fn(),
});

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

function createKeyEvent(keyName: string): KeyEvent {
  const keyMap: Record<string, { raw: string; name: string }> = {
    Escape: { raw: '\u001b', name: 'escape' },
    Enter: { raw: '\r', name: 'enter' },
    Backspace: { raw: '\x7f', name: 'backspace' },
    Delete: { raw: '\u001b[3~', name: 'delete' },
    Tab: { raw: '\t', name: 'tab' },
    ArrowUp: { raw: '\u001b[A', name: 'up' },
    ArrowDown: { raw: '\u001b[B', name: 'down' },
    ArrowLeft: { raw: '\u001b[D', name: 'left' },
    ArrowRight: { raw: '\u001b[C', name: 'right' },
    Home: { raw: '\u001b[H', name: 'home' },
    End: { raw: '\u001b[F', name: 'end' },
  };
  const mapped = keyMap[keyName];
  if (mapped) return { raw: mapped.raw, name: mapped.name };
  return { raw: keyName, name: keyName };
}

describe('BorderedLoader', () => {
  let loader: BorderedLoader;
  let mockTUI: any;

  beforeEach(() => {
    mockTUI = createMockTUI();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should create with tui, theme, message, onAbort', () => {
      const onAbort = vi.fn();
      loader = new BorderedLoader(mockTUI, {}, 'Loading...', onAbort);
      expect(loader).toBeDefined();
      expect(loader['message']).toBe('Loading...');
      expect(loader['onAbort']).toBe(onAbort);
    });

    it('should start spinner interval on construction', () => {
      loader = new BorderedLoader(mockTUI, {}, 'Loading...');
      expect(loader['spinnerInterval']).toBeDefined();
    });

    it('should create abort signal', () => {
      loader = new BorderedLoader(mockTUI, {}, 'Loading...');
      expect(loader.signal).toBeDefined();
      expect(loader.signal.aborted).toBe(false);
    });

    it('should default onAbort to undefined', () => {
      loader = new BorderedLoader(mockTUI, {});
      expect(loader['onAbort']).toBeUndefined();
    });
  });

  describe('width_ & height_', () => {
    it('should return calculated dimensions', () => {
      loader = new BorderedLoader(mockTUI, {});
      expect(loader.width_).toBeLessThan(80);
      expect(loader.height_).toBe(5);
    });
  });

  describe('setMessage()', () => {
    it('should update message and request render', () => {
      loader = new BorderedLoader(mockTUI, {}, 'Initial');
      loader.setMessage('Updated');
      expect(loader['message']).toBe('Updated');
      expect(mockTUI.requestRender).toHaveBeenCalled();
    });
  });

  describe('draw()', () => {
    beforeEach(() => {
      loader = new BorderedLoader(mockTUI, {}, 'Loading...');
    });

    it('should return 5 lines (bordered box)', () => {
      const result = loader.draw(defaultContext);
      expect(result).toHaveLength(5);
    });

    it('should render top border', () => {
      const result = loader.draw(defaultContext);
      expect(result[0].startsWith('┌')).toBe(true);
      expect(result[0].endsWith('┐')).toBe(true);
    });

    it('should render bottom border', () => {
      const result = loader.draw(defaultContext);
      expect(result[4].startsWith('└')).toBe(true);
      expect(result[4].endsWith('┘')).toBe(true);
    });

    it('should render spinner frame on second line', () => {
      const result = loader.draw(defaultContext);
      const spinnerLine = result[1];
      // Should contain one of spinner frames
      const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
      expect(frames.some(f => spinnerLine.includes(f))).toBe(true);
      expect(spinnerLine).toContain('Loading...');
    });

    it('should show cancel hint on fourth line', () => {
      const result = loader.draw(defaultContext);
      expect(result[3]).toContain('Press Esc to cancel');
    });

    it('should apply cursor marker when focused', () => {
      loader.isFocused = true;
      const result = loader.draw(defaultContext);
      expect(result[1]).toContain('\x1b_pi:c\x07');
    });

    it('should not apply cursor marker when not focused', () => {
      loader.isFocused = false;
      const result = loader.draw(defaultContext);
      expect(result[1]).not.toContain('\x1b_pi:c\x07');
    });

    it('should adjust width based on context', () => {
      const narrowCtx = { ...defaultContext, width: 40 };
      const result = loader.draw(narrowCtx);
      // The inner width is context.width - 4
      expect(loader['width']).toBe(36);
      result.forEach(line => {
        expect(line.length).toBeLessThanOrEqual(40);
      });
    });

    it('should animate spinner on successive draws', () => {
      const initial = loader.draw(defaultContext)[1];
      vi.advanceTimersByTime(80);
      const next = loader.draw(defaultContext)[1];
      // Spinner frame should change
      expect(initial).not.toBe(next);
    });
  });

  describe('handleKey()', () => {
    beforeEach(() => {
      loader = new BorderedLoader(mockTUI, {}, 'Loading...', vi.fn());
    });

    it('should call onAbort on Escape', () => {
      const onAbort = vi.fn();
      loader = new BorderedLoader(mockTUI, {}, 'Loading...', onAbort);
      loader.handleKey(createKeyEvent('Escape'));
      expect(onAbort).toHaveBeenCalled();
    });

    it('should call onAbort on Ctrl+C', () => {
      const onAbort = vi.fn();
      loader = new BorderedLoader(mockTUI, {}, 'Loading...', onAbort);
      loader.handleKey(createKeyEvent('\x03'));
      expect(onAbort).toHaveBeenCalled();
    });

    it('should clear spinner interval on abort', () => {
      const clearInterval = vi.spyOn(globalThis, 'clearInterval');
      loader.handleKey(createKeyEvent('Escape'));
      expect(clearInterval).toHaveBeenCalledWith(loader['spinnerInterval']);
    });

    it('should not clear interval multiple times', () => {
      const clearInterval = vi.spyOn(globalThis, 'clearInterval');
      loader.handleKey(createKeyEvent('Escape'));
      loader.handleKey(createKeyEvent('Escape')); // second call
      expect(clearInterval).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearCache()', () => {
    it('should be no-op (stateless)', () => {
      loader = new BorderedLoader(mockTUI, {});
      expect(() => loader.clearCache()).not.toThrow();
    });
  });

  describe('dispose()', () => {
    it('should clear spinner interval', () => {
      const clearInterval = vi.spyOn(globalThis, 'clearInterval');
      loader = new BorderedLoader(mockTUI, {});
      loader.dispose();
      expect(clearInterval).toHaveBeenCalledWith(loader['spinnerInterval']);
    });

    it('should be safe to call multiple times', () => {
      const clearInterval = vi.spyOn(globalThis, 'clearInterval');
      loader = new BorderedLoader(mockTUI, {});
      loader.dispose();
      loader.dispose();
      expect(clearInterval).toHaveBeenCalledTimes(2);
    });
  });

  describe('edge cases', () => {
    it('should handle very narrow width', () => {
      loader = new BorderedLoader(mockTUI, {});
      const narrowCtx = { ...defaultContext, width: 10 };
      const result = loader.draw(narrowCtx);
      expect(result).toBeDefined();
      expect(result.length).toBe(5);
    });

    it('should handle very wide width', () => {
      loader = new BorderedLoader(mockTUI, {});
      const wideCtx = { ...defaultContext, width: 200 };
      const result = loader.draw(wideCtx);
      expect(result).toBeDefined();
    });

    it('should handle very long message', () => {
      loader = new BorderedLoader(mockTUI, {}, 'A'.repeat(1000));
      const result = loader.draw(defaultContext);
      expect(result).toBeDefined();
    });

    it('should handle unicode in message', () => {
      loader = new BorderedLoader(mockTUI, {}, 'Loading 😀...');
      const result = loader.draw(defaultContext);
      expect(result[1]).toContain('😀');
    });
  });
});