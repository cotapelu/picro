/**
 * Event emitter for agent lifecycle events.
 * Uses typed event handlers with async emission.
 */
import type { AgentEvent } from './events.js';
/**
 * Central event emitter for agent events.
 * Supports typed subscriptions and global listeners.
 */
export declare class EventEmitter {
    private typedListeners;
    private globalListeners;
    private eventMetrics;
    /**
     * Subscribe to a specific event type.
     * Returns unsubscribe function.
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
     * Emit an event to all relevant listeners.
     * Waits for all async handlers to complete.
     */
    emit(event: AgentEvent): Promise<void>;
    /**
     * Emit multiple events in sequence.
     */
    emitAll(events: AgentEvent[]): Promise<void>;
    /**
     * Remove all listeners.
     */
    clear(): void;
    /**
     * Get listener count for an event type (or total if unspecified).
     */
    listenerCount(eventType?: AgentEvent['type']): number;
    /**
     * Check if there are any listeners.
     */
    get hasListeners(): boolean;
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
}
/**
 * Create a simple console logger emitter.
 * Logs events to console when verbose is true.
 */
export declare function createConsoleLogger(verbose?: boolean): EventEmitter;
//# sourceMappingURL=event-emitter.d.ts.map