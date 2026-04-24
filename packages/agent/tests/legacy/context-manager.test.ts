import { describe, it, expect, beforeEach } from 'vitest';
import { ContextManager } from '../src/context-manager.js';
import type { Message } from '../src/types.js';

function createMessage(role: Message['role'], content: string, tokens?: number): Message {
  return { role, content, timestamp: new Date().toISOString() };
}

describe('ContextManager', () => {
  let cm: ContextManager;

  beforeEach(() => {
    cm = new ContextManager({ maxTokens: 1000, reservedTokens: 100, minMessages: 2 });
  });

  describe('truncateMessages', () => {
    it('should return all messages if within token limit', () => {
      const msgs: Message[] = [
        createMessage('user', 'Hello'),
        createMessage('assistant', 'Hi there!'),
      ];
      const result = cm.truncateMessages(msgs);
      expect(result).toHaveLength(2);
    });

    it('should keep system messages', () => {
      const msgs: Message[] = [
        createMessage('system', 'You are a helpful assistant'),
        createMessage('user', 'Hello'),
        createMessage('assistant', 'Hi!'),
      ];
      const result = cm.truncateMessages(msgs);
      const systemCount = result.filter(m => m.role === 'system').length;
      expect(systemCount).toBe(1);
    });

    it('should truncate old messages when over limit', () => {
      // Create many messages to exceed limit
      const msgs: Message[] = [];
      for (let i = 0; i < 20; i++) {
        msgs.push(createMessage('user', `Message ${i}: ` + 'x'.repeat(200))); // ~50 tokens each
      }
      const result = cm.truncateMessages(msgs);
      // Should be much less than original
      expect(result.length).toBeLessThan(20);
    });

    it('should keep at least minMessages recent', () => {
      const msgs: Message[] = [];
      for (let i = 0; i < 10; i++) {
        msgs.push(createMessage('user', `Msg ${i}`));
      }
      const result = cm.truncateMessages(msgs);
      // Should keep at least minMessages=2
      expect(result.length).toBeGreaterThanOrEqual(2);
      // Most recent should be present (last 2)
      const lastTwo = msgs.slice(-2);
      expect(result.some(r => r.content.includes('Msg 9'))).toBe(true);
      expect(result.some(r => r.content.includes('Msg 8'))).toBe(true);
    });

    it('should preserve order after truncation', () => {
      const msgs: Message[] = [
        createMessage('user', 'A'),
        createMessage('assistant', 'B'),
        createMessage('user', 'C'),
      ];
      const result = cm.truncateMessages(msgs);
      // Order should remain
      expect(result[0].content).toBe('A');
      expect(result[1].content).toBe('B');
      expect(result[2].content).toBe('C');
    });

    it('should return empty array for empty input', () => {
      const result = cm.truncateMessages([]);
      expect(result).toEqual([]);
    });
  });

  describe('estimateTokens', () => {
    it('should estimate tokens based on length/4', () => {
      expect(cm.estimateTokens('abcdefghij')).toBe(3); // 10/4=2.5=>3
      expect(cm.estimateTokens('abc')).toBe(1);
    });
  });

  describe('estimateMessagesTokens', () => {
    it('should sum tokens for all messages', () => {
      const msgs: Message[] = [
        createMessage('user', 'Hello world'),
        createMessage('assistant', 'Hi!'),
      ];
      const total = cm.estimateMessagesTokens(msgs);
      // 'Hello world' = 11 chars => 3 tokens; 'Hi!' = 3 chars => 1 token; total = 4
      expect(total).toBe(4);
    });
  });

  describe('injectMemories', () => {
    it('should inject memories when enabled', () => {
      cm.setMemories([
        { content: 'Memory 1', relevance: 0.9 },
        { content: 'Memory 2', relevance: 0.8 },
      ]);
      const prompt = 'Query?';
      const result = cm.injectMemories(prompt); // no query, include all
      expect(result).toContain('Relevant Memories');
      expect(result).toContain('Memory 1');
      expect(result).toContain('Memory 2');
    });

    it('should not inject when memory injection disabled', () => {
      cm = new ContextManager({ maxTokens: 1000, reservedTokens: 100, minMessages: 2, enableMemoryInjection: false });
      cm.setMemories([{ content: 'Memory', relevance: 0.9 }]);
      const result = cm.injectMemories('Prompt', 'query');
      expect(result).toBe('Prompt');
    });

    it('should filter by keyword when query provided', () => {
      cm.setMemories([
        { content: 'The cat sat', relevance: 0.9 },
        { content: 'The dog barked', relevance: 0.8 },
      ]);
      const result = cm.injectMemories('', 'cat');
      expect(result).toContain('cat');
      expect(result).not.toContain('dog');
    });
  });

  describe('buildPrompt', () => {
    it('should build prompt with history and no memories', () => {
      const msgs: Message[] = [
        createMessage('user', 'Hello'),
        createMessage('assistant', 'Hi'),
      ];
      const result = cm.buildPrompt('You are an AI', msgs);
      expect(result.prompt).toContain('You are an AI');
      expect(result.prompt).toContain('Hello');
      expect(result.prompt).toContain('Hi');
    });

    it('should return token usage', () => {
      const msgs: Message[] = [createMessage('user', 'Test')];
      const result = cm.buildPrompt('Base', msgs);
      expect(result.tokensUsed).toBeGreaterThan(0);
    });

    it('should truncate long histories', () => {
      const msgs: Message[] = [];
      for (let i = 0; i < 100; i++) {
        msgs.push(createMessage('user', `Msg ${i}: ` + 'x'.repeat(1000)));
      }
      const result = cm.buildPrompt('Base', msgs);
      // Should still be under token limit
      expect(result.tokensUsed).toBeLessThanOrEqual(1000);
    });
  });

  describe('getStats', () => {
    it('should report stats correctly', () => {
      const msgs: Message[] = [
        createMessage('user', 'Hello'),
        createMessage('assistant', 'Hi'),
      ];
      cm.setMemories([{ content: 'M1' }, { content: 'M2' }]);
      const stats = cm.getStats(msgs);
      expect(stats.totalMessages).toBe(2);
      expect(stats.memoryCount).toBe(2);
      expect(stats.maxTokens).toBe(1000);
    });
  });

  describe('isNearCapacity', () => {
    it('should return false when well under threshold', () => {
      const msgs: Message[] = [createMessage('user', 'Hi')];
      expect(cm.isNearCapacity(msgs, 0.9)).toBe(false);
    });
  });
});
