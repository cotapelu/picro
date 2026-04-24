import { createMemoryStoreAdapter } from '../src/memory-store-adapter.js';
import type { MemoryStore } from '@picro/agent';
import type { AgentMemoryApp } from '@picro/memory';

describe('MemoryStoreAdapter', () => {
  let mockApp: any;
  let adapter: MemoryStore;

  beforeEach(() => {
    mockApp = {
      recallWithScores: vi.fn().mockResolvedValue({ memories: [], scores: [] }),
      remember: vi.fn().mockResolvedValue(undefined),
      getAll: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      clear: vi.fn().mockResolvedValue(undefined),
      init: vi.fn().mockResolvedValue(undefined),
    };
    adapter = createMemoryStoreAdapter(mockApp);
  });

  it('recall should call app.recallWithScores', async () => {
    const result = await adapter.recall('test query', { topK: 5 });
    expect(mockApp.recallWithScores).toHaveBeenCalledWith('test query', { topK: 5 });
    expect(result).toEqual({ memories: [], scores: [] });
  });

  it('remember should call app.remember with proper types', async () => {
    await adapter.remember('read_file', 'file content', { summary: 'summary' });
    expect(mockApp.remember).toHaveBeenCalledWith('read_file', 'file content', { summary: 'summary' });
  });

  it('getAll should call app.getAll', async () => {
    const result = await adapter.getAll();
    expect(mockApp.getAll).toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('count should call app.count', async () => {
    const result = await adapter.count();
    expect(mockApp.count).toHaveBeenCalled();
    expect(result).toBe(0);
  });

  it('clear should call app.clear', async () => {
    await adapter.clear();
    expect(mockApp.clear).toHaveBeenCalled();
  });

  it('init should call app.init', async () => {
    await adapter.init();
    expect(mockApp.init).toHaveBeenCalled();
  });
});
