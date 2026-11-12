import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PerformanceTracker } from './performance-tracker';

describe('PerformanceTracker', () => {
  let tracker: PerformanceTracker;
  let cpuUsageSpy: any;
  let memoryUsageSpy: any;

  // Each cpuUsage() call advances a cumulative counter; when a previous reading
  // is passed in, Node returns the difference. The previous mock ignored the
  // argument entirely, which hid the cumulative-vs-delta bug this suite now pins.
  let cumulativeUser = 0;
  let cumulativeSystem = 0;

  beforeEach(() => {
    vi.useFakeTimers();
    cumulativeUser = 0;
    cumulativeSystem = 0;
    cpuUsageSpy = vi.spyOn(process, 'cpuUsage').mockImplementation((previous?: any) => {
      cumulativeUser += 1000;
      cumulativeSystem += 500;
      const current = { user: cumulativeUser, system: cumulativeSystem };
      if (!previous) return current as any;
      return {
        user: current.user - previous.user,
        system: current.system - previous.system,
      } as any;
    });
    memoryUsageSpy = vi.spyOn(process, 'memoryUsage').mockReturnValue({ rss: 10_000_000, heapUsed: 5_000_000, heapTotal: 8_000_000, external: 0 } as any);
    tracker = new PerformanceTracker();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    tracker?.destroy();
  });

  it('records a sample with correct fields', () => {
    tracker.record();
    const samples = tracker.getSamples();
    expect(samples).toHaveLength(1);
    const s = samples[0];
    expect(s).toHaveProperty('timestamp');
    expect(typeof s.timestamp).toBe('number');
    // Per-interval delta, not the cumulative total.
    expect(s.cpuUserMS).toBe(1); // 1000µs -> 1ms since the constructor baseline
    expect(s.cpuSystemMS).toBe(0.5);
    expect(s.rss).toBe(10_000_000);
    expect(s.heapUsed).toBe(5_000_000);
  });

  it('clear removes all samples', () => {
    tracker.record();
    tracker.record();
    expect(tracker.getSamples()).toHaveLength(2);
    tracker.clear();
    expect(tracker.getSamples()).toHaveLength(0);
  });

  it('enforces maxSamples limit', () => {
    tracker = new PerformanceTracker({ maxSamples: 2 });
    tracker.record();
    tracker.record();
    tracker.record(); // should shift first
    const samples = tracker.getSamples();
    expect(samples).toHaveLength(2);
    // The first sample should be the second record (timestamp later than first which was shifted)
    // Not easy to check without real timestamps, but we can check that record after limit still yields length 2
    tracker.record();
    expect(tracker.getSamples()).toHaveLength(2);
  });

  it('start sets interval and stop clears it', () => {
    tracker.start();
    expect((tracker as any).intervalId).toBeDefined();
    tracker.stop();
    expect((tracker as any).intervalId).toBeNull();
  });

  it('periodic recording with interval', () => {
    tracker = new PerformanceTracker({ interval: 1000 });
    tracker.start();
    expect(tracker.getSamples()).toHaveLength(0);
    vi.advanceTimersByTime(1000);
    expect(tracker.getSamples()).toHaveLength(1);
    vi.advanceTimersByTime(1000);
    expect(tracker.getSamples()).toHaveLength(2);
    tracker.stop();
    vi.advanceTimersByTime(1000);
    expect(tracker.getSamples()).toHaveLength(2);
  });

  it('getStats calculates correct averages', () => {
    memoryUsageSpy
      .mockReturnValueOnce({ rss: 2_000_000, heapUsed: 1_000_000, heapTotal: 2_000_000, external: 0 })
      .mockReturnValueOnce({ rss: 4_000_000, heapUsed: 2_000_000, heapTotal: 4_000_000, external: 0 });
    tracker.record();
    tracker.record();
    const stats = tracker.getStats();
    expect(stats).not.toBeNull();
    expect(stats!.sampleCount).toBe(2);
    // timeSpan could be 0 if timestamps are equal
    expect(typeof stats!.timeSpanMS).toBe('number');
    // Every sample is a 1000µs delta, so the average is 1ms / 0.5ms - not the
    // cumulative process total the old assertions expected.
    expect(stats!.avgCpuUserMS).toBeCloseTo(1, 5);
    expect(stats!.avgCpuSystemMS).toBeCloseTo(0.5, 5);
    expect(stats!.avgRSSMB).toBeCloseTo(((2_000_000 + 4_000_000) / 2) / 1024 / 1024, 0);
    expect(stats!.avgHeapUsedMB).toBeCloseTo(((1_000_000 + 2_000_000) / 2) / 1024 / 1024, 0);
    expect(stats!.peakRSSMB).toBeCloseTo(4_000_000 / 1024 / 1024, 0);
    expect(stats!.peakHeapUsedMB).toBeCloseTo(2_000_000 / 1024 / 1024, 0);
  });

  it('getStats returns null if no samples', () => {
    expect(tracker.getStats()).toBeNull();
  });

  it('destroy stops and clears', () => {
    tracker.start();
    tracker.record();
    tracker.destroy();
    expect((tracker as any).intervalId).toBeNull();
    expect(tracker.getSamples()).toHaveLength(0);
  });
});
