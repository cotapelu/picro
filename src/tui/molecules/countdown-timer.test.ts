// SPDX-License-Identifier: Apache-2.0
/**
 * Comprehensive tests for CountdownTimer molecule component
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CountdownTimer } from './countdown-timer';

describe('CountdownTimer', () => {
  let onTick: vi.Mock;
  let onExpire: vi.Mock;
  let onRenderRequested: vi.Mock;
  let timer: CountdownTimer;

  beforeEach(() => {
    onTick = vi.fn();
    onExpire = vi.fn();
    onRenderRequested = vi.fn();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    timer?.dispose();
  });

  describe('constructor', () => {
    it('should calculate seconds from timeoutMs', () => {
      timer = new CountdownTimer(3500, onTick, onExpire);
      expect(timer['remainingSeconds']).toBe(4); // ceil(3500/1000)=4
    });

    it('should call onTick immediately with initial seconds', () => {
      timer = new CountdownTimer(5000, onTick, onExpire);
      expect(onTick).toHaveBeenCalledWith(5);
    });

    it('should accept optional onRenderRequested', () => {
      timer = new CountdownTimer(1000, onTick, onExpire, onRenderRequested);
      expect(timer).toBeDefined();
    });

    it('should start interval', () => {
      timer = new CountdownTimer(5000, onTick, onExpire);
      expect(timer['intervalId']).toBeDefined();
    });
  });

  describe('tick behavior', () => {
    beforeEach(() => {
      timer = new CountdownTimer(3000, onTick, onExpire, onRenderRequested);
      onTick.mockClear();
      onRenderRequested.mockClear();
    });

    it('should decrement seconds each interval', () => {
      expect(timer['remainingSeconds']).toBe(3);
      vi.advanceTimersByTime(1000);
      expect(timer['remainingSeconds']).toBe(2);
      expect(onTick).toHaveBeenLastCalledWith(2);
    });

    it('should call onTick on each tick', () => {
      vi.advanceTimersByTime(1000);
      expect(onTick).toHaveBeenCalledTimes(2); // initial + 1 tick
      vi.advanceTimersByTime(1000);
      expect(onTick).toHaveBeenCalledTimes(3);
    });

    it('should call onRenderRequested on each tick', () => {
      vi.advanceTimersByTime(1000);
      expect(onRenderRequested).toHaveBeenCalled();
    });

    it('should call onExpire when reaches zero', () => {
      vi.advanceTimersByTime(3000);
      expect(onExpire).toHaveBeenCalled();
    });

    it('should call onExpire after final tick (remainingSeconds <= 0)', () => {
      // 3 seconds: after 3 ticks (3000ms), remainingSeconds becomes 0
      vi.advanceTimersByTime(3000);
      expect(onExpire).toHaveBeenCalledTimes(1);
    });

    it('should stop interval after expiration', () => {
      vi.advanceTimersByTime(3000);
      const id = timer['intervalId'];
      expect(id).toBeUndefined(); // cleared
    });

    it('should not call onTick after expiry', () => {
      vi.advanceTimersByTime(3000);
      onTick.mockClear();
      vi.advanceTimersByTime(1000);
      expect(onTick).not.toHaveBeenCalled();
    });
  });

  describe('dispose()', () => {
    it('should clear interval', () => {
      const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
      timer = new CountdownTimer(10000, onTick, onExpire);
      timer.dispose();
      expect(clearIntervalSpy).toHaveBeenCalledWith(timer['intervalId']);
    });

    it('should be safe to call multiple times', () => {
      const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
      timer = new CountdownTimer(10000, onTick, onExpire);
      timer.dispose();
      timer.dispose();
      expect(clearIntervalSpy).toHaveBeenCalledTimes(2);
    });

    it('should clear intervalId', () => {
      timer = new CountdownTimer(10000, onTick, onExpire);
      timer.dispose();
      expect(timer['intervalId']).toBeUndefined();
    });

    it('should stop before timeout if disposed early', () => {
      timer = new CountdownTimer(10000, onTick, onExpire);
      onTick.mockClear();
      timer.dispose();
      vi.advanceTimersByTime(5000);
      expect(onTick).not.toHaveBeenCalled();
      expect(onExpire).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle timeoutMs exactly 1000 (1 second)', () => {
      timer = new CountdownTimer(1000, onTick, onExpire);
      // ceil(1000/1000)=1
      expect(timer['remainingSeconds']).toBe(1);
      vi.advanceTimersByTime(1000);
      expect(onExpire).toHaveBeenCalled();
    });

    it('should handle timeoutMs less than 1000', () => {
      timer = new CountdownTimer(500, onTick, onExpire);
      expect(timer['remainingSeconds']).toBe(1); // ceil(0.5)=1
    });

    it('should handle very large timeoutMs', () => {
      timer = new CountdownTimer(3600000, onTick, onExpire);
      expect(timer['remainingSeconds']).toBe(3600);
    });

    it('should continue ticking after manual modification? (no setter)', () => {
      timer = new CountdownTimer(3000, onTick, onExpire);
      vi.advanceTimersByTime(1000);
      timer['remainingSeconds'] = 10;
      vi.advanceTimersByTime(1000);
      expect(timer['remainingSeconds']).toBe(9);
    });
  });
});