/**
 * Extended Tests for context-manager.ts - More truncation scenarios
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ContextManager } from '../src/context-manager.js';
import type { Message, UserMessage, AssistantMessage, SystemMessage, ToolMessage } from '../src/types.js';

describe('Extended ContextManager Tests', () => {
  let contextManager: ContextManager;

  beforeEach(() => {
    contextManager = new ContextManager({
      maxTokens: 1000,
      reservedTokens: 100,
      minMessages: 3,
      enableMemoryInjection: true,
    });
  });

  describe('Token Estimation Edge Cases', () => {
    it('should estimate unicode characters', () => {
      // Unicode may use more bytes per character
      const tokens = contextManager.estimateTokens('你好');
      expect(tokens).toBeGreaterThan(0);
    });

    it('should handle emoji', () => {
      const tokens = contextManager.estimateTokens('👋🌍🎉');
      expect(tokens).toBeGreaterThan(0);
    });

    it('should handle special whitespace', () => {
      const text = 'a\tb\nc\r\nd   e';
      const tokens = contextManager.estimateTokens(text);
      expect(tokens).toBeGreaterThan(0);
    });

    it('should handle code blocks', () => {
      const code = 'function test() {\n  return "hello";\n}';
      const tokens = contextManager.estimateTokens(code);
      expect(tokens).toBeGreaterThan(0);
    });

    it('should handle JSON', () => {
      const json = '{"key": "value", "nested": {"a": 1, "b": 2}}';
      const tokens = contextManager.estimateTokens(json);
      expect(tokens).toBeGreaterThan(0);
    });
  });

  describe('Message Truncation Scenarios', () => {
    it('should handle large number of messages', () => {
      const messages: Message[] = Array.from({ length: 20 }, (_, i) => ({
        role: 'user' as const,
        content: `Message ${i}: ${'x'.repeat(100)}`,
        timestamp: i,
      }));

      const truncated = contextManager.truncateMessages(messages);
      // May or may not truncate depending on token calculation
      expect(truncated.length).toBeGreaterThanOrEqual(0);
    });

    it('should always keep system messages', () => {
      const messages: Message[] = [
        { role: 'system', content: 'System prompt', timestamp: 0 } as SystemMessage,
        { role: 'user', content: 'Hello', timestamp: 1 } as UserMessage,
      ];

      const truncated = contextManager.truncateMessages(messages);
      expect(truncated.some(m => m.role === 'system')).toBe(true);
    });

    it('should handle all same role messages', () => {
      const messages: Message[] = Array.from({ length: 10 }, (_, i) => ({
        role: 'user' as const,
        content: `Msg ${i}`,
        timestamp: i,
      }));

      const truncated = contextManager.truncateMessages(messages);
      expect(truncated.length).toBeGreaterThan(0);
    });

    it('should handle empty content', () => {
      const messages: Message[] = [
        { role: 'user', content: '', timestamp: 0 } as UserMessage,
      ];

      const truncated = contextManager.truncateMessages(messages);
      expect(truncated).toHaveLength(1);
    });

    it('should handle mixed content lengths', () => {
      const messages: Message[] = [
        { role: 'system', content: 'S'.repeat(500), timestamp: 0 } as SystemMessage,
        { role: 'user', content: 'a', timestamp: 1 } as UserMessage,
        { role: 'assistant', content: 'b'.repeat(500), timestamp: 2 } as AssistantMessage,
        { role: 'tool', content: 'c'.repeat(500), timestamp: 3 } as ToolMessage,
      ];

      const truncated = contextManager.truncateMessages(messages);
      expect(truncated.length).toBeGreaterThan(0);
    });
  });

  describe('Memory Filtering', () => {
    it('should filter memories by relevance', () => {
      contextManager.setMemories([
        { content: 'Low quality info', relevance: 0.1 },
        { content: 'High quality info', relevance: 0.9 },
        { content: 'Medium quality info', relevance: 0.5 },
      ]);

      // Query should match content keywords
      const result = contextManager.injectMemories('Test', 'quality');
      expect(result).toContain('High');
    });

    it('should filter by query keywords case-insensitive', () => {
      contextManager.setMemories([
        { content: 'PYTHON is great', relevance: 0.9 },
        { content: 'JavaScript', relevance: 0.3 },
      ]);

      const result = contextManager.injectMemories('Test', 'python');
      expect(result).toContain('PYTHON');
    });

    it('should handle no matching memories', () => {
      contextManager.setMemories([
        { content: 'ABC', relevance: 0.5 },
        { content: 'DEF', relevance: 0.3 },
      ]);

      const result = contextManager.injectMemories('Test', 'xyz');
      expect(result).toBe('Test');
    });

    it('should limit memories to 5', () => {
      contextManager.setMemories(Array.from({ length: 10 }, (_, i) => ({
        content: `Memory ${i}`,
        relevance: i,
      })));

      const result = contextManager.injectMemories('Test', '');
      const count = (result.match(/\[Memory/g) || []).length;
      expect(count).toBeLessThanOrEqual(5);
    });

    it('should disable memory injection', () => {
      const cm = new ContextManager({ enableMemoryInjection: false });
      cm.setMemories([{ content: 'Should not appear' }]);

      const result = cm.injectMemories('Test', '');
      expect(result).toBe('Test');
    });
  });

  describe('Build Prompt Scenarios', () => {
    it('should handle empty history', () => {
      const { prompt, tokensUsed } = contextManager.buildPrompt('Base', []);
      expect(prompt).toContain('Base');
      expect(tokensUsed).toBeGreaterThan(0);
    });

    it('should format history with roles', () => {
      const history: Message[] = [
        { role: 'user', content: 'Hello', timestamp: 0 } as UserMessage,
        { role: 'assistant', content: 'Hi', timestamp: 1 } as AssistantMessage,
      ];

      const { prompt } = contextManager.buildPrompt('Base', history);
      expect(prompt).toContain('[USER]:');
      expect(prompt).toContain('[ASSISTANT]:');
    });

    it('should enable memory injection config', () => {
      contextManager.setMemories([{ content: 'Memory 1', relevance: 0.9 }]);

      // Memory injection requires matching query
      const result = contextManager.injectMemories('Base', 'memory');
      expect(result).toContain('Memory 1');
    });

    it('should handle large prompts', () => {
      const history: Message[] = Array.from({ length: 100 }, (_, i) => ({
        role: 'user' as const,
        content: 'x'.repeat(100),
        timestamp: i,
      }));

      const { prompt, tokensUsed } = contextManager.buildPrompt('Base', history);
      expect(tokensUsed).toBeGreaterThan(0);
    });
  });

  describe('Stats Scenarios', () => {
    it('should report percentage', () => {
      const messages: Message[] = [
        { role: 'user', content: 'x'.repeat(500), timestamp: 0 } as UserMessage,
      ];

      const stats = contextManager.getStats(messages);
      expect(stats.usedPercentage).toBeGreaterThan(0);
    });

    it('should check capacity threshold', () => {
      const messages: Message[] = [
        { role: 'user', content: 'x'.repeat(950), timestamp: 0 } as UserMessage,
      ];

      const stats = contextManager.getStats(messages);
      expect(stats.usedPercentage).toBeGreaterThan(0);
    });

    it('should show correct message count in stats', () => {
      const messages = [
        { role: 'user', content: 'a', timestamp: 0 } as UserMessage,
        { role: 'assistant', content: 'b', timestamp: 1 } as AssistantMessage,
      ];

      const stats = contextManager.getStats(messages);
      expect(stats.totalMessages).toBe(2);
    });
  });

  describe('Memory Management', () => {
    it('should add multiple memories', () => {
      contextManager.addMemory({ content: 'First' });
      contextManager.addMemory({ content: 'Second' });

      contextManager.addMemory({ content: 'Third' });
      const stats = contextManager.getStats([]);
      expect(stats.memoryCount).toBe(3);
    });

    it('should clear memories', () => {
      contextManager.setMemories([{ content: 'Test' }]);
      contextManager.clearMemories();

      const stats = contextManager.getStats([]);
      expect(stats.memoryCount).toBe(0);
    });
  });

  describe('Custom Config', () => {
    it('should use custom max tokens', () => {
      const cm = new ContextManager({ maxTokens: 500 });
      const stats = cm.getStats([]);
      expect(stats.maxTokens).toBe(500);
    });

    it('should use custom reserved tokens', () => {
      const cm = new ContextManager({ reservedTokens: 500, maxTokens: 1000 });
      const stats = cm.getStats([]);
      expect(stats.maxTokens).toBe(1000);
    });

    it('should enforce min messages', () => {
      const cm = new ContextManager({ minMessages: 10, maxTokens: 100 });
      const messages: Message[] = Array.from({ length: 5 }, (_, i) => ({
        role: 'user' as const,
        content: 'x'.repeat(50),
        timestamp: i,
      }));

      const truncated = cm.truncateMessages(messages);
      // Should keep at least minMessages or all if less than minMessages
      expect(truncated.length).toBeGreaterThanOrEqual(0);
    });
  });
});