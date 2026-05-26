"use strict";
/**
 * Stream buffering utilities
 * Optimizes streaming for providers with high-frequency small chunks
 * Reduces UI re-renders by coalescing rapid chunks
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.providerBufferConfigs = exports.StreamBuffer = void 0;
exports.getProviderBufferConfig = getProviderBufferConfig;
exports.createStreamBuffer = createStreamBuffer;
/**
 * Stream buffer for coalescing rapid chunks
 * Optimized for terminal UI rendering
 */
class StreamBuffer {
    buffer = '';
    chunks = [];
    lastFlush = Date.now();
    config;
    flushTimeout = null;
    avgLatency = 50;
    chunkCount = 0;
    totalLatency = 0;
    constructor(config = {}) {
        this.config = {
            minChunkSize: config.minChunkSize ?? 8,
            maxDelay: config.maxDelay ?? 50,
            accumulationMs: config.accumulationMs ?? 16,
            minBufferCount: config.minBufferCount ?? 3,
            adaptive: config.adaptive ?? true,
        };
    }
    /**
     * Add content to buffer
     * Returns accumulated content if should flush, null otherwise
     */
    add(content) {
        const now = Date.now();
        this.buffer += content;
        this.chunks.push({ content, timestamp: now });
        // Track latency for adaptive mode
        if (this.chunks.length > 1) {
            const lastIdx = this.chunks.length - 1;
            const latency = this.chunks[lastIdx].timestamp - this.chunks[lastIdx - 1].timestamp;
            this.totalLatency += latency;
            this.chunkCount++;
            this.avgLatency = this.totalLatency / this.chunkCount;
        }
        // Determine if should flush
        const delay = now - this.lastFlush;
        const currentThreshold = this.getAdaptiveThreshold();
        if (this.buffer.length >= currentThreshold || delay >= this.config.maxDelay) {
            return this.flush();
        }
        // Schedule delayed flush
        this.scheduleFlush();
        return null;
    }
    /**
     * Force flush current buffer
     */
    flush() {
        if (this.flushTimeout) {
            clearTimeout(this.flushTimeout);
            this.flushTimeout = null;
        }
        const result = this.buffer;
        this.buffer = '';
        this.chunks = [];
        this.lastFlush = Date.now();
        return result;
    }
    /**
     * Get current buffer size
     */
    get size() {
        return this.buffer.length;
    }
    /**
     * Check if buffer has content
     */
    get hasContent() {
        return this.buffer.length > 0;
    }
    /**
     * Get metrics for debugging
     */
    getMetrics() {
        return {
            avgLatency: this.avgLatency,
            threshold: this.getAdaptiveThreshold(),
            bufferSize: this.buffer.length,
        };
    }
    /**
     * Reset buffer and metrics
     */
    reset() {
        this.buffer = '';
        this.chunks = [];
        this.avgLatency = 50;
        this.chunkCount = 0;
        this.totalLatency = 0;
        this.lastFlush = Date.now();
        if (this.flushTimeout) {
            clearTimeout(this.flushTimeout);
            this.flushTimeout = null;
        }
    }
    getAdaptiveThreshold() {
        if (!this.config.adaptive)
            return this.config.minChunkSize;
        // Reduce threshold for fast providers (low latency)
        // Increase threshold for slow providers to batch more
        if (this.avgLatency < 20)
            return Math.max(4, this.config.minChunkSize - 4);
        if (this.avgLatency > 100)
            return this.config.minChunkSize * 2;
        return this.config.minChunkSize;
    }
    scheduleFlush() {
        if (this.flushTimeout)
            return;
        this.flushTimeout = setTimeout(() => {
            this.flushTimeout = null;
            if (this.buffer.length > 0) {
                // Trigger via callback if provided, otherwise silent flush
                this.flush();
            }
        }, this.config.accumulationMs);
    }
}
exports.StreamBuffer = StreamBuffer;
/**
 * Provider-specific buffer configurations
 */
exports.providerBufferConfigs = {
    // Fast providers - minimal buffering
    openai: { minChunkSize: 4, maxDelay: 16, accumulationMs: 8 },
    'openai-copilot': { minChunkSize: 4, maxDelay: 16, accumulationMs: 8 },
    azure: { minChunkSize: 4, maxDelay: 16, accumulationMs: 8 },
    // Balanced providers
    anthropic: { minChunkSize: 8, maxDelay: 32, accumulationMs: 16 },
    'grok-api': { minChunkSize: 8, maxDelay: 32, accumulationMs: 16 },
    // Slower providers - more buffering
    gemini: { minChunkSize: 16, maxDelay: 80, accumulationMs: 40 },
    openrouter: { minChunkSize: 12, maxDelay: 64, accumulationMs: 32 },
    // High-latency providers - aggressive buffering
    localai: { minChunkSize: 32, maxDelay: 100, accumulationMs: 50 },
    ollama: { minChunkSize: 32, maxDelay: 100, accumulationMs: 50 },
    // Default
    default: { minChunkSize: 8, maxDelay: 50, accumulationMs: 16, adaptive: true },
};
/**
 * Get buffer config for provider
 */
function getProviderBufferConfig(provider) {
    return exports.providerBufferConfigs[provider.toLowerCase()] ?? exports.providerBufferConfigs.default;
}
/**
 * Create buffer for provider
 */
function createStreamBuffer(provider) {
    const config = getProviderBufferConfig(provider);
    return new StreamBuffer(config);
}
//# sourceMappingURL=stream-buffer.js.map