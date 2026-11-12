// SPDX-License-Identifier: Apache-2.0
/**
 * Performance tracker CPU accounting.
 *
 * record() stored process.cpuUsage() directly. That function returns the
 * CUMULATIVE user/system time for the whole process, so every sample grew
 * monotonically and the reported averages converged on the process lifetime
 * total (an idle interval could report "avg cpu 800ms+"). Passing the previous
 * reading in makes Node return the delta for the interval, and the baseline is
 * taken at construction so the first sample is also an interval, not a lifetime.
 */

import { describe, it, expect, vi } from 'vitest';
import { PerformanceTracker } from './performance-tracker.js';

function burnCpu(ms: number): void {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    Math.sqrt(Math.random());
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Absolute millisecond budgets are flaky on a loaded machine, so assertions about
 * "no CPU happened" compare against the process' own lifetime total: the bug
 * reported ~100% of it, a correct delta reports a small fraction.
 */
function lifetimeCpuMS(): number {
  return process.cpuUsage().user / 1000;
}

const smallDeltaBudget = () => Math.max(25, lifetimeCpuMS() * 0.25);

describe('PerformanceTracker - CPU deltas', () => {
  it('reports ~0 CPU for an idle interval', async () => {
    const tracker = new PerformanceTracker();
    tracker.record();
    await sleep(50); // idle: no CPU work
    tracker.record();

    const samples = tracker.getSamples();
    expect(samples).toHaveLength(2);
    const budget = smallDeltaBudget();
    expect(samples[1]!.cpuUserMS).toBeLessThan(budget);
    expect(samples[1]!.cpuSystemMS).toBeLessThan(budget);
  });

  it('does not report the process lifetime total as an average', async () => {
    burnCpu(20); // the process now has real cumulative CPU time

    const tracker = new PerformanceTracker();
    tracker.record();
    await sleep(30);
    tracker.record();

    const stats = tracker.getStats()!;
    expect(stats.sampleCount).toBe(2);
    expect(stats.avgCpuUserMS).toBeLessThan(smallDeltaBudget());
  });

  it('reports real CPU for an interval that did work', async () => {
    const tracker = new PerformanceTracker();
    tracker.record();
    burnCpu(30);
    tracker.record();

    const samples = tracker.getSamples();
    expect(samples[1]!.cpuUserMS).toBeGreaterThan(10);
  });

  it('keeps at most maxSamples entries', () => {
    const tracker = new PerformanceTracker({ maxSamples: 3 });
    for (let i = 0; i < 10; i++) tracker.record();
    expect(tracker.getSamples()).toHaveLength(3);
  });

  it('clear() resets the delta baseline', async () => {
    const tracker = new PerformanceTracker();
    tracker.record();
    burnCpu(20);
    tracker.clear();

    tracker.record();
    await sleep(30);
    tracker.record();
    expect(tracker.getStats()!.avgCpuUserMS).toBeLessThan(smallDeltaBudget());
  });

  it('start()/stop() drive periodic sampling', async () => {
    vi.useFakeTimers();
    try {
      const tracker = new PerformanceTracker({ interval: 100 });
      tracker.start();
      await vi.advanceTimersByTimeAsync(350);
      tracker.stop();
      expect(tracker.getSamples().length).toBeGreaterThanOrEqual(3);

      // Stopped: no further samples.
      const count = tracker.getSamples().length;
      await vi.advanceTimersByTimeAsync(500);
      expect(tracker.getSamples()).toHaveLength(count);
    } finally {
      vi.useRealTimers();
    }
  });

  it('destroy() stops and clears', async () => {
    const tracker = new PerformanceTracker({ interval: 50, autoStart: true });
    tracker.record();
    tracker.destroy();
    expect(tracker.getSamples()).toEqual([]);
    expect(tracker.getStats()).toBeNull();
    await sleep(120);
    expect(tracker.getSamples()).toEqual([]);
  });

  it('reports peak and average memory', () => {
    const tracker = new PerformanceTracker();
    tracker.record();
    tracker.record();
    const stats = tracker.getStats()!;
    expect(stats.peakRSSMB).toBeGreaterThan(0);
    expect(stats.avgRSSMB).toBeGreaterThan(0);
    expect(stats.peakRSSMB).toBeGreaterThanOrEqual(stats.avgRSSMB);
  });
});
