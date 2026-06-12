// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEventBus, EventBusController } from './event-bus.js';

describe('EventBus', () => {
  let bus: EventBusController;

  beforeEach(() => {
    bus = createEventBus();
  });

  describe('on and emit', () => {
    it('registers and calls handler for specific channel', () => {
      const handler = vi.fn();
      bus.on('test', handler);
      bus.emit('test', { data: 'value' });
      expect(handler).toHaveBeenCalledWith({ data: 'value' });
    });

    it('supports multiple handlers for same channel', () => {
      const h1 = vi.fn();
      const h2 = vi.fn();
      bus.on('channel', h1);
      bus.on('channel', h2);
      bus.emit('channel', 'payload');
      expect(h1).toHaveBeenCalledWith('payload');
      expect(h2).toHaveBeenCalledWith('payload');
    });

    it('does not call handlers for different channels', () => {
      const handler = vi.fn();
      bus.on('channelA', handler);
      bus.emit('channelB', 'data');
      expect(handler).not.toHaveBeenCalled();
    });

    it('handles errors in handlers gracefully and continues calling others', () => {
      const good1 = vi.fn();
      const bad = vi.fn(() => {
        throw new Error('handler error');
      });
      const good2 = vi.fn();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      bus.on('ch', good1);
      bus.on('ch', bad);
      bus.on('ch', good2);
      bus.emit('ch', 'test');

      expect(good1).toHaveBeenCalled();
      expect(good2).toHaveBeenCalled(); // Continue despite bad throwing
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Event handler error'),
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it('returns unsubscribe function', () => {
      const handler = vi.fn();
      const unsubscribe = bus.on('test', handler);
      bus.emit('test', 1);
      unsubscribe();
      bus.emit('test', 2);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('supports multiple independent subscriptions', () => {
      const h1 = vi.fn();
      const h2 = vi.fn();
      const u1 = bus.on('x', h1);
      const u2 = bus.on('x', h2);
      bus.emit('x', null);
      expect(h1).toHaveBeenCalledTimes(1);
      expect(h2).toHaveBeenCalledTimes(1);
      u1();
      bus.emit('x', null);
      expect(h1).toHaveBeenCalledTimes(1);
      expect(h2).toHaveBeenCalledTimes(2);
      u2();
      bus.emit('x', null);
      expect(h1).toHaveBeenCalledTimes(1);
      expect(h2).toHaveBeenCalledTimes(2);
    });
  });

  describe('clear', () => {
    it('removes all handlers', () => {
      const h1 = vi.fn();
      const h2 = vi.fn();
      bus.on('a', h1);
      bus.on('b', h2);
      bus.clear();
      bus.emit('a', 1);
      bus.emit('b', 2);
      expect(h1).not.toHaveBeenCalled();
      expect(h2).not.toHaveBeenCalled();
    });
  });
});
