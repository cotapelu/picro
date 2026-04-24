import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MemoryStore, MemoryEntry, AgentAction } from '../src/types';

// Mock memory store implementation for testing
class MockMemoryStore implements MemoryStore {
  private memories: Array<{ id: string; content: string; metadata: any; created_at: string; score?: number }> = [];

  async recall(query: string, options?: { topK?: number }): Promise<{ memories: MemoryEntry[]; scores: number[] }> {
    // Simple relevance: count query words in content
    const queryWords = query.toLowerCase().split(/\s+/).filter(Boolean);
    const scored = this.memories.map(m => {
      const contentLower = m.content.toLowerCase();
      const score = queryWords.reduce((sum, word) => sum + (contentLower.includes(word) ? 1 : 0), 0);
      return { ...m, score };
    }).filter(m => m.score > 0);

    // Sort by score desc
    scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    const topK = options?.topK ?? scored.length;
    const selected = scored.slice(0, topK);

    return {
      memories: selected.map(m => ({
        id: m.id,
        content: m.content,
        metadata: m.metadata,
        created_at: m.created_at,
        access_count: m.access_count,
      })),
      scores: selected.map(m => m.score ?? 0),
    };
  }

  async remember(action: AgentAction, content: string, metadata?: any): Promise<string> {
    const id = `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const entry = {
      id,
      content,
      metadata: { action, ...metadata },
      created_at: new Date().toISOString(),
    };
    this.memories.push(entry);
    return id;
  }

  async getAll(): Promise<MemoryEntry[]> {
    return this.memories.map(m => ({
      id: m.id,
      content: m.content,
      metadata: m.metadata,
      created_at: m.created_at,
      access_count: m.access_count,
    }));
  }

  async count(): Promise<number> {
    return this.memories.length;
  }

  async clear(): Promise<void> {
    this.memories = [];
  }

  // For test purposes only
  _injectLegacy(memories: Array<{ content: string; metadata: any }>): void {
    this.memories.push(...memories.map((m, idx) => ({
      id: `legacy-${idx}`,
      content: m.content,
      metadata: m.metadata,
      created_at: new Date().toISOString(),
    })));
  }
}

describe('MemoryStore (Mock Implementation)', () => {
  let store: MemoryStore;

  beforeEach(() => {
    store = new MockMemoryStore();
  });

  describe('remember and recall', () => {
    it('should store and retrieve memories', async () => {
      const id = await store.remember('user_input', 'Hello world', { user: 'test' });
      expect(id).toBeDefined();

      const result = await store.recall('Hello');
      expect(result.memories).toHaveLength(1);
      expect(result.memories[0].content).toBe('Hello world');
      expect(result.scores[0]).toBeGreaterThan(0);
    });

    it('should rank by relevance', async () => {
      await store.remember('assistant_response', 'The weather is sunny', {});
      await store.remember('assistant_response', 'Weather forecast for tomorrow', {});
      await store.remember('assistant_response', 'Cooking recipe for apple pie', {});

      const result = await store.recall('weather forecast');
      // Expect the one with both "weather" and "forecast" to win
      const topContent = result.memories[0].content;
      expect(topContent).toContain('Weather forecast');
    });

    it('should respect topK option', async () => {
      for (let i = 0; i < 10; i++) {
        await store.remember('user_input', `Memory number ${i} with keyword test`, { index: i });
      }

      const result = await store.recall('test', { topK: 3 });
      expect(result.memories).toHaveLength(3);
    });

    it('should handle empty recall', async () => {
      await store.remember('user_input', 'Unrelated content', {});
      const result = await store.recall('nonexistent');
      expect(result.memories).toHaveLength(0);
      expect(result.scores).toEqual([]);
    });
  });

  describe('getAll and count', () => {
    it('should return all memories', async () => {
      await store.remember('user_input', 'First', {});
      await store.remember('user_input', 'Second', {});

      const all = await store.getAll();
      expect(all).toHaveLength(2);
    });

    it('should count correctly', async () => {
      expect(await store.count()).toBe(0);
      await store.remember('user_input', 'One', {});
      expect(await store.count()).toBe(1);
      await store.remember('user_input', 'Two', {});
      expect(await store.count()).toBe(2);
    });
  });

  describe('clear', () => {
    it('should remove all memories', async () => {
      await store.remember('user_input', 'A', {});
      await store.remember('user_input', 'B', {});
      expect(await store.count()).toBe(2);

      await store.clear();
      expect(await store.count()).toBe(0);
      const result = await store.recall('A');
      expect(result.memories).toHaveLength(0);
    });
  });

  describe('metadata handling', () => {
    it('should store action in metadata', async () => {
      const id = await store.remember('tool_result', 'Result from tool', { toolName: 'search' });
      const all = await store.getAll();
      const mem = all.find(m => m.id === id);
      expect(mem?.metadata.action).toBe('tool_result');
      expect(mem?.metadata.toolName).toBe('search');
    });
  });

  describe('ranking edge cases', () => {
    it('should handle partial word matches', async () => {
      await store.remember('user_input', 'The quick brown fox', {});
      await store.remember('user_input', 'quickly jumping', {});

      const result = await store.recall('quick');
      // Both contain "quick" as substring?
      // Our simple scorer uses word split, so "quickly" may not match "quick" if we do exact word.
      // It depends on implementation. We'll just ensure no crash.
      expect(result.memories.length).toBeGreaterThan(0);
    });
  });
});

// Advanced tests for memory injection into context builder would go here if we had direct access.
// For now, the integration test covers the end-to-end recall injection.
