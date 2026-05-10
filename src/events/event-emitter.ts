// SPDX-License-Identifier: Apache-2.0
/**
 * Event emitter for agent lifecycle events.
 * Uses typed event handlers with async emission.
 */

import type { AgentEvent } from './events';

type EventHandler = (event: AgentEvent) => Promise<void> | void;

/**
 * Central event emitter for agent events.
 * Supports typed subscriptions and global listeners.
 */
export class EventEmitter {
  private typedListeners: Map<string, Set<EventHandler>> = new Map();
  private globalListeners: Set<EventHandler> = new Set();
  private eventMetrics: Map<string, { count: number; totalDurationNs: bigint }> = new Map();

  /**
   * Subscribe to a specific event type.
   * Returns unsubscribe function.
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
   * Emit an event to all relevant listeners.
   * Waits for all async handlers to complete.
   */
  async emit(event: AgentEvent): Promise<void> {
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
   * Emit multiple events in sequence.
   */
  async emitAll(events: AgentEvent[]): Promise<void> {
    for (const event of events) {
      await this.emit(event);
    }
  }

  /**
   * Remove all listeners.
   */
  clear(): void {
    this.typedListeners.clear();
    this.globalListeners.clear();
  }

  /**
   * Get listener count for an event type (or total if unspecified).
   */
  listenerCount(eventType?: AgentEvent['type']): number {
    if (eventType) {
      return this.typedListeners.get(eventType)?.size ?? 0;
    }
    let count = 0;
    for (const set of this.typedListeners.values()) {
      count += set.size;
    }
    return count + this.globalListeners.size;
  }

  /**
   * Check if there are any listeners.
   */
  get hasListeners(): boolean {
    if (this.globalListeners.size > 0) {
      return true;
    }
    for (const set of this.typedListeners.values()) {
      if (set.size > 0) {
        return true;
      }
    }
    return false;
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
}

/**
 * Create a simple console logger emitter.
 * Logs events to console when verbose is true.
 */
export function createConsoleLogger(verbose: boolean = true): EventEmitter {
  const emitter = new EventEmitter();

  if (verbose) {
    const formatTimestamp = (ts: number): string => {
      return new Date(ts).toISOString();
    };

    emitter.onAny((event) => {
      const time = formatTimestamp(event.timestamp);
      const roundPrefix = `[Round ${event.round}]`;

      switch (event.type) {
        case 'agent:start':
          console.log(`${time} ${roundPrefix} 🚀 Agent started: ${(event as any).initialPrompt.substring(0, 50)}...`);
          break;
        case 'agent:end':
          console.log(`${time} ${roundPrefix} ✅ Agent completed`);
          break;
        case 'turn:start':
          console.log(`${time} ${roundPrefix} 🔄 New turn (prompt: ${(event as any).promptLength} chars)`);
          break;
        case 'turn:end':
          const toolCount = (event as any).toolCallsExecuted;
          console.log(`${time} ${roundPrefix} ⏹️ Turn finished (${toolCount} tools)`);
          break;
        case 'message:start':
          const role = (event as any).turn.role;
          console.log(`${time} ${roundPrefix} 📝 Message start: ${role}`);
          break;
        case 'message:end':
          const endRole = (event as any).turn.role;
          console.log(`${time} ${roundPrefix} ✅ Message end: ${endRole}`);
          break;
        case 'tool:call:start':
          console.log(`${time} ${roundPrefix} 🔧 Tool call: ${(event as any).toolName}`);
          break;
        case 'tool:call:end':
          const result = (event as any).result as any;
          const status = result.isError ? '❌' : '✅';
          console.log(`${time} ${roundPrefix} ${status} Tool result: ${(event as any).toolName}`);
          break;
        case 'tool:error':
          console.error(`${time} ${roundPrefix} 💥 Tool error: ${(event as any).toolName} - ${(event as any).errorMessage}`);
          break;
        case 'error':
          console.error(`${time} ${roundPrefix} 💥 Error: ${(event as any).message}`);
          break;
        case 'memory:retrieve':
          console.log(`${time} ${roundPrefix} 🧠 Retrieved ${(event as any).memoriesRetrieved} memories`);
          break;
      }
    });
  }

  return emitter;
}
