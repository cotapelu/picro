// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi } from 'vitest';
import { Telemetry, getTelemetry, setTelemetry, track as globalTrack, telemetryMethod } from './telemetry.js';

describe('Telemetry', () => {
  let telemetry: Telemetry;

  beforeEach(() => {
    telemetry = new Telemetry();
  });

  it('default disabled', () => {
    expect(telemetry.isEnabled()).toBe(false);
  });

  it('setEnabled toggles', () => {
    telemetry.setEnabled(true);
    expect(telemetry.isEnabled()).toBe(true);
    telemetry.setEnabled(false);
    expect(telemetry.isEnabled()).toBe(false);
  });

  it('track does nothing when disabled', () => {
    telemetry.track('agent.start');
    expect(telemetry['queue']).toHaveLength(0);
  });

  it('track enqueues when rate limited', () => {
    telemetry.setEnabled(true);
    telemetry['lastSent'] = Date.now(); // now, rate limited
    telemetry.track('event');
    expect(telemetry['queue']).toHaveLength(1);
  });

  it('can subscribe and receive events', () => {
    telemetry = new Telemetry({ enabled: true });
    const listener = vi.fn();
    telemetry.on(listener);

    telemetry.track('session.created');

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'session.created' })
    );
  });

  it('unsubscribe works', () => {
    telemetry = new Telemetry({ enabled: true });
    const listener = vi.fn();
    const off = telemetry.on(listener);
    off();
    telemetry.track('agent.start');
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('Telemetry global', () => {
  let original: Telemetry;

  beforeEach(() => {
    original = getTelemetry();
    const t = new Telemetry({ enabled: true });
    setTelemetry(t);
  });

  afterEach(() => {
    setTelemetry(original);
  });

  it('getTelemetry returns singleton', () => {
    const t1 = getTelemetry();
    const t2 = getTelemetry();
    expect(t1).toBe(t2);
  });

  it('setTelemetry replaces singleton', () => {
    const t1 = getTelemetry();
    const t2 = new Telemetry({ enabled: true });
    setTelemetry(t2);
    expect(getTelemetry()).toBe(t2);
    expect(getTelemetry()).not.toBe(t1);
  });

  it('track function uses global telemetry', () => {
    const t = getTelemetry();
    const listener = vi.fn();
    t.on(listener);
    globalTrack('agent.start', { foo: 'bar' });
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'agent.start', properties: { foo: 'bar' } })
    );
  });
});

describe('Telemetry advanced', () => {
  let telemetry: Telemetry;

  beforeEach(() => {
    telemetry = new Telemetry({ enabled: true });
  });

  it('trackWithSession includes sessionId', () => {
    const listener = vi.fn();
    telemetry.on(listener);
    telemetry.trackWithSession('session.created', 'sid-123');
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'session.created',
        properties: expect.objectContaining({ sessionId: 'sid-123' }),
      })
    );
  });

  it('emit is alias for track', () => {
    const listener = vi.fn();
    telemetry.on(listener);
    telemetry.emit({ event: 'agent.start', timestamp: Date.now(), properties: {} });
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'agent.start' })
    );
  });

  it('getQueueSize returns queue length', () => {
    expect(telemetry.getQueueSize()).toBe(0);
    // Force rate limit to enqueue
    telemetry['lastSent'] = Date.now();
    telemetry.track('e1');
    telemetry.track('e2');
    expect(telemetry.getQueueSize()).toBe(2);
  });

  it('flush sends queued events', () => {
    // Force enqueue some events
    telemetry['lastSent'] = Date.now();
    telemetry.track('e1');
    telemetry.track('e2');
    expect(telemetry.getQueueSize()).toBe(2);
    // Use a listener to capture sent events
    const listener = vi.fn();
    telemetry.on(listener);
    telemetry.flush();
    expect(telemetry.getQueueSize()).toBe(0);
    // listener should have been called twice (for e1 and e2)
    expect(listener).toHaveBeenCalledTimes(2);
    // Check order
    expect(listener).toHaveBeenNthCalledWith(1, expect.objectContaining({ event: 'e1' }));
    expect(listener).toHaveBeenNthCalledWith(2, expect.objectContaining({ event: 'e2' }));
  });
});

describe('telemetryMethod decorator', () => {
  let originalTelemetry: Telemetry;

  beforeEach(() => {
    originalTelemetry = getTelemetry();
    const t = new Telemetry({ enabled: true });
    setTelemetry(t);
  });

  afterEach(() => {
    setTelemetry(originalTelemetry);
  });

  it('tracks success with duration on successful call', async () => {
    const trackSpy = vi.spyOn(getTelemetry(), 'track');
    const original = async (x: number) => x * 2;
    const descriptor = { value: original };
    telemetryMethod('test.event')(null as any, 'method', descriptor);
    const fn = descriptor.value as any;
    const result = await fn(5);
    expect(result).toBe(10);
    expect(trackSpy).toHaveBeenCalledWith('test.event', expect.objectContaining({ success: true, duration: expect.any(Number) }));
  });

  it('tracks error when method throws', async () => {
    const trackSpy = vi.spyOn(getTelemetry(), 'track');
    const original = async () => { throw new Error('fail'); };
    const descriptor = { value: original };
    telemetryMethod('test.error')(null as any, 'method', descriptor);
    const fn = descriptor.value as any;
    await expect(fn()).rejects.toThrow('fail');
    expect(trackSpy).toHaveBeenCalledWith('test.error', expect.objectContaining({ success: false, error: 'fail', errorType: 'Error' }));
  });

  it('respects options.trackSuccess = false to suppress success tracking', async () => {
    const trackSpy = vi.spyOn(getTelemetry(), 'track');
    const original = async () => 42;
    const descriptor = { value: original };
    telemetryMethod('test.suppress', { trackSuccess: false })(null as any, 'method', descriptor);
    const fn = descriptor.value as any;
    await fn();
    expect(trackSpy).not.toHaveBeenCalled();
  });

  it('respects options.trackError = false to suppress error tracking', async () => {
    const trackSpy = vi.spyOn(getTelemetry(), 'track');
    const original = async () => { throw new Error('oops'); };
    const descriptor = { value: original };
    telemetryMethod('test.suppressErr', { trackError: false })(null as any, 'method', descriptor);
    const fn = descriptor.value as any;
    await expect(fn()).rejects.toThrow('oops');
    expect(trackSpy).not.toHaveBeenCalled();
  });
});
