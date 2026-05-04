// SPDX-License-Identifier: Apache-2.0
/**
 * File Mutation Queue - Sequential execution for file write/edit operations
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
export class FileMutationQueue {
  private queue: FileMutation[] = [];
  private processing = false;
  private options: FileMutationQueueOptions;
  private listeners: Map<string, Set<Function>> = new Map();
  private errorListeners: Map<string, Set<Function>> = new Map();

  constructor(options: FileMutationQueueOptions = {}) {
    this.options = {
      concurrency: 1,
      ...options,
    };
  }

  /**
   * Subscribe to mutation events
   */
  on(event: "enqueued" | "start" | "complete" | "cancelled", handler: MutationListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => this.listeners.get(event)?.delete(handler);
  }

  /**
   * Subscribe to error events
   */
  onError(handler: MutationErrorListener): () => void {
    if (!this.errorListeners.has("error")) {
      this.errorListeners.set("error", new Set());
    }
    this.errorListeners.get("error")!.add(handler);
    return () => this.errorListeners.get("error")?.delete(handler);
  }

  /**
   * Emit event to listeners
   */
  private emit(event: string, mutation?: FileMutation, error?: unknown): void {
    const set = event === "error" ? this.errorListeners.get("error") : this.listeners.get(event);
    if (set) {
      for (const handler of set) {
        try {
          if (error !== undefined) {
            (handler as MutationErrorListener)(mutation!, error);
          } else if (mutation) {
            (handler as MutationListener)(mutation);
          }
        } catch {
          // ignore
        }
      }
    }
  }

  /**
   * Enqueue a mutation operation
   */
  async enqueue(mutation: Omit<FileMutation, "id" | "queuedAt">): Promise<void> {
    const id = `mutation-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const fullMutation: FileMutation = {
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
    await new Promise<void>((resolve, reject) => {
      const checkDone = () => {
        const index = this.queue.findIndex(m => m.id === id);
        if (index === -1) {
          resolve();
        } else {
          setTimeout(checkDone, 10);
        }
      };
      checkDone();
    });
  }

  /**
   * Process the queue sequentially
   */
  private async _processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const mutation = this.queue.shift()!;
      this.emit("start", mutation);

      try {
        await mutation.operation();
        this.emit("complete", mutation);
      } catch (error) {
        this.emit("error", mutation, error);
        // Continue processing remaining mutations despite error
      }
    }

    this.processing = false;
  }

  /**
   * Get current queue length
   */
  get length(): number {
    return this.queue.length;
  }

  /**
   * Clear all pending mutations
   */
  clear(): void {
    const cleared = this.queue.splice(0);
    for (const m of cleared) {
      this.emit("cancelled", m);
    }
  }

  /**
   * Wait until queue is empty
   */
  async waitForEmpty(): Promise<void> {
    while (this.queue.length > 0 || this.processing) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
}
