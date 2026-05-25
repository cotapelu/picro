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
export type TelemetryEvent = 'agent.start' | 'agent.stop' | 'agent.error' | 'tool.executed' | 'tool.error' | 'session.created' | 'session.loaded' | 'session.saved' | 'model.selected' | 'compaction.run' | 'extension.loaded' | 'command.used';
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
/**
 * Telemetry singleton
 */
export declare class Telemetry {
    private enabled;
    private endpoint;
    private rateLimitMs;
    private lastSent;
    private onEventCallback?;
    private queue;
    private listeners;
    constructor(config?: TelemetryConfig);
    /**
     * Enable or disable telemetry
     */
    setEnabled(enabled: boolean): void;
    /**
     * Check if telemetry is enabled
     */
    isEnabled(): boolean;
    /**
     * Track an event
     */
    track(event: TelemetryEvent, properties?: Record<string, unknown>): void;
    /**
     * Track event with session context
     */
    trackWithSession(event: TelemetryEvent, sessionId: string, properties?: Record<string, unknown>): void;
    /**
     * Send telemetry event
     */
    private send;
    /**
     * Subscribe to telemetry events
     */
    on(listener: (payload: TelemetryPayload) => void): () => void;
    /**
     * Emit a telemetry event (alias for track)
     */
    emit(payload: TelemetryPayload): void;
    /**
     * Flush pending queued events immediately
     */
    flush(): void;
    /**
     * Get queued events count
     */
    getQueueSize(): number;
}
/**
 * Get or create global telemetry instance
 */
export declare function getTelemetry(config?: TelemetryConfig): Telemetry;
/**
 * Set global telemetry instance (for testing)
 */
export declare function setTelemetry(telemetry: Telemetry): void;
/**
 * Track an event using global telemetry
 */
export declare function track(event: TelemetryEvent, properties?: Record<string, unknown>): void;
/**
 * Create decorator for automatic telemetry on methods
 */
export declare function telemetryMethod(eventName: TelemetryEvent, options?: {
    trackSuccess?: boolean;
    trackError?: boolean;
}): <T extends (...args: any[]) => any>(target: any, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
//# sourceMappingURL=telemetry.d.ts.map