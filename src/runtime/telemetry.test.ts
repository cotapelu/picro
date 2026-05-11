// SPDX-License-Identifier: Apache-2.0
/**
 * Unit tests for Telemetry.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Telemetry, setTelemetry, getTelemetry } from './telemetry';

describe('Telemetry', () => {
  beforeEach(() => {
    // Reset global telemetry between tests
    setTelemetry(new Telemetry({ enabled: false }));
  });

  it('should not emit when disabled', () => {
    const telemetry = getTelemetry();
    const listener = vi.fn();
    telemetry.on(listener);
    telemetry.track('agent.start');
    expect(listener).not.toHaveBeenCalled();
  });

  it('should emit when enabled', () => {
    const telemetry = new Telemetry({ enabled: true });
    setTelemetry(telemetry);
    const listener = vi.fn();
    telemetry.on(listener);
    telemetry.track('agent.start', { foo: 'bar' });
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'agent.start', properties: { foo: 'bar' } })
    );
  });

  it('should queue events when rate limited', () => {
    const telemetry = new Telemetry({ enabled: true, rateLimitMs: 1000 });
    setTelemetry(telemetry);
    const listener = vi.fn();
    telemetry.on(listener);

    telemetry.track('agent.start', {}); // first sent immediately
    telemetry.track('tool.executed', {}); // second within limit -> queued

    expect(listener).toHaveBeenCalledTimes(1);
    expect(telemetry.getQueueSize()).toBe(1);
  });
});
