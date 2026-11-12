// SPDX-License-Identifier: Apache-2.0
/**
 * Telemetry - Anonymous usage statistics (opt-in)
 *
 * This module provides a simple telemetry system for collecting
 * anonymous usage statistics to help improve the product.
 *
 * Features:
 * - Event-based collection
 * - Rate limiting
 * - Privacy-focused (no PII)
 * - Opt-in only
 */

// No external EventEmitter dependency - use internal simple implementation

// Telemetry event types
export type TelemetryEvent =
  | 'agent.start'
  | 'agent.stop'
  | 'agent.error'
  | 'tool.executed'
  | 'tool.error'
  | 'session.created'
  | 'session.loaded'
  | 'session.saved'
  | 'model.selected'
  | 'compaction.run'
  | 'extension.loaded'
  | 'command.used';

export interface TelemetryPayload {
  event: TelemetryEvent;
  timestamp: number;
  sessionId?: string;
  properties: Record<string, unknown>;
}

/**
 * Telemetry configuration
 */
export interface TelemetryConfig {
  /** Whether telemetry is enabled (default: false) */
  enabled?: boolean;
  /** Endpoint URL (for future remote reporting) */
  endpoint?: string;
  /** Rate limit in milliseconds between events (default: 5000) */
  rateLimitMs?: number;
  /** Callback for when telemetry would be sent (for debugging) */
  onEvent?: (payload: TelemetryPayload) => void;
}

const DEFAULT_RATE_LIMIT_MS = 5000;

/**
 * Telemetry singleton
 */
export class Telemetry {
  private enabled = false;
  private endpoint = '';
  private rateLimitMs = DEFAULT_RATE_LIMIT_MS;
  private lastSent = 0;
  private onEventCallback?: (payload: TelemetryPayload) => void;
  private queue: TelemetryPayload[] = [];
  private listeners = new Set<(payload: TelemetryPayload) => void>();

  constructor(config: TelemetryConfig = {}) {
    this.enabled = config.enabled ?? false;
    this.endpoint = config.endpoint ?? '';
    this.rateLimitMs = config.rateLimitMs ?? DEFAULT_RATE_LIMIT_MS;
    this.onEventCallback = config.onEvent;
  }

  /**
   * Enable or disable telemetry
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if telemetry is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Track an event.
   *
   * Events that arrive inside the rate-limit window are queued and sent once the
   * window elapses (or on flush()). The queue used to be drained from send()
   * itself, but send() refreshes lastSent first, so the drain condition was
   * always false - and the queue was then cleared anyway, silently discarding
   * every rate-limited event.
   */
  track(event: TelemetryEvent, properties: Record<string, unknown> = {}): void {
    if (!this.enabled) return;

    this.queue.push({ event, timestamp: Date.now(), properties });
    this.drainQueue();
  }

  /**
   * Track event with session context.
   *
   * The session id travels inside `properties` (the payload shape has no
   * top-level field), which is also what emit() forwards.
   */
  trackWithSession(
    event: TelemetryEvent,
    sessionId: string,
    properties: Record<string, unknown> = {}
  ): void {
    this.track(event, { ...properties, sessionId });
  }

  /** Send at most one queued event, and only when the rate window has elapsed. */
  private drainQueue(): void {
    const now = Date.now();
    if (now - this.lastSent < this.rateLimitMs) return;
    const next = this.queue.shift();
    if (!next) return;
    this.send(next);
  }

  /**
   * Send telemetry event
   */
  private send(payload: TelemetryPayload): void {
    this.lastSent = Date.now();

    // Call callback (for debugging or custom handling)
    if (this.onEventCallback) {
      try {
        this.onEventCallback(payload);
      } catch {
        // Ignore
      }
    }

    // Notify listeners
    for (const listener of this.listeners) {
      try {
        listener(payload);
      } catch {
        // Ignore
      }
    }
  }

  /**
   * Subscribe to telemetry events
   */
  on(listener: (payload: TelemetryPayload) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Emit a telemetry event (alias for track)
   *
   * The payload's sessionId is forwarded into properties; dropping it (as this
   * did) lost the only session context on the event.
   */
  emit(payload: TelemetryPayload): void {
    const properties = payload.sessionId !== undefined
      ? { ...payload.properties, sessionId: payload.sessionId }
      : payload.properties;
    this.track(payload.event, properties);
  }

  /**
   * Flush pending queued events immediately
   */
  flush(): void {
    if (this.queue.length === 0) return;
    const now = Date.now();
    for (const payload of this.queue) {
      this.send({ ...payload, timestamp: now });
    }
    this.queue = [];
  }

  /**
   * Get queued events count
   */
  getQueueSize(): number {
    return this.queue.length;
  }
}

// Global singleton instance
let globalTelemetry: Telemetry | null = null;

/**
 * Get or create global telemetry instance
 */
export function getTelemetry(config?: TelemetryConfig): Telemetry {
  if (!globalTelemetry) {
    globalTelemetry = new Telemetry(config);
  }
  return globalTelemetry;
}

/**
 * Set global telemetry instance (for testing)
 */
export function setTelemetry(telemetry: Telemetry): void {
  globalTelemetry = telemetry;
}

/**
 * Track an event using global telemetry
 */
export function track(event: TelemetryEvent, properties?: Record<string, unknown>): void {
  getTelemetry().track(event, properties);
}

/**
 * Create decorator for automatic telemetry on methods
 */
export function telemetryMethod(
  eventName: TelemetryEvent,
  options: { trackSuccess?: boolean; trackError?: boolean } = {}
) {
  return function <T extends (...args: any[]) => any>(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const telemetry = getTelemetry();

    descriptor.value = async function (...args: any[]): Promise<any> {
      const startTime = Date.now();
      try {
        const result = await originalMethod.apply(this, args);
        if (options.trackSuccess !== false) {
          telemetry.track(eventName, {
            duration: Date.now() - startTime,
            success: true,
          });
        }
        return result;
      } catch (error: any) {
        if (options.trackError !== false) {
          telemetry.track(eventName, {
            duration: Date.now() - startTime,
            success: false,
            error: error?.message,
            errorType: error?.name,
          });
        }
        throw error;
      }
    };

    return descriptor;
  };
}
