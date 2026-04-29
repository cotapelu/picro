import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CountdownTimer } from '../src/components/countdown-timer.js';
import { TerminalUI } from '../src/components/tui.js';
import { ProcessTerminal } from '../src/components/terminal.js';

describe('CountdownTimer', () => {
  let tui: TerminalUI;
  let onTick: ReturnType<typeof vi.fn>;
  let onExpire: ReturnType<typeof vi.fn>;
  let timer: CountdownTimer;

  beforeEach(() => {
    const terminal = new ProcessTerminal();
    tui = new TerminalUI(terminal);
    onTick = vi.fn();
    onExpire = vi.fn();
    vi.useFakeTimers();
  });

  afterEach(() => {
    timer?.dispose();
    vi.useRealTimers();
  });

  it('should call onTick immediately with total seconds', () => {
    timer = new CountdownTimer(5000, onTick, onExpire, () => tui.requestRender());
    expect(onTick).toHaveBeenCalledWith(5); // 5000ms -> 5 seconds
  });

  it('should call onTick every second with decreasing count', () => {
    timer = new CountdownTimer(3000, onTick, onExpire, () => tui.requestRender());

    // Initial call
    expect(onTick).toHaveBeenCalledWith(3);

    // Advance 1 second
    vi.advanceTimersByTime(1000);
    expect(onTick).toHaveBeenCalledWith(2);

    // Advance another second
    vi.advanceTimersByTime(1000);
    expect(onTick).toHaveBeenCalledWith(1);
  });

  it('should call onExpire when countdown reaches zero', () => {
    timer = new CountdownTimer(2000, onTick, onExpire, () => tui.requestRender());

    // Initial: 2 seconds
    expect(onTick).toHaveBeenCalledWith(2);

    // 1 second
    vi.advanceTimersByTime(1000);
    expect(onTick).toHaveBeenCalledWith(1);

    // Another second: should hit 0 and expire
    vi.advanceTimersByTime(1000);
    // onTick may be called with 0 before expiry, depending on implementation
    expect(onExpire).toHaveBeenCalled();
  });

  it('should call tui.requestRender on each interval tick', () => {
    const requestRenderSpy = vi.spyOn(tui, 'requestRender');
    timer = new CountdownTimer(5000, onTick, onExpire, () => tui.requestRender());

    // Initially requestRender not called (only onTick)
    expect(requestRenderSpy).not.toHaveBeenCalled();

    // First tick after 1s
    vi.advanceTimersByTime(1000);
    expect(requestRenderSpy).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1000);
    expect(requestRenderSpy).toHaveBeenCalledTimes(2);
  });

  it('should stop timer after expiration', () => {
    timer = new CountdownTimer(1000, onTick, onExpire, () => tui.requestRender());

    vi.advanceTimersByTime(1000); // expire
    expect(onExpire).toHaveBeenCalled();

    // Advance more time - should not trigger additional ticks
    const tickCountAfterExpiry = onTick.mock.calls.length;
    vi.advanceTimersByTime(2000);
    expect(onTick.mock.calls.length).toBe(tickCountAfterExpiry);
  });

  it('dispose should clear the interval and stop callbacks', () => {
    timer = new CountdownTimer(5000, onTick, onExpire, () => tui.requestRender());
    timer.dispose();

    // Advance time - should not trigger callbacks after dispose
    vi.advanceTimersByTime(3000);
    expect(onTick).toHaveBeenCalledTimes(1); // only initial call
    expect(onExpire).not.toHaveBeenCalled();
  });
});
