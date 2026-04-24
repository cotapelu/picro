import { describe, it, expect, vi } from 'vitest';
import { AssistantMessageEventStream } from '../src/event-stream';
import type { AssistantMessage, AssistantMessageEvent } from '../src/types';

describe('AssistantMessageEventStream', () => {
  describe('Basic functionality', () => {
    it('should create an event stream', () => {
      const stream = new AssistantMessageEventStream();
      expect(stream).toBeDefined();
    });

    it('should push events', () => {
      const stream = new AssistantMessageEventStream();
      stream.push({ type: 'start' });
      expect(stream).toBeDefined();
    });

    it('should end the stream', () => {
      const stream = new AssistantMessageEventStream();
      stream.end();
      expect(stream).toBeDefined();
    });
  });

  describe('Async iteration', () => {
    it('should iterate over pushed events', async () => {
      const stream = new AssistantMessageEventStream();
      stream.push({ type: 'start' });
      stream.push({ type: 'text_start', contentIndex: 0 });
      stream.push({ type: 'text_delta', contentIndex: 0, delta: 'Hello' });
      stream.push({ type: 'text_end', contentIndex: 0, content: 'Hello' });
      stream.end();
      
      const events: AssistantMessageEvent[] = [];
      for await (const event of stream) {
        events.push(event);
      }
      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe('result() Promise', () => {
    it('should resolve with message on done event', async () => {
      const stream = new AssistantMessageEventStream();
      
      const message: AssistantMessage = {
        role: 'assistant',
        content: [{ type: 'text', text: 'Hello!' }],
        api: 'openai',
        provider: 'openai',
        model: 'gpt-4',
        usage: {
          input: 10,
          output: 10,
          cacheRead: 0,
          cacheWrite: 0,
          totalTokens: 20,
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
        },
        stopReason: 'stop',
        timestamp: Date.now(),
      };
      
      setTimeout(() => {
        stream.push({ type: 'done', reason: 'stop', message });
      }, 10);
      
      const result = await stream.result();
      expect(result.content[0].type).toBe('text');
    });
  });
});