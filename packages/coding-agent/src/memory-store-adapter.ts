import type { MemoryStore } from '@picro/agent';
import { AgentMemoryApp, type AgentAction, type AgentMemoryMetadata } from '@picro/memory';

/**
 * Adapter to convert AgentMemoryApp (high-level API) into MemoryStore interface
 * that Agent expects.
 */
export function createMemoryStoreAdapter(app: AgentMemoryApp): MemoryStore {
  return {
    async recall(query: string, options?: { topK?: number }) {
      const result = await app.recallWithScores(query, options);
      return result;
    },

    async remember(action: string, content: string, metadata?: any) {
      return app.remember(action as AgentAction, content, metadata as Partial<AgentMemoryMetadata>);
    },

    async getAll() {
      return app.getAll();
    },

    async count() {
      return app.count();
    },

    async clear() {
      await app.clear();
    },

    async init() {
      await app.init();
    },
  };
}
