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
const DEFAULT_RATE_LIMIT_MS = 5000;
/**
 * Telemetry singleton
 */
export class Telemetry {
    enabled = false;
    endpoint = '';
    rateLimitMs = DEFAULT_RATE_LIMIT_MS;
    lastSent = 0;
    onEventCallback;
    queue = [];
    listeners = new Set();
    constructor(config = {}) {
        this.enabled = config.enabled ?? false;
        this.endpoint = config.endpoint ?? '';
        this.rateLimitMs = config.rateLimitMs ?? DEFAULT_RATE_LIMIT_MS;
        this.onEventCallback = config.onEvent;
    }
    /**
     * Enable or disable telemetry
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }
    /**
     * Check if telemetry is enabled
     */
    isEnabled() {
        return this.enabled;
    }
    /**
     * Track an event
     */
    track(event, properties = {}) {
        if (!this.enabled)
            return;
        const now = Date.now();
        if (now - this.lastSent < this.rateLimitMs) {
            // Rate limited - queue for later
            this.queue.push({ event, timestamp: now, properties });
            return;
        }
        this.send({ event, timestamp: now, properties });
    }
    /**
     * Track event with session context
     */
    trackWithSession(event, sessionId, properties = {}) {
        this.track(event, { ...properties, sessionId });
    }
    /**
     * Send telemetry event
     */
    send(payload) {
        this.lastSent = Date.now();
        // Call callback (for debugging or custom handling)
        if (this.onEventCallback) {
            try {
                this.onEventCallback(payload);
            }
            catch {
                // Ignore
            }
        }
        // Notify listeners
        for (const listener of this.listeners) {
            try {
                listener(payload);
            }
            catch {
                // Ignore
            }
        }
        // Flush queue
        if (this.queue.length > 0) {
            const now = Date.now();
            for (const queued of this.queue) {
                if (now - this.lastSent >= this.rateLimitMs) {
                    this.send({ ...queued, timestamp: now });
                }
            }
            this.queue = [];
        }
    }
    /**
     * Subscribe to telemetry events
     */
    on(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    /**
     * Emit a telemetry event (alias for track)
     */
    emit(payload) {
        this.track(payload.event, payload.properties);
    }
    /**
     * Flush pending queued events immediately
     */
    flush() {
        if (this.queue.length === 0)
            return;
        const now = Date.now();
        for (const payload of this.queue) {
            this.send({ ...payload, timestamp: now });
        }
        this.queue = [];
    }
    /**
     * Get queued events count
     */
    getQueueSize() {
        return this.queue.length;
    }
}
// Global singleton instance
let globalTelemetry = null;
/**
 * Get or create global telemetry instance
 */
export function getTelemetry(config) {
    if (!globalTelemetry) {
        globalTelemetry = new Telemetry(config);
    }
    return globalTelemetry;
}
/**
 * Set global telemetry instance (for testing)
 */
export function setTelemetry(telemetry) {
    globalTelemetry = telemetry;
}
/**
 * Track an event using global telemetry
 */
export function track(event, properties) {
    getTelemetry().track(event, properties);
}
/**
 * Create decorator for automatic telemetry on methods
 */
export function telemetryMethod(eventName, options = {}) {
    return function (target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        const telemetry = getTelemetry();
        descriptor.value = async function (...args) {
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
            }
            catch (error) {
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
//# sourceMappingURL=telemetry.js.map