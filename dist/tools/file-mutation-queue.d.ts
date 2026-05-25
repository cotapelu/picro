/**
 * FileMutationQueue - Queue file edits, apply atomically, rollback on failure
 *
 * Features:
 * - Queue multiple edits across multiple files
 * - Apply all mutations atomically (all-or-nothing)
 * - Rollback on failure (restore original state)
 */
export interface FileMutation {
    path: string;
    oldText: string;
    newText: string;
}
export interface QueuedMutation {
    path: string;
    oldContent: string;
    newContent: string;
    applied: boolean;
}
/**
 * FileMutationQueue - queues edits and applies them atomically
 */
export declare class FileMutationQueue {
    private mutations;
    private snapshots;
    private cwd;
    constructor(cwd?: string);
    /**
     * Add a mutation to the queue
     */
    queueEdit(mutation: FileMutation): Promise<void>;
    /**
     * Apply all queued mutations atomically
     */
    applyAll(): Promise<{
        applied: number;
        files: string[];
    }>;
    /**
     * Rollback all applied mutations
     */
    rollback(): Promise<{
        rolledBack: number;
    }>;
    /**
     * Clear the queue without applying
     */
    clear(): void;
    /**
     * Get queue length
     */
    get length(): number;
    /**
     * Preview changes without applying
     */
    preview(): Array<{
        path: string;
        oldContent: string;
        newContent: string;
    }>;
}
/**
 * Helper to create mutation queue and apply edits
 */
export declare function applyMutations(mutations: FileMutation[], cwd?: string): Promise<{
    applied: number;
    files: string[];
}>;
//# sourceMappingURL=file-mutation-queue.d.ts.map