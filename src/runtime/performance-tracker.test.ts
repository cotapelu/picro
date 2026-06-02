import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PerformanceTracker } from './performance-tracker';

describe('PerformanceTracker', () => {
  let tracker: PerformanceTracker;
  let cpuUsageSpy: any;
  let memoryUsageSpy: any;

  beforeEach(() => {
    vi.useFakeTimers();
    // Mock process.cpuUsage and process.memoryUsage
    cpuUsageSpy = vi.spyOn(process, 'cpuUsage').mockReturnValue({ user: 123456, system: 654321 } as any);
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
    expect(s.cpuUserMS).toBe(123456 / 1000); // µs to ms
    expect(s.cpuSystemMS).toBe(654321 / 1000);
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
    // Override mocks to return specific values for two recordings
    cpuUsageSpy
      .mockReturnValueOnce({ user: 2000, system: 1000 })
      .mockReturnValueOnce({ user: 4000, system: 2000 });
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
    // cpuUserMS: convert µs to ms
    expect(stats!.avgCpuUserMS).toBeCloseTo((2 + 4) / 2, 0); // (2000/1000=2, 4000/1000=4)
    expect(stats!.avgCpuSystemMS).toBeCloseTo((1 + 2) / 2, 0);
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
