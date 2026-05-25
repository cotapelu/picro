/**
 * PrioritizedEventEmitter - Event emitter with priority queues and buffering
 *
 * Extends EventEmitter with:
 * - Event type prioritization (critical, high, normal, low)
 * - Buffering to handle high-throughput scenarios
 * - Optional dropping of low-priority events when buffer full
 */
import type { AgentEvent } from './events.js';
/**
 * Options for prioritized emitter
 */
export interface PrioritizedEventEmitterOptions {
    /** Maximum buffer size per priority (0 = unlimited) */
    maxBufferSize?: number;
    /** Whether to drop lowest priority events when buffer is full */
    dropLowPriorityWhenFull?: boolean;
    /** Custom priority overrides (event type -> priority) */
    priorityOverrides?: Record<string, number>;
}
/**
 * PrioritizedEventEmitter
 */
export declare class PrioritizedEventEmitter {
    private typedListeners;
    private globalListeners;
    private eventMetrics;
    private queues;
    private processing;
    private droppedCount;
    private readonly maxBufferSize;
    private readonly dropLowPriorityWhenFull;
    private readonly priorities;
    constructor(options?: PrioritizedEventEmitterOptions);
    /**
     * Get priority for event type
     */
    private getPriority;
    /**
     * Subscribe to a specific event type.
     */
    on<K extends AgentEvent['type']>(eventType: K, handler: (event: Extract<AgentEvent, {
        type: K;
    }>) => Promise<void> | void): () => void;
    /**
     * Subscribe to all events.
     */
    onAny(handler: (event: AgentEvent) => Promise<void> | void): () => void;
    /**
     * Unsubscribe from a specific event type.
     */
    off<K extends AgentEvent['type']>(eventType: K, handler: (event: Extract<AgentEvent, {
        type: K;
    }>) => Promise<void> | void): void;
    /**
     * Unsubscribe from all events.
     */
    offAny(handler: (event: AgentEvent) => Promise<void> | void): void;
    /**
     * Emit an event (non-blocking, queued).
     */
    emit(event: AgentEvent): Promise<void>;
    /**
     * Process queued events in priority order.
     */
    private _processQueue;
    /**
     * Internal emit without queuing.
     */
    private _emitInternal;
    /**
     * Get event emission metrics.
     */
    getEventMetrics(): Map<string, {
        count: number;
        avgDurationMs: number;
    }>;
    /**
     * Clear event metrics.
     */
    clearMetrics(): void;
    /**
     * Get dropped event count.
     */
    getDroppedCount(): number;
    /**
     * Get current queue lengths per priority.
     */
    getQueueLengths(): {
        low: number;
        normal: number;
        high: number;
        critical: number;
    };
    /**
     * Clear all pending events.
     */
    clear(): void;
}
//# sourceMappingURL=prioritized-event-emitter.d.ts.map