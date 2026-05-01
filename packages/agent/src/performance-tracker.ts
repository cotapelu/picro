// SPDX-License-Identifier: Apache-2.0
/**
 * Performance Tracker - Collect CPU and memory metrics over time
 */

import type { PerformanceMetrics as SnapshotMetrics } from './diagnostics.js';

/**
 * Performance sample point
 */
export interface PerformanceSample {
  /** Unix timestamp in ms */
  timestamp: number;
  /** CPU user time in ms */
  cpuUserMS: number;
  /** CPU system time in ms */
  cpuSystemMS: number;
  /** Resident set size in bytes */
  rss: number;
  /** Heap used in bytes */
  heapUsed: number;
  /** Event loop delay (if measured) */
  eventLoopDelay?: number;
}

/**
 * Performance tracker configuration
 */
export interface PerformanceTrackerOptions {
  /** Maximum number of samples to keep (default: 1000) */
  maxSamples?: number;
  /** Sampling interval in ms (default: 5000) */
  interval?: number;
  /** Auto-start on construction (default: false) */
  autoStart?: boolean;
}

/**
 * PerformanceTracker collects and stores performance metrics over time.
 * Can be used for profiling and diagnostics.
 */
export class PerformanceTracker {
  private samples: PerformanceSample[] = [];
  private intervalId: any = null;
  private _options: Required<Omit<PerformanceTrackerOptions, 'autoStart'>>;

  constructor(options: PerformanceTrackerOptions = {}) {
    this._options = {
      maxSamples: options.maxSamples ?? 1000,
      interval: options.interval ?? 5000,
    };
    if (options.autoStart) {
      this.start();
    }
  }

  /**
   * Start periodic sampling
   */
  start(): void {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => this.record(), this._options.interval);
  }

  /**
   * Stop periodic sampling
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Record a single sample immediately
   */
  record(): void {
    const usage = process.cpuUsage();
    const mem = process.memoryUsage();
    const sample: PerformanceSample = {
      timestamp: Date.now(),
      cpuUserMS: usage.user / 1000, // Convert µs to ms
      cpuSystemMS: usage.system / 1000,
      rss: mem.rss,
      heapUsed: mem.heapUsed,
    };
    this.samples.push(sample);
    if (this.samples.length > this._options.maxSamples) {
      this.samples.shift();
    }
  }

  /**
   * Get all samples (copy)
   */
  getSamples(): PerformanceSample[] {
    return [...this.samples];
  }

  /**
   * Get the most recent sample
   */
  getLastSample(): PerformanceSample | undefined {
    return this.samples[this.samples.length - 1];
  }

  /**
   * Clear all samples
   */
  clear(): void {
    this.samples = [];
  }

  /**
   * Get aggregated statistics over all samples
   */
  getStats(): {
    sampleCount: number;
    timeSpanMS: number;
    avgCpuUserMS: number;
    avgCpuSystemMS: number;
    avgRSSMB: number;
    avgHeapUsedMB: number;
    peakRSSMB: number;
    peakHeapUsedMB: number;
  } | null {
    if (this.samples.length === 0) return null;
    const sum = this.samples.reduce((acc, s) => ({
      cpuUser: acc.cpuUser + s.cpuUserMS,
      cpuSystem: acc.cpuSystem + s.cpuSystemMS,
      rss: acc.rss + s.rss,
      heapUsed: acc.heapUsed + s.heapUsed,
    }), { cpuUser: 0, cpuSystem: 0, rss: 0, heapUsed: 0 });
    const n = this.samples.length;
    const first = this.samples[0];
    const last = this.samples[this.samples.length - 1];
    const peakRSS = Math.max(...this.samples.map(s => s.rss));
    const peakHeap = Math.max(...this.samples.map(s => s.heapUsed));
    return {
      sampleCount: n,
      timeSpanMS: last.timestamp - first.timestamp,
      avgCpuUserMS: sum.cpuUser / n,
      avgCpuSystemMS: sum.cpuSystem / n,
      avgRSSMB: (sum.rss / n) / 1024 / 1024,
      avgHeapUsedMB: (sum.heapUsed / n) / 1024 / 1024,
      peakRSSMB: peakRSS / 1024 / 1024,
      peakHeapUsedMB: peakHeap / 1024 / 1024,
    };
  }

  /**
   * Destroy the tracker
   */
  destroy(): void {
    this.stop();
    this.clear();
  }
}
