import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseAgent } from '../src/base-agent';
import { ContextManager } from '../src/context-manager';
import { EventEmitter } from '../src/events';
import type { LLMInstance, ToolDefinition, AgentRunResult, MemoryStore } from '../src/types';
import { createMemoryStoreAdapter } from '../src/adapters/memory-store-adapter';

// Mock LLM
function createMockLLM(response: string) {
  return {
    getModel: () => 'mock-model',
    chatWithTools: async () => ({
      content: response,
      toolCalls: [],
    }),
  } as unknown as LLMInstance;
}

// Mock MemoryApp
function createMockMemoryApp(memories: any[] = []) {
  return {
    recallWithScores: async () => ({
      memories,
      scores: memories.map(() => 0.9),
      query: 'test',
    }),
    // other methods not used
  };
}

describe('Memory Retrieval Integration', () => {
  it('should retrieve memories and inject into context', async () => {
    const mockMemories = [
      { id: '1', content: 'test memory 1', created_at: new Date().toISOString() },
      { id: '2', content: 'test memory 2', created_at: new Date().toISOString() },
    ];
    const memoryApp = createMockMemoryApp(mockMemories);
    const memoryStore = createMemoryStoreAdapter(memoryApp) as MemoryStore;
    const llm = createMockLLM('final answer');
    const tools: ToolDefinition[] = [];

    const agent = new BaseAgent(llm, tools, {
      maxRounds: 1,
      autoSaveMemories: false,
      memoryStore,
    });

    // Spy on emitter
    const contextManager = (agent as any).contextManager;
    const emitter = agent.getEmitter();
    const emitSpy = vi.spyOn(emitter, 'emit');

    // Debug
    console.log('Config memoryApp:', (agent as any).config.memoryApp);
    console.log('typeof recallWithScores:', typeof (agent as any).config.memoryApp?.recallWithScores);

    const result: AgentRunResult = await agent.run('test query');

    // Debug: log all emitted event types
    console.log('emit calls:', emitSpy.mock.calls.map(c => c[0].type));
    const memCall = emitSpy.mock.calls.find(c => c[0].type === 'memory:retrieve');
    console.log('memory retrieve call metadata:', memCall && memCall[0].metadata);

    // Check that memories were set in contextManager
    const injectedMemories = (contextManager as any).memories;
    expect(injectedMemories).toHaveLength(2);
    expect(injectedMemories[0].content).toBe('test memory 1');
    expect(injectedMemories[1].content).toBe('test memory 2');

    // Check that memory:retrieve event was emitted
    expect(emitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'memory:retrieve',
        metadata: expect.objectContaining({
          query: expect.stringContaining('test query'),
          memoryCount: 2,
          memories: mockMemories,
        }),
      })
    );
    expect(result.success).toBe(true);
    expect(result.finalAnswer).toBe('final answer');
  });

  it('should clear memories if memory store throws error', async () => {
    const memoryApp = {
      recallWithScores: async () => {
        throw new Error(' retrieval failed');
      },
    };
    const memoryStore = createMemoryStoreAdapter(memoryApp as any);
    const llm = createMockLLM('answer');
    const tools: ToolDefinition[] = [];

    const agent = new BaseAgent(llm, tools, {
      maxRounds: 1,
      memoryStore,
    });

    const contextManager = (agent as any).contextManager;
    const clearMemoriesSpy = vi.spyOn(contextManager, 'clearMemories');

    const result: AgentRunResult = await agent.run('query');

    expect(clearMemoriesSpy).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  it('should work without memoryStore configured', async () => {
    const llm = createMockLLM('answer');
    const tools: ToolDefinition[] = [];

    const agent = new BaseAgent(llm, tools, {
      maxRounds: 1,
      memoryStore: undefined,
    });

    const contextManager = (agent as any).contextManager;
    const clearMemoriesSpy = vi.spyOn(contextManager, 'clearMemories');

    await agent.run('query');

    expect(clearMemoriesSpy).toHaveBeenCalled();
  });
});
