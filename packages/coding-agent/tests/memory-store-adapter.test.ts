import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMemoryStoreAdapter } from '../src/memory-store-adapter.js';
import type { AgentMemoryApp } from '@picro/memory';

// Mock AgentMemoryApp với các method cần thiết
function createMockMemory(): AgentMemoryApp {
  const entries: any[] = [];
  return {
    init: vi.fn(),
    remember: vi.fn().mockImplementation(async (action, content, metadata) => {
      const id = `id-${Date.now()}-${Math.random()}`;
      entries.push({ id, content, metadata: { action, ...metadata } });
      return id;
    }),
    recallWithScores: vi.fn().mockResolvedValue({ memories: [], scores: [], query: '' }),
    getAll: vi.fn().mockImplementation(() => Promise.resolve(entries.slice())),
    count: vi.fn().mockImplementation(() => Promise.resolve(entries.length)),
    clear: vi.fn().mockResolvedValue(undefined),
    deleteMemory: vi.fn().mockResolvedValue(true),
    updateMemory: vi.fn().mockResolvedValue(true),
    getMemoryCount: vi.fn().mockReturnValue(entries.length),
    getStats: vi.fn().mockReturnValue({}),
  } as any;
}

describe('MemoryStoreAdapter', () => {
  let memory: AgentMemoryApp;
  let adapter: any;

  beforeEach(() => {
    memory = createMockMemory();
    adapter = createMemoryStoreAdapter(memory);
  });

  it('should get memory by id', async () => {
    // Add a memory first
    const id = await memory.remember('test', 'content', {});
    const result = await adapter.get(id);
    expect(result).toBeDefined();
    expect(result.id).toBe(id);
  });

  it('should add a memory', async () => {
    const content = 'test content';
    const metadata = { action: 'user_input' };
    const id = await adapter.add(content, metadata);
    expect(typeof id).toBe('string');
    expect(memory.remember).toHaveBeenCalledWith('user_input', content, metadata);
  });

  // Note: MemoryStore interface does not expose delete operation; deletion is handled via AgentMemoryApp directly.
  // So the adapter does not forward delete.

  it('should get all memories', async () => {
    await memory.remember('test', 'a', {});
    await memory.remember('test', 'b', {});
    const all = await adapter.getAll();
    expect(all).toHaveLength(2);
  });

  it('should count memories', async () => {
    await memory.remember('test', 'a', {});
    await memory.remember('test', 'b', {});
    const count = await adapter.count();
    expect(count).toBe(2);
  });
});
