"use strict";
// SPDX-License-Identifier: Apache-2.0
/**
 * Central timing instrumentation for profiling.
 * Enable with PI_TIMING=1 environment variable.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetTimings = resetTimings;
exports.time = time;
exports.printTimings = printTimings;
const ENABLED = process.env.PI_TIMING === "1";
const timings = [];
let lastTime = Date.now();
/**
 * Reset timing collection to start fresh
 */
function resetTimings() {
    if (!ENABLED)
        return;
    timings.length = 0;
    lastTime = Date.now();
}
/**
 * Record a timing checkpoint with label
 */
function time(label) {
    if (!ENABLED)
        return;
    const now = Date.now();
    timings.push({ label, ms: now - lastTime });
    lastTime = now;
}
/**
 * Print all recorded timings to stderr
 */
function printTimings() {
    if (!ENABLED || timings.length === 0)
        return;
    console.error("\n--- Startup Timings ---");
    for (const t of timings) {
        console.error(`  ${t.label}: ${t.ms}ms`);
    }
    const total = timings.reduce((sum, t) => sum + t.ms, 0);
    console.error(`  TOTAL: ${total}ms`);
    console.error("------------------------\n");
}
//# sourceMappingURL=timings.js.map