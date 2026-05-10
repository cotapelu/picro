// SPDX-License-Identifier: Apache-2.0
/**
 * PrioritizedEventEmitter - Event emitter with priority queues and buffering
 *
 * Extends EventEmitter with:
 * - Event type prioritization (critical, high, normal, low)
 * - Buffering to handle high-throughput scenarios
 * - Optional dropping of low-priority events when buffer full
 */

import type { AgentEvent } from './events';

type EventHandler = (event: AgentEvent) => Promise<void> | void;

// Priority levels
const PRIORITY = {
  CRITICAL: 3,
  HIGH: 2,
  NORMAL: 1,
  LOW: 0,
} as const;

// Default priority mapping (can be extended)
const DEFAULT_PRIORITIES: Record<string, number> = {
  // Critical
  'error': PRIORITY.CRITICAL,
  'tool:error': PRIORITY.CRITICAL,
  // High
  'agent:start': PRIORITY.HIGH,
  'agent:end': PRIORITY.HIGH,
  'session_start': PRIORITY.HIGH,
  'session_shutdown': PRIORITY.HIGH,
  // Normal
  'turn:start': PRIORITY.NORMAL,
  'turn:end': PRIORITY.NORMAL,
  'message:start': PRIORITY.NORMAL,
  'message:end': PRIORITY.NORMAL,
  'tool:call:start': PRIORITY.NORMAL,
  'tool:call:end': PRIORITY.NORMAL,
  'memory:retrieve': PRIORITY.NORMAL,
  // Low
  'queue_update': PRIORITY.LOW,
  'compaction_start': PRIORITY.LOW,
  'compaction_end': PRIORITY.LOW,
  'auto_retry_start': PRIORITY.LOW,
  'auto_retry_end': PRIORITY.LOW,
};

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
export class PrioritizedEventEmitter {
  private typedListeners: Map<string, Set<EventHandler>> = new Map();
  private globalListeners: Set<EventHandler> = new Set();
  private eventMetrics: Map<string, { count: number; totalDurationNs: bigint }> = new Map();

  // Priority queues: index = priority (0=LOW, 1=NORMAL, 2=HIGH, 3=CRITICAL)
  private queues: Array<Array<{ event: AgentEvent }>> = [[], [], [], []];
  private processing = false;
  private droppedCount = 0;

  private readonly maxBufferSize: number;
  private readonly dropLowPriorityWhenFull: boolean;
  private readonly priorities: Record<string, number>;

  constructor(options: PrioritizedEventEmitterOptions = {}) {
    this.maxBufferSize = options.maxBufferSize ?? 1000;
    this.dropLowPriorityWhenFull = options.dropLowPriorityWhenFull ?? true;
    this.priorities = { ...DEFAULT_PRIORITIES, ...options.priorityOverrides };
  }

  /**
   * Get priority for event type
   */
  private getPriority(eventType: string): number {
    return this.priorities[eventType] ?? PRIORITY.NORMAL;
  }

  /**
   * Subscribe to a specific event type.
   */
  on<K extends AgentEvent['type']>(
    eventType: K,
    handler: (event: Extract<AgentEvent, { type: K }>) => Promise<void> | void
  ): () => void {
    const typedHandler = handler as EventHandler;
    if (!this.typedListeners.has(eventType)) {
      this.typedListeners.set(eventType, new Set());
    }
    this.typedListeners.get(eventType)!.add(typedHandler);
    return () => {
      this.typedListeners.get(eventType)?.delete(typedHandler);
    };
  }

  /**
   * Subscribe to all events.
   */
  onAny(handler: (event: AgentEvent) => Promise<void> | void): () => void {
    this.globalListeners.add(handler);
    return () => this.globalListeners.delete(handler);
  }

  /**
   * Unsubscribe from a specific event type.
   */
  off<K extends AgentEvent['type']>(
    eventType: K,
    handler: (event: Extract<AgentEvent, { type: K }>) => Promise<void> | void
  ): void {
    const typedHandler = handler as EventHandler;
    this.typedListeners.get(eventType)?.delete(typedHandler);
  }

  /**
   * Unsubscribe from all events.
   */
  offAny(handler: (event: AgentEvent) => Promise<void> | void): void {
    this.globalListeners.delete(handler);
  }

  /**
   * Emit an event (non-blocking, queued).
   */
  async emit(event: AgentEvent): Promise<void> {
    const priority = this.getPriority(event.type);
    const queue = this.queues[priority];

    // Check buffer limits
    if (this.maxBufferSize > 0 && queue.length >= this.maxBufferSize) {
      if (this.dropLowPriorityWhenFull && priority < PRIORITY.HIGH) {
        this.droppedCount++;
        return; // Drop low-priority event
      } else {
        // Wait for space (simple backpressure)
        await new Promise(resolve => setTimeout(resolve, 10));
        return this.emit(event); // retry
      }
    }

    queue.push({ event });

    if (!this.processing) {
      this._processQueue();
    }
  }

  /**
   * Process queued events in priority order.
   */
  private async _processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      // Process from highest to lowest priority
      for (let p = PRIORITY.CRITICAL; p >= PRIORITY.LOW; p--) {
        const queue = this.queues[p];
        while (queue.length > 0) {
          const item = queue.shift()!;
          await this._emitInternal(item.event);
        }
      }
    } finally {
      this.processing = false;
      // If new events arrived during processing, continue
      const totalRemaining = this.queues.reduce((sum, q) => sum + q.length, 0);
      if (totalRemaining > 0) {
        this._processQueue();
      }
    }
  }

  /**
   * Internal emit without queuing.
   */
  private async _emitInternal(event: AgentEvent): Promise<void> {
    const start = process.hrtime.bigint();
    const handlers: Promise<void>[] = [];

    // Type-specific listeners
    const typeSet = this.typedListeners.get(event.type);
    if (typeSet) {
      for (const handler of typeSet) {
        handlers.push(Promise.resolve(handler(event)));
      }
    }

    // Global listeners
    for (const handler of this.globalListeners) {
      handlers.push(Promise.resolve(handler(event)));
    }

    await Promise.all(handlers);

    const durationNs = process.hrtime.bigint() - start;
    const existing = this.eventMetrics.get(event.type) ?? { count: 0, totalDurationNs: 0n };
    this.eventMetrics.set(event.type, { count: existing.count + 1, totalDurationNs: existing.totalDurationNs + durationNs });
  }

  /**
   * Get event emission metrics.
   */
  getEventMetrics(): Map<string, { count: number; avgDurationMs: number }> {
    const result = new Map<string, { count: number; avgDurationMs: number }>();
    for (const [type, data] of this.eventMetrics) {
      const avgMs = data.count > 0 ? Number(data.totalDurationNs) / data.count / 1e6 : 0;
      result.set(type, { count: data.count, avgDurationMs: avgMs });
    }
    return result;
  }

  /**
   * Clear event metrics.
   */
  clearMetrics(): void {
    this.eventMetrics.clear();
  }

  /**
   * Get dropped event count.
   */
  getDroppedCount(): number {
    return this.droppedCount;
  }

  /**
   * Get current queue lengths per priority.
   */
  getQueueLengths(): { low: number; normal: number; high: number; critical: number } {
    return {
      low: this.queues[PRIORITY.LOW].length,
      normal: this.queues[PRIORITY.NORMAL].length,
      high: this.queues[PRIORITY.HIGH].length,
      critical: this.queues[PRIORITY.CRITICAL].length,
    };
  }

  /**
   * Clear all pending events.
   */
  clear(): void {
    this.queues.forEach(q => q.length = 0);
    this.droppedCount = 0;
  }
}
