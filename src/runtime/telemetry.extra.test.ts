import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Telemetry, getTelemetry, setTelemetry } from './telemetry.js';

describe('Telemetry extra', () => {
  let original: Telemetry;

  beforeEach(() => {
    original = getTelemetry();
  });

  afterEach(() => {
    setTelemetry(original);
  });

  it('flush does nothing when disabled', () => {
    const telemetry = new Telemetry({ enabled: false });
    telemetry.flush();
    expect(telemetry.getQueueSize()).toBe(0);
  });

  it('flush clears queue even if a listener throws', () => {
    const telemetry = new Telemetry({ enabled: true });
    // Force rate limit to enqueue events
    telemetry['lastSent'] = Date.now();
    telemetry.track('e1');
    telemetry.track('e2');
    expect(telemetry.getQueueSize()).toBe(2);
    const badListener = vi.fn(() => { throw new Error('listener error'); });
    telemetry.on(badListener);
    // flush should handle errors gracefully and still clear queue
    telemetry.flush();
    expect(telemetry.getQueueSize()).toBe(0);
  });

  it('setEnabled(false) retains queue and blocks further enqueue', () => {
    const telemetry = new Telemetry({ enabled: true });
    // Force enqueue
    telemetry['lastSent'] = Date.now();
    telemetry.track('e1');
    telemetry.track('e2');
    expect(telemetry.getQueueSize()).toBe(2);
    telemetry.setEnabled(false);
    // queue should remain
    expect(telemetry.getQueueSize()).toBe(2);
    // further track should be no-op when disabled
    telemetry.track('e3');
    expect(telemetry.getQueueSize()).toBe(2);
  });
});
