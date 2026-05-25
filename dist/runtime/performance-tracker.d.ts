/**
 * Performance Tracker - Collect CPU and memory metrics over time
 */
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
export declare class PerformanceTracker {
    private samples;
    private intervalId;
    private _options;
    constructor(options?: PerformanceTrackerOptions);
    /**
     * Start periodic sampling
     */
    start(): void;
    /**
     * Stop periodic sampling
     */
    stop(): void;
    /**
     * Record a single sample immediately
     */
    record(): void;
    /**
     * Get all samples (copy)
     */
    getSamples(): PerformanceSample[];
    /**
     * Get the most recent sample
     */
    getLastSample(): PerformanceSample | undefined;
    /**
     * Clear all samples
     */
    clear(): void;
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
    } | null;
    /**
     * Destroy the tracker
     */
    destroy(): void;
}
//# sourceMappingURL=performance-tracker.d.ts.map