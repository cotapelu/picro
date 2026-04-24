/**
 * Tests for events.ts - Event system
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter, createConsoleLogger } from '../src/events.js';
import type { AgentEvent, AgentStartEvent, RoundStartEvent, ToolCallEvent } from '../src/types.js';

describe('EventEmitter', () => {
  let emitter: EventEmitter;

  beforeEach(() => {
    emitter = new EventEmitter();
  });

  describe('on/off', () => {
    it('should subscribe and receive events', async () => {
      const received: AgentEvent[] = [];
      const listener = vi.fn((event: AgentStartEvent) => {
        received.push(event);
      });

      emitter.on('agent:start', listener);
      await emitter.emit({
        type: 'agent:start',
        timestamp: Date.now(),
        initialPrompt: 'Test',
      });

      expect(listener).toHaveBeenCalledTimes(1);
      expect(received[0].initialPrompt).toBe('Test');
    });

    it('should unsubscribe correctly', async () => {
      const listener = vi.fn();

      const unsubscribe = emitter.on('agent:start', listener);
      unsubscribe();
      await emitter.emit({
        type: 'agent:start',
        timestamp: Date.now(),
        initialPrompt: 'Test',
      });

      expect(listener).not.toHaveBeenCalled();
    });

    it('should support multiple listeners for same event', async () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      emitter.on('agent:start', listener1);
      emitter.on('agent:start', listener2);
      await emitter.emit({
        type: 'agent:start',
        timestamp: Date.now(),
        initialPrompt: 'Test',
      });

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it('should receive events in order', async () => {
      const events: number[] = [];
      emitter.on('round:start', () => events.push(1));
      emitter.on('round:end', () => events.push(2));

      await emitter.emit({ type: 'round:start', timestamp: Date.now(), round: 1 });
      await emitter.emit({ type: 'round:end', timestamp: Date.now(), round: 1 });

      expect(events).toEqual([1, 2]);
    });
  });

  describe('onAny/offAny', () => {
    it('should subscribe to all events', async () => {
      const received: AgentEvent[] = [];
      const listener = vi.fn((event: AgentEvent) => received.push(event));

      emitter.onAny(listener);

      await emitter.emit({ type: 'agent:start', timestamp: Date.now() });
      await emitter.emit({ type: 'round:start', timestamp: Date.now(), round: 1 });
      await emitter.emit({ type: 'tool:call', timestamp: Date.now(), round: 1, metadata: { toolName: 'test' } });

      expect(listener).toHaveBeenCalledTimes(3);
    });

    it('should allow global unsubscribe', async () => {
      const listener = vi.fn();
      emitter.onAny(listener);
      emitter.offAny(listener);

      await emitter.emit({ type: 'agent:start', timestamp: Date.now() });
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('emit helper methods', () => {
    it('should emitAgentStart', async () => {
      const listener = vi.fn();
      emitter.on('agent:start', listener);

      await emitter.emitAgentStart('Test prompt', 0);

      expect(listener).toHaveBeenCalled();
      const event = listener.mock.calls[0][0] as AgentStartEvent;
      expect(event.type).toBe('agent:start');
      expect(event.initialPrompt).toBe('Test prompt');
    });

    it('should emitRoundStart', async () => {
      const listener = vi.fn();
      emitter.on('round:start', listener);

      await emitter.emitRoundStart('Prompt', 1);

      expect(listener).toHaveBeenCalled();
      const event = listener.mock.calls[0][0] as RoundStartEvent;
      expect(event.round).toBe(1);
    });

    it('should emitToolCall', async () => {
      const listener = vi.fn();
      emitter.on('tool:call', listener);

      const toolCall = { id: 'call_1', name: 'search', arguments: {} };
      await emitter.emitToolCall(toolCall, 1);

      expect(listener).toHaveBeenCalled();
      const event = listener.mock.calls[0][0] as ToolCallEvent;
      expect(event.metadata?.toolName).toBe('search');
    });

    it('should emitToolResult', async () => {
      const listener = vi.fn();
      emitter.on('tool:result', listener);

      const result = {
        toolCallId: 'call_1',
        toolName: 'search',
        result: 'Result',
        isError: false,
      };
      await emitter.emitToolResult(result as any, 1);

      expect(listener).toHaveBeenCalled();
    });

    it('should emitError', async () => {
      const listener = vi.fn();
      emitter.on('error', listener);

      await emitter.emitError('Something went wrong', 'stack trace', 1);

      expect(listener).toHaveBeenCalled();
      const event = listener.mock.calls[0][0] as any;
      expect(event.error).toBe('Something went wrong');
      expect(event.stack).toBe('stack trace');
    });
  });

  describe('getListenerCount', () => {
    it('should return count for specific event', () => {
      emitter.on('agent:start', () => {});
      emitter.on('agent:start', () => {});
      emitter.on('round:start', () => {});

      expect(emitter.getListenerCount('agent:start')).toBe(2);
      expect(emitter.getListenerCount('round:start')).toBe(1);
    });

    it('should return global listener count', () => {
      emitter.onAny(() => {});
      emitter.onAny(() => {});

      expect(emitter.getListenerCount()).toBe(2);
    });

    it('should return 0 for unknown event', () => {
      expect(emitter.getListenerCount('agent:start')).toBe(0);
    });
  });

  describe('clear', () => {
    it('should remove all listeners', () => {
      emitter.on('agent:start', () => {});
      emitter.on('round:start', () => {});
      emitter.onAny(() => {});

      emitter.clear();

      expect(emitter.getListenerCount('agent:start')).toBe(0);
      expect(emitter.getListenerCount()).toBe(0);
    });
  });
});

describe('createConsoleLogger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should create emitter with listeners', () => {
    const logger = createConsoleLogger(false);
    expect(logger.getListenerCount()).toBe(0);
  });

  it('should log agent:start event', async () => {
    const logger = createConsoleLogger(true);

    await logger.emitAgentStart('Test', 0);

    expect(console.log).toHaveBeenCalled();
  });

  it('should log tool:call event', async () => {
    const logger = createConsoleLogger(true);

    await logger.emitToolCall({ id: 'call_1', name: 'search', arguments: {} }, 1);

    expect(console.log).toHaveBeenCalled();
  });

  it('should log error events', async () => {
    const logger = createConsoleLogger(true);

    await logger.emitToolError(
      { id: 'call_1', name: 'search', arguments: {} },
      'Error',
      1
    );

    expect(console.error).toHaveBeenCalled();
  });
});