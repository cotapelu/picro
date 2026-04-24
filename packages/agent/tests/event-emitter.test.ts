import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter, createConsoleLogger } from '../src/event-emitter';
import type { AgentStartEvent, AgentEndEvent } from '../src/types';

describe('EventEmitter', () => {
  let emitter: EventEmitter;

  beforeEach(() => {
    emitter = new EventEmitter();
  });

  const createStartEvent = (): AgentStartEvent => ({
    type: 'agent:start',
    timestamp: Date.now(),
    round: 0,
    initialPrompt: 'Test prompt',
  });

  describe('on and emit', () => {
    it('should subscribe and receive events', async () => {
      const handler = vi.fn();
      emitter.on('agent:start', handler);

      const event = createStartEvent();
      await emitter.emit(event);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(event);
    });

    it('should support multiple listeners for same event', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      emitter.on('agent:start', handler1);
      emitter.on('agent:start', handler2);

      await emitter.emit(createStartEvent());

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should unsubscribe with returned function', async () => {
      const handler = vi.fn();
      const unsubscribe = emitter.on('agent:start', handler);

      unsubscribe();
      await emitter.emit(createStartEvent());

      expect(handler).not.toHaveBeenCalled();
    });

    it('should support onAny for all events', async () => {
      const anyHandler = vi.fn();
      emitter.onAny(anyHandler);

      await emitter.emit(createStartEvent());
      await emitter.emit({ type: 'agent:end', timestamp: Date.now(), round: 1, result: {} as any });

      expect(anyHandler).toHaveBeenCalledTimes(2);
    });

    it('should wait for async handlers', async () => {
      const handler = vi.fn(async () => {
        await Promise.resolve();
      });

      emitter.on('agent:start', handler);
      await emitter.emit(createStartEvent());

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('off', () => {
    it('should remove specific listener', async () => {
      const handler = vi.fn();
      emitter.on('agent:start', handler);
      emitter.off('agent:start', handler);

      await emitter.emit(createStartEvent());
      expect(handler).not.toHaveBeenCalled();
    });

    it('should remove all any listeners', async () => {
      const handler = vi.fn();
      emitter.onAny(handler);
      emitter.offAny(handler);

      await emitter.emit(createStartEvent());
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    it('should remove all listeners', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      emitter.on('agent:start', handler1);
      emitter.on('agent:end', handler2);
      emitter.clear();

      await emitter.emit(createStartEvent());
      await emitter.emit({ type: 'agent:end', timestamp: Date.now(), round: 1, result: {} as any });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe('listenerCount', () => {
    it('should return count for event type', () => {
      emitter.on('agent:start', vi.fn());
      emitter.on('agent:start', vi.fn());

      expect(emitter.listenerCount('agent:start')).toBe(2);
    });

    it('should return total count when no type specified', () => {
      emitter.on('agent:start', vi.fn());
      emitter.on('agent:end', vi.fn());
      emitter.onAny(vi.fn());

      expect(emitter.listenerCount()).toBe(3);
    });
  });

  describe('hasListeners', () => {
    it('should return false when no listeners', () => {
      expect(emitter.hasListeners).toBe(false);
    });

    it('should return true when has listeners', () => {
      emitter.on('agent:start', vi.fn());
      expect(emitter.hasListeners).toBe(true);
    });
  });
});

describe('createConsoleLogger', () => {
  it('should create emitter with logging when verbose', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const emitter = createConsoleLogger(true);

    emitter.emit({
      type: 'agent:start',
      timestamp: Date.now(),
      round: 0,
      initialPrompt: 'Test',
    });

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should not log when not verbose', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const emitter = createConsoleLogger(false);

    emitter.emit({
      type: 'agent:start',
      timestamp: Date.now(),
      round: 0,
      initialPrompt: 'Test',
    });

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
