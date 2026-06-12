// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect } from 'vitest';
import {
  isAgentStartEvent,
  isAgentEndEvent,
  isTurnStartEvent,
  isTurnEndEvent,
  isMessageStartEvent,
  isMessageUpdateEvent,
  isMessageEndEvent,
  isToolCallStartEvent,
  isToolCallEndEvent,
  isToolProgressEvent,
  isToolErrorEvent,
  isLLMRequestEvent,
  isLLMResponseEvent,
  isMemoryRetrievalEvent,
  isErrorEvent,
} from './event-guards.js';
import type { AgentEvent } from './events.js';

// Helper to create a minimal event with given type and required fields
function createEvent<T extends AgentEvent['type']>(
  type: T,
  overrides: Partial<Extract<AgentEvent, { type: T }>> = {}
): Extract<AgentEvent, { type: T }> {
  const base = {
    type,
    timestamp: Date.now(),
    round: 0,
  } as const;
  return { ...base, ...overrides } as Extract<AgentEvent, { type: T }>;
}

describe('Event Type Guards', () => {
  describe('isAgentStartEvent', () => {
    it('returns true for AgentStartEvent', () => {
      const ev = createEvent('agent:start', { initialPrompt: 'hi' });
      expect(isAgentStartEvent(ev)).toBe(true);
    });
    it('returns false for other types', () => {
      expect(isAgentStartEvent(createEvent('agent:end', { result: {} as any }))).toBe(false);
      expect(isAgentStartEvent(createEvent('error', { message: '' }))).toBe(false);
    });
  });

  describe('isAgentEndEvent', () => {
    it('returns true for AgentEndEvent', () => {
      const ev = createEvent('agent:end', { result: {} as any });
      expect(isAgentEndEvent(ev)).toBe(true);
    });
    it('returns false for other types', () => {
      expect(isAgentEndEvent(createEvent('agent:start', { initialPrompt: '' }))).toBe(false);
    });
  });

  describe('isTurnStartEvent', () => {
    it('returns true for TurnStartEvent', () => {
      const ev = createEvent('turn:start', { promptLength: 123 });
      expect(isTurnStartEvent(ev)).toBe(true);
    });
  });

  describe('isTurnEndEvent', () => {
    it('returns true for TurnEndEvent', () => {
      const ev = createEvent('turn:end', { toolCallsExecuted: 1, hasAssistantContent: true });
      expect(isTurnEndEvent(ev)).toBe(true);
    });
  });

  describe('isMessageStartEvent', () => {
    it('returns true for MessageStartEvent', () => {
      const ev = createEvent('message:start', { message: { role: 'user' } } as any);
      expect(isMessageStartEvent(ev)).toBe(true);
    });
  });

  describe('isMessageUpdateEvent', () => {
    it('returns true for MessageUpdateEvent', () => {
      const ev = createEvent('message:update', { message: { role: 'assistant' }, delta: 'abc' } as any);
      expect(isMessageUpdateEvent(ev)).toBe(true);
    });
  });

  describe('isMessageEndEvent', () => {
    it('returns true for MessageEndEvent', () => {
      const ev = createEvent('message:end', { message: { role: 'assistant' } } as any);
      expect(isMessageEndEvent(ev)).toBe(true);
    });
  });

  describe('isToolCallStartEvent', () => {
    it('returns true for ToolCallStartEvent', () => {
      const ev = createEvent('tool:call:start', { toolCallId: '123', toolName: 'bash', args: {} });
      expect(isToolCallStartEvent(ev)).toBe(true);
    });
  });

  describe('isToolCallEndEvent', () => {
    it('returns true for ToolCallEndEvent', () => {
      const ev = createEvent('tool:call:end', { toolCallId: '123', toolName: 'bash', result: {} as any, isError: false });
      expect(isToolCallEndEvent(ev)).toBe(true);
    });
  });

  describe('isToolProgressEvent', () => {
    it('returns true for ToolProgressEvent', () => {
      const ev = createEvent('tool:progress', { toolCallId: '123', toolName: 'bash' });
      expect(isToolProgressEvent(ev)).toBe(true);
    });
  });

  describe('isToolErrorEvent', () => {
    it('returns true for ToolErrorEvent', () => {
      const ev = createEvent('tool:error', { toolName: 'bash', toolCallId: '123', errorMessage: 'fail' });
      expect(isToolErrorEvent(ev)).toBe(true);
    });
  });

  describe('isLLMRequestEvent', () => {
    it('returns true for LLMRequestEvent', () => {
      const ev = createEvent('llm:request', { promptLength: 100, toolsAvailable: 5 });
      expect(isLLMRequestEvent(ev)).toBe(true);
    });
  });

  describe('isLLMResponseEvent', () => {
    it('returns true for LLMResponseEvent', () => {
      const ev = createEvent('llm:response', { tokensUsed: 42, toolCallsCount: 1 });
      expect(isLLMResponseEvent(ev)).toBe(true);
    });
  });

  describe('isMemoryRetrievalEvent', () => {
    it('returns true for MemoryRetrievalEvent', () => {
      const ev = createEvent('memory:retrieve', { query: 'query', memoriesRetrieved: 3 });
      expect(isMemoryRetrievalEvent(ev)).toBe(true);
    });
  });

  describe('isErrorEvent', () => {
    it('returns true for ErrorEvent', () => {
      const ev = createEvent('error', { message: 'something broke' });
      expect(isErrorEvent(ev)).toBe(true);
    });
  });

  describe('eventGuards collection', () => {
    it('exports all guard functions', async () => {
      const { eventGuards } = await import('./event-guards.js');
      expect(eventGuards).toBeDefined();
      expect(Object.keys(eventGuards).length).toBe(15);
    });
  });
});
