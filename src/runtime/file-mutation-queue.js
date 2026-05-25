// SPDX-License-Identifier: Apache-2.0
/**
 * File Mutation Queue - Sequential execution for file write/edit operations
 * Moved from agent/ to runtime/ as it's not core agent logic.
 */
/**
 * FileMutationQueue manages sequential file mutations.
 * Operations are executed in FIFO order.
 */
export class FileMutationQueue {
    queue = [];
    processing = false;
    options;
    listeners = new Map();
    errorListeners = new Map();
    constructor(options = {}) {
        this.options = {
            concurrency: 1,
            ...options,
        };
    }
    /**
     * Subscribe to mutation events
     */
    on(event, handler) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(handler);
        return () => this.listeners.get(event)?.delete(handler);
    }
    /**
     * Subscribe to error events
     */
    onError(handler) {
        if (!this.errorListeners.has("error")) {
            this.errorListeners.set("error", new Set());
        }
        this.errorListeners.get("error").add(handler);
        return () => this.errorListeners.get("error")?.delete(handler);
    }
    /**
     * Emit event to listeners
     */
    emit(event, mutation, error) {
        const set = event === "error" ? this.errorListeners.get("error") : this.listeners.get(event);
        if (set) {
            for (const handler of set) {
                try {
                    if (error !== undefined) {
                        handler(mutation, error);
                    }
                    else if (mutation) {
                        handler(mutation);
                    }
                }
                catch {
                    // ignore
                }
            }
        }
    }
    /**
     * Enqueue a mutation operation
     */
    async enqueue(mutation) {
        const id = `mutation-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const fullMutation = {
            ...mutation,
            id,
            queuedAt: Date.now(),
        };
        this.queue.push(fullMutation);
        this.emit("enqueued", fullMutation);
        if (!this.processing) {
            this._processQueue();
        }
        // Wait for completion
        await new Promise((resolve, reject) => {
            const checkDone = () => {
                const index = this.queue.findIndex(m => m.id === id);
                if (index === -1) {
                    resolve();
                }
                else {
                    setTimeout(checkDone, 10);
                }
            };
            checkDone();
        });
    }
    /**
     * Process the queue sequentially
     */
    async _processQueue() {
        if (this.processing || this.queue.length === 0) {
            return;
        }
        this.processing = true;
        while (this.queue.length > 0) {
            const mutation = this.queue.shift();
            this.emit("start", mutation);
            try {
                await mutation.operation();
                this.emit("complete", mutation);
            }
            catch (error) {
                this.emit("error", mutation, error);
                // Continue processing remaining mutations despite error
            }
        }
        this.processing = false;
    }
    /**
     * Get current queue length
     */
    get length() {
        return this.queue.length;
    }
    /**
     * Clear all pending mutations
     */
    clear() {
        const cleared = this.queue.splice(0);
        for (const m of cleared) {
            this.emit("cancelled", m);
        }
    }
    /**
     * Wait until queue is empty
     */
    async waitForEmpty() {
        while (this.queue.length > 0 || this.processing) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }
}
