// SPDX-License-Identifier: Apache-2.0
/**
 * Central timing instrumentation for profiling.
 * Enable with PI_TIMING=1 environment variable.
 */

const ENABLED = process.env.PI_TIMING === "1";
const timings: Array<{ label: string; ms: number }> = [];
let lastTime = Date.now();

/**
 * Reset timing collection to start fresh
 */
export function resetTimings(): void {
  if (!ENABLED) return;
  timings.length = 0;
  lastTime = Date.now();
}

/**
 * Record a timing checkpoint with label
 */
export function time(label: string): void {
  if (!ENABLED) return;
  const now = Date.now();
  timings.push({ label, ms: now - lastTime });
  lastTime = now;
}

/**
 * Print all recorded timings to stderr
 */
export function printTimings(): void {
  if (!ENABLED || timings.length === 0) return;
  console.error("\n--- Startup Timings ---");
  for (const t of timings) {
    console.error(`  ${t.label}: ${t.ms}ms`);
  }
  const total = timings.reduce((sum, t) => sum + t.ms, 0);
  console.error(`  TOTAL: ${total}ms`);
  console.error("------------------------\n");
}
