// SPDX-License-Identifier: Apache-2.0
/**
 * Unit tests for ContextBuilder.
 */

import { describe, it, expect } from 'vitest';
import { ContextBuilder } from './context-manager';
import type { ConversationTurn, MemoryEntry } from './types';

// Helper to create a user turn
function user(text: string): ConversationTurn {
  return { role: 'user', content: [{ type: 'text', text }], timestamp: Date.now() };
}

// Helper to create an assistant turn
function assistant(text: string): ConversationTurn {
  return { role: 'assistant', content: [{ type: 'text', text }], timestamp: Date.now() };
}

// Helper to create a tool turn
function tool(toolName: string, result: string, isError = false): ConversationTurn {
  return {
    role: 'tool',
    toolCallId: 'call-' + Math.random().toString(36).slice(2),
    toolName,
    content: [{ type: 'text', text: result }],
    isError,
    timestamp: Date.now(),
  };
}

// Helper to create a memory entry
function memory(content: string, relevance = 0.5): MemoryEntry {
  return { content, relevance, timestamp: Date.now() };
}

describe('ContextBuilder', () => {
  let builder: ContextBuilder;

  beforeEach(() => {
    builder = new ContextBuilder();
  });

  describe('build', () => {
    it('should build prompt with base and history', () => {
      const base = 'System: you are helpful';
      const history: ConversationTurn[] = [user('Hello'), assistant('Hi there')];

      const { prompt, tokenCount } = builder.build(base, history);

      expect(prompt).toContain(base);
      expect(prompt).toContain('Hello');
      expect(prompt).toContain('Hi there');
      expect(tokenCount).toBeGreaterThan(0);
    });

    it('should inject memories when enabled', () => {
      const base = 'Base';
      const history: ConversationTurn[] = [user('Hi')];
      const memories: MemoryEntry[] = [
        memory('Remember the project is about AI'),
        memory('Use Python for scripting'),
      ];

      const { prompt } = builder.build(base, history, memories);

      expect(prompt).toContain('Relevant Memories');
      expect(prompt).toContain('AI');
      expect(prompt).toContain('Python');
    });

    it('should not inject memories when disabled', () => {
      const builderNoMem = new ContextBuilder({ enableMemoryInjection: false });
      const base = 'Base';
      const history: ConversationTurn[] = [user('Hi')];
      const memories: MemoryEntry[] = [memory('Secret')];

      const { prompt } = builderNoMem.build(base, history, memories);

      expect(prompt).not.toContain('Relevant Memories');
      expect(prompt).not.toContain('Secret');
    });

    it('should truncate history to fit maxTokens', () => {
      const base = '';
      const history: ConversationTurn[] = [];
      for (let i = 0; i < 200; i++) {
        history.push(user('x'.repeat(100)));
      }
      const tinyBuilder = new ContextBuilder({ maxTokens: 6000, reservedTokens: 0, minMessages: 1 });
      const { tokenCount } = tinyBuilder.build(base, history);
      expect(tokenCount).toBeLessThanOrEqual(6000);
    });

    it('should keep at least minMessages recent turns', () => {
      const base = 'Base';
      const history: ConversationTurn[] = [];
      for (let i = 0; i < 20; i++) {
        history.push(user(`Msg ${i}`));
      }

      // Build with small token limit but minMessages default 5
      const { prompt } = builder.build(base, history, undefined, {
        maxTokens: 500,
        reservedTokens: 0,
        minMessages: 5,
      });

      // Should keep at least 5 messages, check last few are present
      expect(prompt).toContain('Msg 19');
      expect(prompt).toContain('Msg 18');
    });

    it('should separate system messages from non-system', () => {
      const base = 'Base';
      const history: ConversationTurn[] = [
        { role: 'system', content: [{ type: 'text', text: 'You are AI' }], timestamp: Date.now() },
        user('Hello'),
        assistant('Hi'),
      ];

      const { prompt } = builder.build(base, history);

      expect(prompt).toContain('You are AI'); // system messages included in context
      expect(prompt).toContain('Hello');
    });
  });

  describe('estimateTokenCount', () => {
    it('should estimate tokens as length / 4', () => {
      expect(builder.estimateTokenCount('')).toBe(0);
      expect(builder.estimateTokenCount('abcd')).toBe(1);
      expect(builder.estimateTokenCount('abcdefgh')).toBe(2);
    });
  });

  describe('estimateHistoryTokens', () => {
    it('should sum tokens of all turns', () => {
      const history: ConversationTurn[] = [
        user('Hello'),
        assistant('Hi'),
      ];
      const tokens = builder.estimateHistoryTokens(history);
      expect(tokens).toBeGreaterThan(0);
    });
  });

  describe('serializeTurn', () => {
    it('should serialize user turn', () => {
      const turn = user('Query');
      const s = builder.serializeTurn(turn);
      expect(s).toContain('USER');
      expect(s).toContain('Query');
    });

    it('should serialize assistant turn', () => {
      const turn = assistant('Answer');
      const s = builder.serializeTurn(turn);
      expect(s).toContain('ASSISTANT');
      expect(s).toContain('Answer');
    });

    it('should serialize tool turn', () => {
      const turn = tool('bash', 'output');
      const s = builder.serializeTurn(turn);
      expect(s).toContain('TOOL');
      expect(s).toContain('output');
    });

    it('should include thinking block', () => {
      const turn: ConversationTurn = {
        role: 'assistant',
        content: [
          { type: 'thinking', thinking: 'I am reasoning' },
          { type: 'text', text: 'Result' },
        ],
        timestamp: Date.now(),
      };
      const s = builder.serializeTurn(turn);
      expect(s).toContain('Thinking: I am reasoning');
    });

    it('should include toolCall block', () => {
      const turn: ConversationTurn = {
        role: 'assistant',
        content: [
          {
            type: 'toolCall',
            id: 'c1',
            name: 'read',
            arguments: { path: '/a.txt' },
          },
        ],
        timestamp: Date.now(),
      };
      const s = builder.serializeTurn(turn);
      expect(s).toContain('Tool Call');
      expect(s).toContain('read');
    });
  });

  describe('formatHistory', () => {
    it('should format list of turns', () => {
      const history: ConversationTurn[] = [user('U'), assistant('A')];
      const formatted = builder.formatHistory(history);
      expect(formatted).toContain('[USER]: U');
      expect(formatted).toContain('[ASSISTANT]: A');
    });
  });
});
