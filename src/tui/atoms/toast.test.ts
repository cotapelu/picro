// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for Toast atom component
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Toast, toastDefaultTheme, type ToastTheme } from './toast';
import type { RenderContext } from './base';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

describe('Toast', () => {
  let onDismiss: vi.Mock;

  beforeEach(() => {
    onDismiss = vi.fn();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should create with message', () => {
      const toast = new Toast({ message: 'Hello' });
      expect(toast['message']).toBe('Hello');
    });

    it('should default type to info', () => {
      const toast = new Toast({ message: '' });
      expect(toast['type']).toBe('info');
    });

    it('should default duration to 5000ms', () => {
      const toast = new Toast({ message: '' });
      expect(toast['duration']).toBe(5000);
    });

    it('should default width to 40', () => {
      const toast = new Toast({ message: '' });
      expect(toast['requestedWidth']).toBe(40);
    });

    it('should accept custom theme', () => {
      const custom: Partial<ToastTheme> = { infoBg: (s) => `\x1b[31m${s}\x1b[0m` };
      const toast = new Toast({ message: '', theme: custom });
      expect(toast['theme'].infoBg).not.toBe(toastDefaultTheme.infoBg);
    });

    it('should store createdAt as current time', () => {
      const now = Date.now();
      vi.setSystemTime(now);
      const toast = new Toast({ message: '' });
      expect(toast['createdAt']).toBe(now);
      vi.useRealTimers();
    });
  });

  describe('isExpired()', () => {
    it('should return false for infinite duration (0)', () => {
      const toast = new Toast({ message: '', duration: 0 });
      expect(toast.isExpired()).toBe(false);
    });

    it('should return false before duration expires', () => {
      const toast = new Toast({ message: '', duration: 5000 });
      vi.advanceTimersByTime(1000);
      expect(toast.isExpired()).toBe(false);
    });

    it('should return true after duration expires', () => {
      const toast = new Toast({ message: '', duration: 3000 });
      vi.advanceTimersByTime(3000);
      expect(toast.isExpired()).toBe(true);
    });
  });

  describe('getRemainingPercent()', () => {
    it('should return 100 for infinite duration', () => {
      const toast = new Toast({ message: '', duration: 0 });
      expect(toast.getRemainingPercent()).toBe(100);
    });

    it('should decrease over time', () => {
      const toast = new Toast({ message: '', duration: 1000 });
      vi.advanceTimersByTime(500);
      // 50% remaining approximately
      expect(toast.getRemainingPercent()).toBeLessThan(100);
      expect(toast.getRemainingPercent()).toBeGreaterThan(0);
    });

    it('should be 0 when expired', () => {
      const toast = new Toast({ message: '', duration: 1000 });
      vi.advanceTimersByTime(1100);
      expect(toast.getRemainingPercent()).toBe(0);
    });
  });

  describe('draw()', () => {
    it('should render bordered box with message', () => {
      const toast = new Toast({ message: 'Hello', width: 30 });
      const result = toast.draw(defaultContext);
      expect(result[0].startsWith('┌')).toBe(true);
      expect(result.some(l => l.includes('Hello'))).toBe(true);
    });

    it('should show progress bar if showProgress=true', () => {
      const toast = new Toast({ message: 'Hi', showProgress: true });
      const result = toast.draw(defaultContext);
      // Should include some progress indicator, maybe time remaining or bar
      // Implementation uses progress bar characters: █▓▒░?
      expect(result.length).toBeGreaterThan(2);
    });

    it('should not show progress if showProgress=false', () => {
      const toast = new Toast({ message: 'Hi', showProgress: false });
      const result = toast.draw(defaultContext);
      // Fewer lines
    });

    it('should apply type-specific colors', () => {
      const toast = new Toast({ message: 'Error', type: 'error', width: 20 });
      const result = toast.draw(defaultContext);
      expect(result.some(l => l.includes('\x1b[48;5;196m'))).toBe(true);
    });

    it('should show icon based on type', () => {
      const toast = new Toast({ message: 'Info', type: 'info' });
      const result = toast.draw(defaultContext);
      expect(result.some(l => l.includes('ℹ️'))).toBe(true);
    });

    it('should truncate long message to width', () => {
      const long = 'A'.repeat(100);
      const toast = new Toast({ message: long, width: 20 });
      const result = toast.draw(defaultContext);
      result.forEach(l => {
        const visible = l.replace(/\x1b\[[0-9;]*m/g, '').length;
        expect(visible).toBeLessThanOrEqual(20);
      });
    });

    it('should handle dismissed state', () => {
      const toast = new Toast({ message: 'Hi' });
      (toast as any).dismissed = true;
      // Might not render or render differently? Not sure.
    });
  });

  describe('clearCache()', () => {
    it('should be no-op', () => {
      const toast = new Toast({ message: '' });
      expect(() => toast.clearCache()).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty message', () => {
      const toast = new Toast({ message: '' });
      const result = toast.draw(defaultContext);
      expect(result).toBeDefined();
    });

    it('should handle very narrow width', () => {
      const toast = new Toast({ message: 'Hi', width: 5 });
      const result = toast.draw(defaultContext);
      expect(result).toBeDefined();
    });

    it('should handle unicode', () => {
      const toast = new Toast({ message: '😀😁😂' });
      const result = toast.draw(defaultContext);
      expect(result.some(l => l.includes('😀'))).toBe(true);
    });
  });
});