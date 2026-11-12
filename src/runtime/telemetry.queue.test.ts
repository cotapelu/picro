// SPDX-License-Identifier: Apache-2.0
/**
 * Telemetry queueing.
 *
 * send() refreshed lastSent and then tried to drain the queue with a condition
 * based on that same (just-updated) timestamp, so the drain never ran - and the
 * queue was cleared regardless, silently discarding every rate-limited event.
 * emit() also dropped the payload's sessionId.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Telemetry } from './telemetry.js';

describe('Telemetry - rate limiting and queue', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('sends an event immediately when the window has elapsed', () => {
    const seen: string[] = [];
    const t = new Telemetry({ enabled: true, onEvent: (p) => seen.push(p.event) });

    t.track('agent.start');
    expect(seen).toEqual(['agent.start']);
    expect(t.getQueueSize()).toBe(0);
  });

  it('queues events that arrive inside the window', () => {
    const seen: string[] = [];
    const t = new Telemetry({ enabled: true, onEvent: (p) => seen.push(p.event) });

    t.track('agent.start');
    t.track('tool.executed');
    t.track('tool.error');

    expect(seen).toEqual(['agent.start']);
    expect(t.getQueueSize()).toBe(2);
  });

  it('drains one queued event per elapsed window instead of discarding it', () => {
    const seen: string[] = [];
    const t = new Telemetry({ enabled: true, rateLimitMs: 5000, onEvent: (p) => seen.push(p.event) });

    t.track('agent.start');
    t.track('tool.executed');

    vi.advanceTimersByTime(10_000);
    t.track('agent.stop'); // window elapsed -> drain the oldest queued event

    expect(seen).toEqual(['agent.start', 'tool.executed']);
  });

  it('never loses queued events: they are delivered by flush()', () => {
    const seen: string[] = [];
    const t = new Telemetry({ enabled: true, rateLimitMs: 60_000, onEvent: (p) => seen.push(p.event) });

    t.track('agent.start');
    t.track('tool.executed');
    t.track('tool.error');
    expect(t.getQueueSize()).toBe(2);

    t.flush();

    expect(seen).toEqual(['agent.start', 'tool.executed', 'tool.error']);
    expect(t.getQueueSize()).toBe(0);
  });

  it('does not queue anything when disabled', () => {
    const seen: string[] = [];
    const t = new Telemetry({ enabled: false, onEvent: (p) => seen.push(p.event) });

    t.track('agent.start');
    expect(seen).toEqual([]);
    expect(t.getQueueSize()).toBe(0);
  });

  it('flush() is a no-op with an empty queue', () => {
    const t = new Telemetry({ enabled: true });
    expect(() => t.flush()).not.toThrow();
    expect(t.getQueueSize()).toBe(0);
  });
});

describe('Telemetry - payload shape', () => {
  it('emit() forwards the sessionId instead of dropping it', () => {
    const seen: any[] = [];
    const t = new Telemetry({ enabled: true, onEvent: (p) => seen.push(p) });

    t.emit({ event: 'session.created', timestamp: Date.now(), sessionId: 'abc', properties: { a: 1 } });

    expect(seen[0].event).toBe('session.created');
    expect(seen[0].properties).toEqual({ a: 1, sessionId: 'abc' });
  });

  it('emit() without a sessionId leaves properties untouched', () => {
    const seen: any[] = [];
    const t = new Telemetry({ enabled: true, onEvent: (p) => seen.push(p) });

    t.emit({ event: 'session.saved', timestamp: Date.now(), properties: { a: 1 } });

    expect(seen[0].properties).toEqual({ a: 1 });
  });

  it('trackWithSession keeps the session id', () => {
    const seen: any[] = [];
    const t = new Telemetry({ enabled: true, onEvent: (p) => seen.push(p) });

    t.trackWithSession('model.selected', 'sid-1', { model: 'm' });

    expect(seen[0].properties).toEqual({ model: 'm', sessionId: 'sid-1' });
  });

  it('notifies on() listeners and unsubscribes them', () => {
    const seen: string[] = [];
    const t = new Telemetry({ enabled: true });
    const off = t.on((p) => seen.push(p.event));

    t.track('agent.start');
    off();
    t.flush();
    t.track('agent.stop'); // window still elapsed -> delivered, but no listener

    expect(seen).toEqual(['agent.start']);
  });

  it('a throwing listener does not break delivery to the others', () => {
    const seen: string[] = [];
    const t = new Telemetry({ enabled: true });
    t.on(() => { throw new Error('bad listener'); });
    t.on((p) => seen.push(p.event));

    expect(() => t.track('agent.start')).not.toThrow();
    expect(seen).toEqual(['agent.start']);
  });

  it('a throwing onEvent callback does not break tracking', () => {
    const t = new Telemetry({ enabled: true, onEvent: () => { throw new Error('bad callback'); } });
    expect(() => t.track('agent.start')).not.toThrow();
    expect(t.getQueueSize()).toBe(0);
  });
});
