import { describe, it, expect } from 'vitest';
import { processProxyEvent } from './proxy-stream';
import type { AssistantTurn } from './types';

function createEmptyPartial(): AssistantTurn {
  return {
    role: 'assistant',
    content: [],
    timestamp: Date.now(),
    stopReason: 'stop',
  };
}

describe('processProxyEvent', () => {
  describe('start event', () => {
    it('returns start with partial', () => {
      const partial = createEmptyPartial();
      const result = processProxyEvent({ type: 'start' }, partial);
      expect(result?.type).toBe('start');
      expect(result?.partial).toBe(partial);
    });
  });

  describe('text_delta', () => {
    it('creates text content block if missing and appends delta', () => {
      const partial = createEmptyPartial();
      const result = processProxyEvent({ type: 'text_delta', delta: 'Hello' }, partial);
      expect(result?.type).toBe('text_delta');
      expect(result?.delta).toBe('Hello');
      // partial mutated: first content is text with 'Hello'
      expect(partial.content).toHaveLength(1);
      expect(partial.content[0]).toEqual({ type: 'text', text: 'Hello' });
    });

    it('appends to existing text block', () => {
      const partial = createEmptyPartial();
      partial.content.push({ type: 'text', text: 'Hello' });
      const result = processProxyEvent({ type: 'text_delta', delta: ' World' }, partial);
      expect(partial.content[0]).toEqual({ type: 'text', text: 'Hello World' });
      expect(result?.delta).toBe(' World');
    });
  });

  describe('thinking_delta', () => {
    it('creates thinking block if missing', () => {
      const partial = createEmptyPartial();
      const result = processProxyEvent({ type: 'thinking_delta', delta: 'Thinking' }, partial);
      expect(result?.type).toBe('thinking_delta');
      expect(partial.content).toHaveLength(1);
      expect(partial.content[0]).toEqual({ type: 'thinking', thinking: 'Thinking' });
    });

    it('appends to existing thinking block', () => {
      const partial = createEmptyPartial();
      partial.content.push({ type: 'thinking', thinking: 'First' });
      const result = processProxyEvent({ type: 'thinking_delta', delta: ' Second' }, partial);
      expect(partial.content[0]).toEqual({ type: 'thinking', thinking: 'First Second' });
    });
  });

  describe('toolcall_delta', () => {
    it('creates new toolCall block if not exists', () => {
      const partial = createEmptyPartial();
      const result = processProxyEvent({
        type: 'toolcall_delta',
        id: 'call1',
        name: 'read',
        delta: '{"path":"file"}',
      }, partial);
      expect(result?.type).toBe('toolcall_delta');
      expect(partial.content).toHaveLength(1);
      const toolCall = partial.content[0] as any;
      expect(toolCall.type).toBe('toolCall');
      expect(toolCall.id).toBe('call1');
      expect(toolCall.name).toBe('read');
      // Arguments are not parsed on first delta (remain empty)
      expect(toolCall.arguments).toEqual({});
      expect(toolCall.partialJson).toBe('{"path":"file"}');
    });

    it('accumulates and parses JSON on subsequent call', () => {
      const partial = createEmptyPartial();
      // First delta: incomplete JSON
      processProxyEvent({
        type: 'toolcall_delta',
        id: 'call1',
        name: 'read',
        delta: '{"path":',
      }, partial);
      // Second delta: completes JSON
      processProxyEvent({
        type: 'toolcall_delta',
        id: 'call1',
        name: 'read',
        delta: '"file.txt"}',
      }, partial);
      const toolCall = partial.content[0] as any;
      expect(toolCall.arguments).toEqual({ path: 'file.txt' });
      expect(toolCall.partialJson).toBe('{"path":"file.txt"}');
    });
  });

  describe('done event', () => {
    it('sets stopReason, usage and returns done event', () => {
      const partial = createEmptyPartial();
      const usage = { input: 10, output: 20, totalTokens: 30, cost: { input: 0.1, output: 0.2, total: 0.3 } };
      const result = processProxyEvent({ type: 'done', usage }, partial);
      expect(result?.type).toBe('done');
      expect(partial.stopReason).toBe('stop');
      expect(partial.usage).toBe(usage);
      expect((result as any).usage).toBe(usage);
      expect((result as any).message).toBe(partial);
    });
  });

  describe('error event', () => {
    it('sets stopReason, errorMessage and returns error event', () => {
      const partial = createEmptyPartial();
      const result = processProxyEvent({ type: 'error', message: 'Something failed' }, partial);
      expect(result?.type).toBe('error');
      expect(partial.stopReason).toBe('error');
      expect(partial.errorMessage).toBe('Something failed');
      expect((result as any).error).toBe(partial);
    });
  });

  describe('unknown event type', () => {
    it('returns null for unknown', () => {
      const partial = createEmptyPartial();
      // @ts-ignore
      const result = processProxyEvent({ type: 'unknown' }, partial);
      expect(result).toBeNull();
    });
  });
});
