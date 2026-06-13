// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from './event-emitter.js';

describe('EventEmitter branch coverage', () => {
  let emitter: EventEmitter;

  beforeEach(() => {
    emitter = new EventEmitter();
  });

  it('emit should call typed listeners', async () => {
    const handler = vi.fn();
    emitter.on('agent:start', handler);
    const event = { type: 'agent:start', timestamp: Date.now(), round: 0 } as any;
    await emitter.emit(event);
    expect(handler).toHaveBeenCalledWith(event);
  });

  it('emit should call global listeners', async () => {
    const handler = vi.fn();
    emitter.onAny(handler);
    const event = { type: 'agent:start', timestamp: Date.now(), round: 0 } as any;
    await emitter.emit(event);
    expect(handler).toHaveBeenCalledWith(event);
  });

  it('emit should call both typed and global listeners', async () => {
    const typed = vi.fn();
    const global = vi.fn();
    emitter.on('agent:start', typed);
    emitter.onAny(global);
    const event = { type: 'agent:start', timestamp: Date.now(), round: 0 } as any;
    await emitter.emit(event);
    expect(typed).toHaveBeenCalled();
    expect(global).toHaveBeenCalled();
  });

  it('emit should handle errors in listeners gracefully and not reject', async () => {
    const errorHandler = vi.fn().mockRejectedValue(new Error('fail'));
    const successHandler = vi.fn();
    emitter.on('agent:start', errorHandler);
    emitter.on('agent:start', successHandler);
    const event = { type: 'agent:start', timestamp: Date.now(), round: 0 } as any;
    // Should not throw
    await expect(emitter.emit(event)).resolves.toBeUndefined();
    expect(successHandler).toHaveBeenCalled();
  });

  it('off should remove typed listener', async () => {
    const handler = vi.fn();
    const unsubscribe = emitter.on('agent:start', handler);
    unsubscribe();
    const event = { type: 'agent:start', timestamp: Date.now(), round: 0 } as any;
    await emitter.emit(event);
    expect(handler).not.toHaveBeenCalled();
  });

  it('offAny should remove global listener', async () => {
    const handler = vi.fn();
    const unsubscribe = emitter.onAny(handler);
    unsubscribe();
    const event = { type: 'agent:start', timestamp: Date.now(), round: 0 } as any;
    await emitter.emit(event);
    expect(handler).not.toHaveBeenCalled();
  });

  it('metrics should be updated after emit', async () => {
    const handler = vi.fn();
    emitter.on('agent:start', handler);
    const event = { type: 'agent:start', timestamp: Date.now(), round: 0 } as any;
    await emitter.emit(event);
    const metricsMap = emitter.getEventMetrics();
    const metrics = metricsMap.get('agent:start');
    expect(metrics).not.toBeNull();
    expect(metrics?.count).toBe(1);
    expect(metrics?.avgDurationMs).toBeGreaterThanOrEqual(0);
  });

  it('getEventMetrics should return empty map when none', () => {
    const map = emitter.getEventMetrics();
    expect(map.size).toBe(0);
  });

  it('on should allow multiple listeners for same event', async () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    emitter.on('agent:start', h1);
    emitter.on('agent:start', h2);
    const event = { type: 'agent:start', timestamp: Date.now(), round: 0 } as any;
    await emitter.emit(event);
    expect(h1).toHaveBeenCalled();
    expect(h2).toHaveBeenCalled();
  });

  it('emit should handle empty listener sets', async () => {
    const event = { type: 'agent:start', timestamp: Date.now(), round: 0 } as any;
    // Should not throw
    await expect(emitter.emit(event)).resolves.toBeUndefined();
  });
});
