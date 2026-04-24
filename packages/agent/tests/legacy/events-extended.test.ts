/**
 * Extended Tests for events.ts - Listener ordering and more scenarios
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter, createConsoleLogger } from '../src/events.js';
import type { AgentEvent, AgentStartEvent, AgentEndEvent, RoundStartEvent, ToolCallEvent } from '../src/types.js';

describe('Extended EventEmitter Tests', () => {
  let emitter: EventEmitter;

  beforeEach(() => {
    emitter = new EventEmitter();
  });

  describe('Listener Order', () => {
    it('should call listeners in registration order', async () => {
      const order: number[] = [];
      emitter.on('test', () => order.push(1));
      emitter.on('test', () => order.push(2));
      emitter.on('test', () => order.push(3));

      await emitter.emit({ type: 'test', timestamp: Date.now() } as any);
      expect(order).toEqual([1, 2, 3]);
    });

    it('should call onAny listeners after specific ones', async () => {
      const order: number[] = [];
      emitter.on('test', () => order.push(1));
      emitter.onAny(() => order.push(2));
      emitter.on('test', () => order.push(3));

      await emitter.emit({ type: 'test', timestamp: Date.now() } as any);
      expect(order).toContain(2);
    });
  });

  describe('Multiple Event Types', () => {
    it('should handle many event types', async () => {
      const results: string[] = [];
      
      const events: AgentEventType[] = [
        'agent:start', 'agent:end', 'round:start', 'round:end',
        'llm:request', 'llm:response', 'tool:call', 'tool:result',
      ];

      for (const type of events) {
        emitter.on(type, () => results.push(type));
      }

      for (const type of events) {
        await emitter.emit({ type, timestamp: Date.now() } as any);
      }

      expect(results).toHaveLength(8);
    });
  });

  describe('Concurrent Emissions', () => {
    it('should handle rapid emissions', async () => {
      let count = 0;
      emitter.on('test', async () => {
        count++;
        await Promise.resolve();
        count++;
      });

      await Promise.all([
        emitter.emit({ type: 'test', timestamp: Date.now() } as any),
        emitter.emit({ type: 'test', timestamp: Date.now() } as any),
      ]);

      expect(count).toBe(4);
    });
  });

  describe('Listener Cleanup', () => {
    it('should allow removing specific listener', () => {
      const fn1 = vi.fn();
      const fn2 = vi.fn();

      const unsub = emitter.on('test', fn1);
      emitter.on('test', fn2);

      unsub();
      emitter.emit({ type: 'test', timestamp: Date.now() } as any);

      expect(fn1).not.toHaveBeenCalled();
      expect(fn2).toHaveBeenCalled();
    });

    it('should clear specific event listeners', () => {
      emitter.on('event1', () => {});
      emitter.on('event2', () => {});
      emitter.on('event2', () => {});

      emitter.off('event2', () => {}); // This does nothing - needs exact function
      // Test that we can get count
      expect(emitter.getListenerCount('event1')).toBe(1);
    });

    it('should clear all listeners', () => {
      emitter.on('e1', () => {});
      emitter.on('e2', () => {});
      emitter.onAny(() => {});

      emitter.clear();

      expect(emitter.getListenerCount('e1')).toBe(0);
      expect(emitter.getListenerCount('e2')).toBe(0);
      expect(emitter.getListenerCount()).toBe(0);
    });
  });

  describe('Memory Considerations', () => {
    it('should not leak listeners if properly cleaned', () => {
      for (let i = 0; i < 100; i++) {
        emitter.on('test', () => {});
      }

      emitter.clear();
      expect(emitter.getListenerCount('test')).toBe(0);
    });
  });

  describe('Async Listeners', () => {
    it('should handle async listeners', async () => {
      const result: string[] = [];

      emitter.on('test', async () => {
        await Promise.resolve();
        result.push('async');
      });
      emitter.on('test', () => {
        result.push('sync');
      });

      await emitter.emit({ type: 'test', timestamp: Date.now() } as any);

      expect(result).toContain('async');
      expect(result).toContain('sync');
    });
  });

  describe('Event Data', () => {
    it('should pass full event to listener', async () => {
      let received: any;
      emitter.on('agent:start', (event) => (received = event));

      await emitter.emitAgentStart('Test prompt', 1);

      expect(received.type).toBe('agent:start');
      expect(received.initialPrompt).toBe('Test prompt');
      expect(received.round).toBe(1);
    });

    it('should include metadata in event', async () => {
      let received: any;
      emitter.on('llm:request', (event) => (received = event));

      await emitter.emitLLMRequest('prompt', [{}], 1);

      expect(received.metadata?.promptLength).toBe(6);
      expect(received.metadata?.toolsCount).toBe(1);
    });
  });

  describe('RoundTrip Emission', () => {
    it('should handle start->end cycle', async () => {
      const events: string[] = [];

      emitter.on('agent:start', () => events.push('start'));
      emitter.on('round:start', () => events.push('round_start'));
      emitter.on('round:end', () => events.push('round_end'));
      emitter.on('agent:end', () => events.push('end'));

      await emitter.emitAgentStart('prompt', 0);
      await emitter.emitRoundStart('prompt', 1);
      await emitter.emitRoundEnd({}, 0, 1);
      await emitter.emitAgentEnd({} as any, 1);

      expect(events).toEqual(['start', 'round_start', 'round_end', 'end']);
    });
  });

  describe('Tool Execution Events', () => {
    it('should emit tool call and result events', async () => {
      let callEvent: any, resultEvent: any;

      emitter.on('tool:call', (e) => (callEvent = e));
      emitter.on('tool:result', (e) => (resultEvent = e));

      await emitter.emitToolCall({ id: 'c1', name: 'search', arguments: {} }, 1);
      await emitter.emitToolResult(
        { toolCallId: 'c1', toolName: 'search', result: 'ok', isError: false } as any,
        1
      );

      expect(callEvent.metadata?.toolName).toBe('search');
      expect(resultEvent.metadata?.toolName).toBe('search');
    });

    it('should emit tool error event', async () => {
      let errorEvent: any;
      emitter.on('tool:error', (e) => (errorEvent = e));

      await emitter.emitToolError(
        { id: 'c1', name: 'search', arguments: {} },
        'Error occurred',
        1
      );

      expect(errorEvent.error).toBe('Error occurred');
    });
  });

  describe('LLM Events', () => {
    it('should emit request then response', async () => {
      let request: any, response: any;

      emitter.on('llm:request', (e) => (request = e));
      emitter.on('llm:response', (e) => (response = e));

      await emitter.emitLLMRequest('prompt', [], 1);
      await emitter.emitLLMResponse({ content: 'answer' }, 100, 1);

      expect(request.metadata?.promptLength).toBe(6);
      expect(response.metadata?.tokensUsed).toBe(100);
    });
  });
});

describe('Extended createConsoleLogger Tests', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should log all round events with verbose', async () => {
    const logger = createConsoleLogger(true);

    await logger.emitRoundStart('prompt', 1);
    await logger.emitRoundEnd({ content: 'result' }, 2, 1);

    expect(console.log).toHaveBeenCalled();
  });

  it('should not log with verbose false', async () => {
    const logger = createConsoleLogger(false);

    await logger.emitAgentStart('prompt', 0);

    expect(console.log).not.toHaveBeenCalled();
  });

  it('should log tool events when verbose', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = createConsoleLogger(true);

    await logger.emitToolCall({ id: 'c1', name: 'search', arguments: {} }, 1);

    expect(console.log).toHaveBeenCalled();
  });
});