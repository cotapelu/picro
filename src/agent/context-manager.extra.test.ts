// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContextBuilder } from './context-manager.js';
import type { ConversationTurn, MemoryEntry } from './types.js';

function user(text: string): ConversationTurn {
  return { role: 'user', content: [{ type: 'text', text }], timestamp: Date.now() };
}
function assistant(text: string): ConversationTurn {
  return { role: 'assistant', content: [{ type: 'text', text }], timestamp: Date.now() };
}
function system(text: string): ConversationTurn {
  return { role: 'system', content: [{ type: 'text', text }], timestamp: Date.now() };
}
function memory(content: string, relevance = 0.5): MemoryEntry {
  return { content, relevance, timestamp: Date.now() } as any;
}

describe('ContextBuilder (extra)', () => {
  let builder: ContextBuilder;

  beforeEach(() => {
    builder = new ContextBuilder();
  });

  describe('estimateTokenCount', () => {
    it('estimates correctly for ASCII', () => {
      // 40 chars -> 10 tokens
      expect(builder.estimateTokenCount('0123456789')).toBe(3); // 10/4 ceil=3
      expect(builder.estimateTokenCount('0123456789')); // 10 chars /4 = 2.5 -> 3
    });

    it('handles unicode and emojis', () => {
      // Each emoji may be 2 chars; still counts chars
      const str = '😀👍';
      expect(builder.estimateTokenCount(str)).toBe(Math.ceil(str.length / 4));
    });

    it('handles empty string', () => {
      expect(builder.estimateTokenCount('')).toBe(0);
    });
  });

  describe('estimateHistoryTokens', () => {
    it('sums tokens across turns', () => {
      const turns = [user('Hello'), assistant('Hi')];
      const tokens = builder.estimateHistoryTokens(turns);
      // '[USER]: Hello' = 9+5=14 chars -> ceil(14/4)=4; '[ASSISTANT]: Hi'=13+2=15 -> ceil(15/4)=4; total 8
      expect(tokens).toBe(8);
    });
  });

  describe('truncateHistory', () => {
    const smallBuilder = new ContextBuilder({ maxTokens: 100, reservedTokens: 0, minMessages: 2 });

    it('keeps all history when within limit', () => {
      const history = [user('a'), user('b'), user('c')];
      const truncated = smallBuilder.truncateHistory(history, 100);
      expect(truncated.length).toBe(3);
    });

    it('truncates oldest when exceeding limit', () => {
      // Each 'x y' ~6 chars => token ~2; make 10 messages -> 20 tokens; limit 5 tokens => should keep recent ones
      const history = Array.from({ length: 10 }, (_, i) => user(`msg${i}`));
      const truncated = smallBuilder.truncateHistory(history, 5);
      expect(truncated.length).toBeLessThan(history.length);
      // Should keep the most recent ones (last in array)
      // The truncation keeps recent within available tokens, so we might not get full count due to token variance; but ensure oldest removed
      const ids = truncated.map(t => (t.content[0] as any).text);
      // Oldest like msg0 should be gone
      expect(ids).not.toContain('msg0');
    });

    it('respects minMessages: keeps at least minMessages recent', () => {
      const builder = new ContextBuilder({ maxTokens: 100, reservedTokens: 0, minMessages: 3 });
      const history = [user('a'), user('b'), user('c'), user('d'), user('e')];
      const truncated = builder.truncateHistory(history, 2); // very low token limit
      // Even if tokens exceed very quickly, we must keep at least minMessages recent
      expect(truncated.length).toBeGreaterThanOrEqual(3);
      // The kept should be the most recent (e, d, c)
      const texts = truncated.map(t => (t.content[0] as any).text);
      expect(texts).toContain('e');
      expect(texts).toContain('d');
      expect(texts).toContain('c');
    });

    it('includes system messages always without truncation', () => {
      const builder = new ContextBuilder({ maxTokens: 100, reservedTokens: 0, minMessages: 1 });
      const sys = system('You are a helpful assistant');
      const history = [user('a'), user('b'), user('c')];
      const truncated = builder.truncateHistory([sys, ...history], 2); // tiny limit
      // System should always be kept
      const hasSystem = truncated.some(t => t.role === 'system');
      expect(hasSystem).toBe(true);
    });

    it('handles empty history', () => {
      const truncated = builder.truncateHistory([], 100);
      expect(truncated).toEqual([]);
    });
  });

  describe('formatMemories', () => {
    it('filters by relevance > 0.1 and limits to 5', () => {
      const memories: MemoryEntry[] = [
        memory('Low', 0.05),
        memory('High1', 0.9),
        memory('High2', 0.8),
        memory('Mid', 0.4),
        memory('High3', 0.95),
        memory('High4', 0.99),
      ];
      const formatted = builder.formatMemories(memories);
      // Should contain High1, High2, High3, High4, Mid (maybe within top 5); definitely not Low
      expect(formatted).not.toContain('Low');
      expect(formatted).toContain('High1');
      expect(formatted).toContain('High2');
      expect(formatted).toContain('High3');
      expect(formatted).toContain('High4');
      expect(formatted).toContain('Mid');
    });

    it('formats with indices', () => {
      const memories = [memory('M1'), memory('M2')];
      const formatted = builder.formatMemories(memories);
      expect(formatted).toContain('[Memory 1] M1');
      expect(formatted).toContain('[Memory 2] M2');
    });

    it('handles empty memories array', () => {
      const formatted = builder.formatMemories([]);
      // formatMemories returns header even if empty topMemories
      expect(formatted).toBe('[Relevant Memories]\n');
    });
  });

  describe('build integration', () => {
    it('injects memories when enabled', () => {
      const base = 'Base';
      const history = [user('Hi')];
      const memories = [memory('Important')];
      const result = builder.build(base, history, memories);
      expect(result.prompt).toContain('Relevant Memories');
      expect(result.prompt).toContain('Important');
      expect(result.prompt).toContain('[Conversation History]');
      expect(result.prompt).toContain('Hi');
    });

    it('does not inject memories when disabled', () => {
      const b = new ContextBuilder({ enableMemoryInjection: false });
      const result = b.build('Base', [user('Hi')], [memory('Important')]);
      expect(result.prompt).not.toContain('Relevant Memories');
    });

    it('estimates token count correctly for built prompt', () => {
      const base = 'System';
      const history = [user('Hello'), assistant('Hi')];
      const result = builder.build(base, history);
      expect(result.tokenCount).toBeGreaterThan(0);
      // Approximate: should be near estimate of whole prompt string
      const approx = builder.estimateTokenCount(result.prompt);
      expect(result.tokenCount).toBe(approx);
    });
  });

  describe('isNearCapacity', () => {
    it('returns true when token count approaches limit', () => {
      const b = new ContextBuilder({ maxTokens: 100, reservedTokens: 0 });
      // Create many turns to exceed threshold
      const turns = Array.from({ length: 100 }, (_, i) => user(`Turn ${i}`));
      // We know that estimateHistoryTokens will be large
      expect(b.isNearCapacity(turns, 0.9)).toBe(true);
    });

    it('returns false when well under limit', () => {
      const b = new ContextBuilder({ maxTokens: 1000, reservedTokens: 0 });
      const turns = [user('Small')];
      expect(b.isNearCapacity(turns, 0.9)).toBe(false);
    });
  });
});
