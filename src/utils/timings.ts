// SPDX-License-Identifier: Apache-2.0
/**
 * Central timing instrumentation for profiling.
 * Enable with PI_TIMING=1 environment variable.
 */

import { performance } from 'node:perf_hooks';

function isEnabled(): boolean {
  return process.env.PI_TIMING === "1";
}

const timings: Array<{ label: string; ms: number }> = [];
let lastTime = performance.now();

/**
 * Reset timing collection to start fresh
 */
export function resetTimings(): void {
  if (!isEnabled()) return;
  timings.length = 0;
  lastTime = performance.now();
}

/**
 * Record a timing checkpoint with label
 */
export function time(label: string): void {
  if (!isEnabled()) return;
  const now = performance.now();
  timings.push({ label, ms: now - lastTime });
  lastTime = now;
}

/**
 * Print all recorded timings to stderr
 */
export function printTimings(): void {
  if (!isEnabled() || timings.length === 0) return;
  console.error("\n--- Startup Timings ---");
  for (const t of timings) {
    console.error(`  ${t.label}: ${Math.round(t.ms)}ms`);
  }
  const total = timings.reduce((sum, t) => sum + t.ms, 0);
  console.error(`  TOTAL: ${Math.round(total)}ms`);
  console.error("------------------------\n");
}

/**
 * Returns a high-resolution time value in milliseconds.
 */
export function now(): number {
  return performance.now();
}

/**
 * Measures the execution time of a synchronous function.
 * @param fn - The function to measure
 * @returns The elapsed time in milliseconds
 */
export function measure<T>(fn: () => T): number {
  const start = now();
  const result = fn();
  const end = now();
  return end - start;
}
