import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from './event-emitter.js';
import type { AgentEvent } from './events.js';

// Helper to create a simple event
function createEvent(type: string, timestamp?: number, round?: number): AgentEvent {
  return {
    type,
    timestamp: timestamp ?? Date.now(),
    round: round ?? 0,
  } as AgentEvent;
}

describe('EventEmitter', () => {
  let emitter: EventEmitter;

  beforeEach(() => {
    emitter = new EventEmitter();
  });

  describe('on and emit', () => {
    it('registers and calls typed event handler', async () => {
      const handler = vi.fn();
      emitter.on('agent:start', handler);
      const event = createEvent('agent:start');
      await emitter.emit(event);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(event);
    });

    it('supports multiple handlers for same event', async () => {
      const h1 = vi.fn();
      const h2 = vi.fn();
      emitter.on('agent:end', h1);
      emitter.on('agent:end', h2);
      const event = createEvent('agent:end');
      await emitter.emit(event);
      expect(h1).toHaveBeenCalled();
      expect(h2).toHaveBeenCalled();
    });

    it('awaits all async handlers before resolving emit', async () => {
      const handler = vi.fn(async () => {
        await Promise.resolve();
      });
      emitter.on('agent:start', handler);
      const event = createEvent('agent:start');
      await emitter.emit(event);
      expect(handler).toHaveBeenCalled();
    });

    it('tolerates handler errors without rejecting emit', async () => {
      const errorHandler = vi.fn(() => {
        throw new Error('handler error');
      });
      const okHandler = vi.fn();
      emitter.on('agent:start', errorHandler);
      emitter.on('agent:start', okHandler);
      const event = createEvent('agent:start');
      // Should not throw
      await expect(emitter.emit(event)).resolves.toBeUndefined();
      expect(errorHandler).toHaveBeenCalled();
      expect(okHandler).toHaveBeenCalled();
    });
  });

  describe('off', () => {
    it('removes specific typed handler', async () => {
      const handler = vi.fn();
      emitter.on('agent:start', handler);
      emitter.off('agent:start', handler);
      const event = createEvent('agent:start');
      await emitter.emit(event);
      expect(handler).not.toHaveBeenCalled();
    });

    it('does nothing if handler not registered', () => {
      const handler = vi.fn();
      // Not registered
      emitter.off('agent:start', handler);
      // Should not throw
    });
  });

  describe('onAny and offAny', () => {
    it('registers global listener called for all events', async () => {
      const globalHandler = vi.fn();
      emitter.onAny(globalHandler);
      const e1 = createEvent('agent:start');
      const e2 = createEvent('agent:end');
      await emitter.emitAll([e1, e2]);
      expect(globalHandler).toHaveBeenCalledTimes(2);
      expect(globalHandler).toHaveBeenCalledWith(e1);
      expect(globalHandler).toHaveBeenCalledWith(e2);
    });

    it('removes global listener with offAny', async () => {
      const handler = vi.fn();
      emitter.onAny(handler);
      emitter.offAny(handler);
      await emitter.emit(createEvent('agent:start'));
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    it('removes all typed and global listeners', async () => {
      const h1 = vi.fn();
      const h2 = vi.fn();
      emitter.on('agent:start', h1);
      emitter.onAny(h2);
      emitter.clear();
      await emitter.emit(createEvent('agent:start'));
      expect(h1).not.toHaveBeenCalled();
      expect(h2).not.toHaveBeenCalled();
    });
  });

  describe('listenerCount', () => {
    it('returns count for specific event type', () => {
      const h1 = vi.fn();
      const h2 = vi.fn();
      emitter.on('agent:start', h1);
      emitter.on('agent:start', h2);
      expect(emitter.listenerCount('agent:start')).toBe(2);
    });

    it('returns 0 when no listeners for event', () => {
      expect(emitter.listenerCount('agent:start')).toBe(0);
    });

    it('returns total count of all listeners when no type specified', () => {
      const h1 = vi.fn();
      const h2 = vi.fn();
      const h3 = vi.fn();
      emitter.on('agent:start', h1);
      emitter.on('agent:end', h2);
      emitter.onAny(h3);
      expect(emitter.listenerCount()).toBe(3);
    });
  });

  describe('hasListeners', () => {
    it('returns true if any listeners registered', () => {
      const h = vi.fn();
      emitter.on('agent:start', h);
      expect(emitter.hasListeners).toBe(true);
    });

    it('returns true if any global listeners', () => {
      const h = vi.fn();
      emitter.onAny(h);
      expect(emitter.hasListeners).toBe(true);
    });

    it('returns false if no listeners', () => {
      expect(emitter.hasListeners).toBe(false);
    });
  });

  describe('getEventMetrics', () => {
    it('records emission count and average duration', async () => {
      // Fast handler
      emitter.on('agent:start', vi.fn());
      const event = createEvent('agent:start');
      await emitter.emit(event);
      await emitter.emit(event);
      const metrics = emitter.getEventMetrics();
      const m = metrics.get('agent:start');
      expect(m).toBeDefined();
      expect(m!.count).toBe(2);
      expect(typeof m!.avgDurationMs).toBe('number');
      // Duration should be >0 but small
      expect(m!.avgDurationMs).toBeGreaterThanOrEqual(0);
    });

    it('includes duration for slow handlers', async () => {
      const slow = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 20));
      });
      emitter.on('agent:start', slow);
      await emitter.emit(createEvent('agent:start'));
      const metrics = emitter.getEventMetrics();
      const m = metrics.get('agent:start');
      expect(m!.avgDurationMs).toBeGreaterThanOrEqual(10);
    });
  });

  describe('emitAll', () => {
    it('emits events sequentially and await each', async () => {
      const order: number[] = [];
      const handler = vi.fn(async (ev: AgentEvent) => {
        await Promise.resolve();
        order.push(ev.type === 'a' ? 1 : 2);
      });
      emitter.onAny(handler);
      const e1 = createEvent('a');
      const e2 = createEvent('b');
      await emitter.emitAll([e1, e2]);
      expect(order).toEqual([1, 2]);
    });
  });
});
