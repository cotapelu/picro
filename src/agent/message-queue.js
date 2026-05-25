// SPDX-License-Identifier: Apache-2.0
/**
 * Message queue for pending conversation turns.
 * Different implementation: uses array with head index for efficient dequeue.
 */
/**
 * Efficient message queue using circular buffer pattern.
 * Internal array never shrinks, uses head index for O(1) dequeue.
 */
export class MessageQueue {
    storage = [];
    head = 0;
    mode;
    maxSize;
    constructor(mode = 'dequeue-one', maxSize) {
        this.mode = mode;
        this.maxSize = maxSize;
    }
    /**
     * Add a message to the queue.
     */
    enqueue(turn) {
        // Evict oldest entries if at capacity
        if (this.maxSize !== undefined) {
            while (this.size >= this.maxSize && this.head < this.storage.length) {
                this.head++; // drop oldest
            }
            // Compress storage nếu head lớn (tránh memory leak từ never-cleared array)
            if (this.head > 1000) {
                this.storage = this.storage.slice(this.head);
                this.head = 0;
            }
        }
        this.storage.push(turn);
    }
    /**
     * Check if queue has pending messages.
     */
    get hasPending() {
        return this.head < this.storage.length;
    }
    /**
     * Get number of pending messages.
     */
    get size() {
        return this.storage.length - this.head;
    }
    /**
     * Dequeue a single message (FIFO).
     */
    dequeue() {
        if (!this.hasPending) {
            return null;
        }
        const turn = this.storage[this.head];
        this.head++;
        return turn;
    }
    /**
     * Drain all pending messages and clear the queue.
     */
    drainAll() {
        if (!this.hasPending) {
            return [];
        }
        const pending = this.storage.slice(this.head);
        this.head = this.storage.length; // Mark all as consumed
        return pending;
    }
    /**
     * Change queue processing mode.
     */
    setMode(mode) {
        this.mode = mode;
    }
    /**
     * Get current mode.
     */
    getMode() {
        return this.mode;
    }
    /**
     * Clear all pending messages.
     */
    clear() {
        this.storage = [];
        this.head = 0;
    }
    /**
     * Reset queue to initial state, clearing all messages.
     */
    reset() {
        this.storage = [];
        this.head = 0;
    }
    /**
     * Get a snapshot of pending messages without removing them.
     */
    peek() {
        return this.storage.slice(this.head);
    }
}
