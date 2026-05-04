import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CountdownTimer } from '../countdown-timer';

describe('CountdownTimer', () => {
  let timer: CountdownTimer;
  const onTick = vi.fn();
  const onExpire = vi.fn();
  const onRender = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    if (timer) {
      timer.dispose();
    }
    vi.useRealTimers();
  });

  describe('Constructor', () => {
    it('should start timer with correct seconds', () => {
      timer = new CountdownTimer(5000, onTick, onExpire, onRender);
      expect(onTick).toHaveBeenCalledWith(5);
    });

    it('should calculate seconds from milliseconds', () => {
      timer = new CountdownTimer(2000, onTick, onExpire);
      expect(onTick).toHaveBeenCalledWith(2);
    });

    it('should handle milliseconds that result in zero', () => {
      timer = new CountdownTimer(500, onTick, onExpire);
      expect(onTick).toHaveBeenCalledWith(0);
    });
  });

  describe('tick handling', () => {
    it('should call onTick every second', () => {
      timer = new CountdownTimer(3000, onTick, onExpire, onRender);
      vi.advanceTimersByTime(1000);
      expect(onTick).toHaveBeenCalledTimes(2);
      expect(onTick).toHaveBeenCalledWith(4);
      vi.advanceTimersByTime(1000);
      expect(onTick).toHaveBeenCalledTimes(3);
      expect(onTick).toHaveBeenCalledWith(3);
    });

    it('should call onRender on each tick if provided', () => {
      timer = new CountdownTimer(3000, onTick, onExpire, onRender);
      vi.advanceTimersByTime(1000);
      expect(onRender).toHaveBeenCalled();
    });
  });

  describe('expiration', () => {
    it('should call onExpire when timer reaches zero', () => {
      timer = new CountdownTimer(2000, onTick, onExpire);
      vi.advanceTimersByTime(2000);
      expect(onExpire).toHaveBeenCalledTimes(1);
    });

    it('should stop interval after expiration', () => {
      timer = new CountdownTimer(2000, onTick, onExpire);
      vi.advanceTimersByTime(3000);
      expect(onExpire).toHaveBeenCalled();
      // Advance more time
      vi.advanceTimersByTime(1000);
      // onTick should NOT be called again after expiration
      expect(onTick).toHaveBeenCalledTimes(2); // initial + 1 tick + expiration tick
    });
  });

  describe('dispose', () => {
    it('should stop the timer immediately', () => {
      timer = new CountdownTimer(5000, onTick, onExpire);
      timer.dispose();
      vi.advanceTimersByTime(6000);
      expect(onExpire).not.toHaveBeenCalled();
    });

    it('should allow disposal multiple times', () => {
      timer = new CountdownTimer(5000, onTick, onExpire);
      expect(() => timer.dispose()).not.toThrow();
      expect(() => timer.dispose()).not.toThrow();
    });
  });
});