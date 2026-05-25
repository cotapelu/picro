/**
 * Message queue for pending conversation turns.
 * Different implementation: uses array with head index for efficient dequeue.
 */
import type { ConversationTurn } from './types.js';
export type QueueMode = 'drain-all' | 'dequeue-one';
/**
 * Efficient message queue using circular buffer pattern.
 * Internal array never shrinks, uses head index for O(1) dequeue.
 */
export declare class MessageQueue {
    private storage;
    private head;
    private mode;
    private maxSize?;
    constructor(mode?: QueueMode, maxSize?: number);
    /**
     * Add a message to the queue.
     */
    enqueue(turn: ConversationTurn): void;
    /**
     * Check if queue has pending messages.
     */
    get hasPending(): boolean;
    /**
     * Get number of pending messages.
     */
    get size(): number;
    /**
     * Dequeue a single message (FIFO).
     */
    dequeue(): ConversationTurn | null;
    /**
     * Drain all pending messages and clear the queue.
     */
    drainAll(): ConversationTurn[];
    /**
     * Change queue processing mode.
     */
    setMode(mode: QueueMode): void;
    /**
     * Get current mode.
     */
    getMode(): QueueMode;
    /**
     * Clear all pending messages.
     */
    clear(): void;
    /**
     * Reset queue to initial state, clearing all messages.
     */
    reset(): void;
    /**
     * Get a snapshot of pending messages without removing them.
     */
    peek(): ConversationTurn[];
}
//# sourceMappingURL=message-queue.d.ts.map