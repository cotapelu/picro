/**
 * Performance Profiler
 * Track memory, startup time, and operation latency
 */
import { performance } from 'perf_hooks';
import { memoryUsage } from 'process';

export interface PerformanceSnapshot {
  timestamp: number;
  memory: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  cpu: {
    user: number;
    system: number;
  };
  uptime: number;
}

export interface OperationMetrics {
  name: string;
  count: number;
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  p95Time: number;
}

/**
 * Performance profiler for continuous monitoring
 */
export class PerformanceProfiler {
  private snapshots: PerformanceSnapshot[] = [];
  private operations: Map<string, number[]> = new Map();
  private startTime: number = performance.now();
  private maxSnapshots: number = 100;

  /**
   * Take a performance snapshot
   */
  snapshot(): PerformanceSnapshot {
    const mem = memoryUsage();
    const snapshot: PerformanceSnapshot = {
      timestamp: Date.now(),
      memory: {
        rss: Math.round(mem.rss / 1024 / 1024 * 100) / 100, // MB
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100,
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024 * 100) / 100,
        external: Math.round(mem.external / 1024 / 1024 * 100) / 100,
      },
      cpu: process.cpuUsage(),
      uptime: Math.round((performance.now() - this.startTime) / 1000 * 100) / 100,
    };

    this.snapshots.push(snapshot);
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    return snapshot;
  }

  /**
   * Time an operation
   */
  time<T>(name: string, fn: () => T): T {
    const start = performance.now();
    try {
      return fn();
    } finally {
      const duration = performance.now() - start;
      this.recordOperation(name, duration);
    }
  }

  /**
   * Time an async operation
   */
  async timeAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      return await fn();
    } finally {
      const duration = performance.now() - start;
      this.recordOperation(name, duration);
    }
  }

  /**
   * Record operation timing
   */
  recordOperation(name: string, duration: number): void {
    if (!this.operations.has(name)) {
      this.operations.set(name, []);
    }
    this.operations.get(name)!.push(duration);
  }

  /**
   * Get metrics for an operation
   */
  getMetrics(name: string): OperationMetrics | null {
    const times = this.operations.get(name);
    if (!times || times.length === 0) return null;

    const sorted = [...times].sort((a, b) => a - b);
    const p95Idx = Math.floor(sorted.length * 0.95);

    return {
      name,
      count: times.length,
      totalTime: Math.round(times.reduce((a, b) => a + b, 0) * 100) / 100,
      avgTime: Math.round((times.reduce((a, b) => a + b, 0) / times.length) * 100) / 100,
      minTime: Math.round(sorted[0] * 100) / 100,
      maxTime: Math.round(sorted[sorted.length - 1] * 100) / 100,
      p95Time: Math.round(sorted[p95Idx] * 100) / 100,
    };
  }

  /**
   * Get all operation metrics
   */
  getAllMetrics(): OperationMetrics[] {
    return Array.from(this.operations.keys())
      .map(name => this.getMetrics(name))
      .filter((m): m is OperationMetrics => m !== null)
      .sort((a, b) => b.totalTime - a.totalTime);
  }

  /**
   * Get memory trend
   */
  getMemoryTrend(): { increasing: boolean; deltaMB: number } {
    if (this.snapshots.length < 2) {
      return { increasing: false, deltaMB: 0 };
    }
    const first = this.snapshots[0];
    const last = this.snapshots[this.snapshots.length - 1];
    const delta = last.memory.heapUsed - first.memory.heapUsed;
    return {
      increasing: delta > 0,
      deltaMB: Math.round(delta * 100) / 100,
    };
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const current = this.snapshot();
    const metrics = this.getAllMetrics();
    const trend = this.getMemoryTrend();

    const lines = [
      '═'.repeat(60),
      '  PERFORMANCE REPORT',
      '═'.repeat(60),
      '',
      '📊 Current Memory:',
      `  RSS:        ${current.memory.rss.toFixed(2)} MB`,
      `  Heap Used:  ${current.memory.heapUsed.toFixed(2)} MB`,
      `  Heap Total: ${current.memory.heapTotal.toFixed(2)} MB`,
      `  External:   ${current.memory.external.toFixed(2)} MB`,
      '',
      '📈 Memory Trend:',
      `  ${trend.increasing ? '↑' : '↓'} ${Math.abs(trend.deltaMB).toFixed(2)} MB`,
      '',
      '⏱️  Operation Metrics:',
    ];

    if (metrics.length === 0) {
      lines.push('  No operations recorded');
    } else {
      lines.push(`  ${'Operation'.padEnd(25)} ${'Count'.padStart(8)} ${'Avg (ms)'.padStart(10)} ${'P95 (ms)'.padStart(10)}`);
      lines.push('  ' + '─'.repeat(60));
      for (const m of metrics) {
        lines.push(`  ${m.name.slice(0, 25).padEnd(25)} ${String(m.count).padStart(8)} ${m.avgTime.toFixed(2).padStart(10)} ${m.p95Time.toFixed(2).padStart(10)}`);
      }
    }

    lines.push('', '═'.repeat(60));
    return lines.join('\n');
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.snapshots = [];
    this.operations.clear();
    this.startTime = performance.now();
  }
}

/**
 * Global profiler instance
 */
export const profiler = new PerformanceProfiler();

/**
 * Decorator for timing methods
 */
export function timed(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const original = descriptor.value;
  descriptor.value = function (...args: any[]) {
    return profiler.time(propertyKey, () => original.apply(this, args));
  };
  return descriptor;
}
