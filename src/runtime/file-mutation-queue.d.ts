/**
 * File Mutation Queue - Sequential execution for file write/edit operations
 * Moved from agent/ to runtime/ as it's not core agent logic.
 */
export interface FileMutation {
    /** Unique mutation ID */
    id: string;
    /** Type of mutation */
    type: "write" | "edit";
    /** Target file path */
    path: string;
    /** Operation to execute */
    operation: () => Promise<void>;
    /** Timestamp when queued */
    queuedAt: number;
}
export interface FileMutationQueueOptions {
    /** Maximum concurrent mutations (should be 1 for sequential) */
    concurrency?: number;
}
type MutationListener = (mutation: FileMutation) => void;
type MutationErrorListener = (mutation: FileMutation, error: unknown) => void;
/**
 * FileMutationQueue manages sequential file mutations.
 * Operations are executed in FIFO order.
 */
export declare class FileMutationQueue {
    private queue;
    private processing;
    private options;
    private listeners;
    private errorListeners;
    constructor(options?: FileMutationQueueOptions);
    /**
     * Subscribe to mutation events
     */
    on(event: "enqueued" | "start" | "complete" | "cancelled", handler: MutationListener): () => void;
    /**
     * Subscribe to error events
     */
    onError(handler: MutationErrorListener): () => void;
    /**
     * Emit event to listeners
     */
    private emit;
    /**
     * Enqueue a mutation operation
     */
    enqueue(mutation: Omit<FileMutation, "id" | "queuedAt">): Promise<void>;
    /**
     * Process the queue sequentially
     */
    private _processQueue;
    /**
     * Get current queue length
     */
    get length(): number;
    /**
     * Clear all pending mutations
     */
    clear(): void;
    /**
     * Wait until queue is empty
     */
    waitForEmpty(): Promise<void>;
}
export {};
//# sourceMappingURL=file-mutation-queue.d.ts.map