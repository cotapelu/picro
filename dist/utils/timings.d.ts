/**
 * Central timing instrumentation for profiling.
 * Enable with PI_TIMING=1 environment variable.
 */
/**
 * Reset timing collection to start fresh
 */
export declare function resetTimings(): void;
/**
 * Record a timing checkpoint with label
 */
export declare function time(label: string): void;
/**
 * Print all recorded timings to stderr
 */
export declare function printTimings(): void;
//# sourceMappingURL=timings.d.ts.map