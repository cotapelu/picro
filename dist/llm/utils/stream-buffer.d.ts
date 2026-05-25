/**
 * Stream buffering utilities
 * Optimizes streaming for providers with high-frequency small chunks
 * Reduces UI re-renders by coalescing rapid chunks
 */
export interface BufferConfig {
    /** Target chunk size in characters before flush */
    minChunkSize?: number;
    /** Maximum delay before forced flush (ms) */
    maxDelay?: number;
    /** Chunk accumulation timeout (ms) */
    accumulationMs?: number;
    /** Minimum chunks to buffer before considering flush */
    minBufferCount?: number;
    /** Adaptive: reduce buffer for fast providers, increase for slow */
    adaptive?: boolean;
}
/**
 * Stream buffer for coalescing rapid chunks
 * Optimized for terminal UI rendering
 */
export declare class StreamBuffer {
    private buffer;
    private chunks;
    private lastFlush;
    private config;
    private flushTimeout;
    private avgLatency;
    private chunkCount;
    private totalLatency;
    constructor(config?: BufferConfig);
    /**
     * Add content to buffer
     * Returns accumulated content if should flush, null otherwise
     */
    add(content: string): string | null;
    /**
     * Force flush current buffer
     */
    flush(): string;
    /**
     * Get current buffer size
     */
    get size(): number;
    /**
     * Check if buffer has content
     */
    get hasContent(): boolean;
    /**
     * Get metrics for debugging
     */
    getMetrics(): {
        avgLatency: number;
        threshold: number;
        bufferSize: number;
    };
    /**
     * Reset buffer and metrics
     */
    reset(): void;
    private getAdaptiveThreshold;
    private scheduleFlush;
}
/**
 * Provider-specific buffer configurations
 */
export declare const providerBufferConfigs: Record<string, BufferConfig>;
/**
 * Get buffer config for provider
 */
export declare function getProviderBufferConfig(provider: string): BufferConfig;
/**
 * Create buffer for provider
 */
export declare function createStreamBuffer(provider: string): StreamBuffer;
//# sourceMappingURL=stream-buffer.d.ts.map