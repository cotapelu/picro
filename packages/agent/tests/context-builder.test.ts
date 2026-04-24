import { describe, it, expect } from 'vitest';
import { ContextBuilder } from '../src/context-builder';
import type { ConversationTurn, MemoryEntry } from '../src/types';

describe('ContextBuilder', () => {
  const createTurn = (role: string, text: string): ConversationTurn => ({
    role: role as any,
    content: [{ type: 'text', text }],
    timestamp: Date.now(),
  });

  describe('build', () => {
    it('should combine base prompt, memories, and history', () => {
      const builder = new ContextBuilder();

      const history = [
        createTurn('user', 'User message'),
        createTurn('assistant', 'Assistant reply'),
      ];

      const memories: MemoryEntry[] = [
        { content: 'Memory 1', relevance: 0.9 },
        { content: 'Memory 2', relevance: 0.7 },
      ];

      const { prompt } = builder.build('Base prompt', history, memories);

      expect(prompt).toContain('Base prompt');
      expect(prompt).toContain('[Relevant Memories]');
      expect(prompt).toContain('Memory 1');
      expect(prompt).toContain('Memory 2');
      expect(prompt).toContain('[Conversation History]');
      expect(prompt).toContain('[USER]: User message');
      expect(prompt).toContain('[ASSISTANT]: Assistant reply');
    });

    it('should not inject memories when not provided', () => {
      const builder = new ContextBuilder();
      const history = [createTurn('user', 'Hello')];

      const { prompt } = builder.build('Prompt', history);

      expect(prompt).not.toContain('[Relevant Memories]');
      expect(prompt).toContain('[Conversation History]');
    });

    it('should respect token limit by truncating history', () => {
      const builder = new ContextBuilder({ maxTokens: 100, minMessages: 2 });

      const history: ConversationTurn[] = Array.from({ length: 10 }, (_, i) =>
        createTurn('user', `Message ${i} with some length`)
      );

      const { prompt, tokenCount } = builder.build('Prompt', history);

      // Token count should be under limit
      expect(tokenCount).toBeLessThan(100);
    });

    it('should keep system messages regardless', () => {
      const builder = new ContextBuilder({ maxTokens: 50, minMessages: 1 });

      const history: ConversationTurn[] = [
        createTurn('system', 'You are a helpful assistant'),
        createTurn('user', 'Hello'),
        ...Array.from({ length: 5 }, (_, i) =>
          createTurn('user', `Long message ${i} `.repeat(10))
        ),
      ];

      const { prompt } = builder.build('Base', history);

      expect(prompt).toContain('[SYSTEM]: You are a helpful assistant');
    });
  });

  describe('estimateTokenCount', () => {
    it('should estimate tokens (chars / 4)', () => {
      const builder = new ContextBuilder();
      expect(builder.estimateTokenCount('abcdefghij')).toBe(3); // 10/4 = 2.5 -> 3
    });
  });

  describe('estimateHistoryTokens', () => {
    it('should sum tokens for all turns', () => {
      const builder = new ContextBuilder();
      const history = [
        createTurn('user', 'Hello'),
        createTurn('assistant', 'Hi there user'),
      ];

      const tokens = builder.estimateHistoryTokens(history);
      expect(tokens).toBeGreaterThan(0);
    });
  });

  describe('isNearCapacity', () => {
    it('should return true when near limit', () => {
      const builder = new ContextBuilder({ maxTokens: 100, reservedTokens: 10 });
      const history = [createTurn('user', 'A'.repeat(400))]; // ~100 tokens

      expect(builder.isNearCapacity(history, 0.9)).toBe(true);
    });

    it('should return false when well under limit', () => {
      const builder = new ContextBuilder({ maxTokens: 1000, reservedTokens: 100 });
      const history = [createTurn('user', 'Short')];

      expect(builder.isNearCapacity(history, 0.9)).toBe(false);
    });
  });
});
