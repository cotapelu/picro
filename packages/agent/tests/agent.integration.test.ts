import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Agent } from '../src/agent';
import type { ToolDefinition, AIModel, LLMResponse, ToolCallData } from '../src/types';

function createSequentialMockLLM(responses: LLMResponse[]): any {
  let callIndex = 0;
  return async (prompt: string, tools: any[]): Promise<LLMResponse> => {
    const response = responses[callIndex % responses.length];
    callIndex++;
    await Promise.resolve();
    return response;
  };
}

const createMockModel = (): AIModel => ({
  id: 'test-model',
  name: 'Test Model',
  api: 'test',
  provider: 'test',
  contextWindow: 100000,
  maxTokens: 4000,
  inputCost: 0,
  outputCost: 0,
});

describe('Agent Integration (Multi-round)', () => {
  let agent: Agent;
  let model: AIModel;

  beforeEach(() => {
    model = createMockModel();

    const tools: ToolDefinition[] = [
      {
        name: 'search',
        description: 'Search the web',
        parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
        handler: async (args: { query: string }) => `Search results for: ${args.query}`,
      },
      {
        name: 'calculate',
        description: 'Calculate math',
        parameters: { type: 'object', properties: { expression: { type: 'string' } }, required: ['expression'] },
        handler: async (args: { expression: string }) => `Result: ${args.expression} = 42`,
      },
    ];

    agent = new Agent(model, tools, { maxRounds: 5 });
  });

  it('should execute tool and then answer', async () => {
    const responses: LLMResponse[] = [
      { content: 'I need to search.', toolCalls: [{ id: 'call1', name: 'search', arguments: { query: 'weather' } }], stopReason: 'toolUse', usage: { input: 10, output: 5, totalTokens: 15, cost: { input: 0, output: 0, total: 0 } } },
      { content: 'The weather is sunny.', stopReason: 'stop', usage: { input: 20, output: 10, totalTokens: 30, cost: { input: 0, output: 0, total: 0 } } },
    ];

    agent.setLLMProvider(createSequentialMockLLM(responses));
    const result = await agent.run('What is the weather?');

    expect(result.success).toBe(true);
    expect(result.finalAnswer).toBe('The weather is sunny.');
    expect(result.totalRounds).toBe(2);
    expect(result.totalToolCalls).toBe(1);
    expect(result.toolResults[0].toolName).toBe('search');
  });

  it('should handle multiple tools in one round', async () => {
    const responses: LLMResponse[] = [
      { content: 'I will search and calculate.', toolCalls: [{ id: 'c1', name: 'search', arguments: { query: 'AI' } }, { id: 'c2', name: 'calculate', arguments: { expression: '2+2' } }], stopReason: 'toolUse', usage: { input: 15, output: 8, totalTokens: 23, cost: { input: 0, output: 0, total: 0 } } },
      { content: 'AI is cool and 2+2=4.', stopReason: 'stop', usage: { input: 25, output: 12, totalTokens: 37, cost: { input: 0, output: 0, total: 0 } } },
    ];

    agent.setLLMProvider(createSequentialMockLLM(responses));
    const result = await agent.run('Do both');

    expect(result.success).toBe(true);
    expect(result.totalRounds).toBe(2);
    expect(result.totalToolCalls).toBe(2);
    expect(result.toolResults.map(r => r.toolName)).toContain('search');
    expect(result.toolResults.map(r => r.toolName)).toContain('calculate');
  });

  it('should respect maxRounds limit', async () => {
    const toolCall: ToolCallData = { id: 'c1', name: 'search', arguments: { query: 'loop' } };
    const responses = Array(10).fill({
      content: 'Keep searching...',
      toolCalls: [toolCall],
      stopReason: 'toolUse' as const,
      usage: { input: 10, output: 5, totalTokens: 15, cost: { input: 0, output: 0, total: 0 } },
    });

    agent = new Agent(model, [{ name: 'search', description: 's', parameters: {}, handler: async () => 'ok' }], { maxRounds: 3 });
    agent.setLLMProvider(createSequentialMockLLM(responses));
    const result = await agent.run('Loop test');

    expect(result.success).toBe(false);
    expect(result.stopReason).toBe('max_rounds');
    expect(result.totalRounds).toBe(3);
  });

  it('should handle tool errors gracefully', async () => {
    const responses: LLMResponse[] = [
      { content: '', toolCalls: [{ id: 'c1', name: 'unknown_tool', arguments: {} }], stopReason: 'toolUse', usage: { input: 5, output: 2, totalTokens: 7, cost: { input: 0, output: 0, total: 0 } } },
      { content: 'The tool failed but I continue.', stopReason: 'stop', usage: { input: 10, output: 10, totalTokens: 20, cost: { input: 0, output: 0, total: 0 } } },
    ];

    agent.setLLMProvider(createSequentialMockLLM(responses));
    const result = await agent.run('Try tool');

    expect(result.success).toBe(true);
    expect(result.toolResults.some(r => r.isError)).toBe(true);
  });

  it('should support steering messages', async () => {
    const responses: LLMResponse[] = [
      { content: 'Answer', stopReason: 'stop', usage: { input: 5, output: 5, totalTokens: 10, cost: { input: 0, output: 0, total: 0 } } },
    ];

    agent.setLLMProvider(createSequentialMockLLM(responses));
    agent.steer({ role: 'user', content: [{ type: 'text', text: 'Steer me!' }], timestamp: Date.now() });
    const result = await agent.run('Start');

    expect(result.success).toBe(true);
    expect(result.finalAnswer).toBe('Answer');
  });

  it('should call before/after hooks', async () => {
    const beforeHook = vi.fn(async () => undefined);
    const afterHook = vi.fn(async () => undefined);

    const agentWithHooks = new Agent(model, [
      { name: 'test', description: 't', parameters: {}, handler: async () => 'done' },
    ], {
      maxRounds: 1,
      executor: { beforeToolCall: beforeHook, afterToolCall: afterHook, timeout: 5000, cacheEnabled: false, toolExecutionStrategy: 'sequential' },
    });

    const responses: LLMResponse[] = [
      { content: '', toolCalls: [{ id: 'c1', name: 'test', arguments: {} }], stopReason: 'toolUse', usage: { input: 5, output: 2, totalTokens: 7, cost: { input: 0, output: 0, total: 0 } } },
      { content: 'Finished', stopReason: 'stop', usage: { input: 10, output: 5, totalTokens: 15, cost: { input: 0, output: 0, total: 0 } } },
    ];

    agentWithHooks.setLLMProvider(createSequentialMockLLM(responses));
    await agentWithHooks.run('Do test');

    expect(beforeHook).toHaveBeenCalled();
    expect(afterHook).toHaveBeenCalled();
  });

  it('should integrate with memory store', async () => {
    const memoryRecall = vi.fn().mockResolvedValue({
      memories: [{ content: 'prev context', relevance: 0.9 }],
      scores: [0.9],
    });
    const memoryRemember = vi.fn().mockResolvedValue('mem-id');

    const memoryStore = {
      recall: memoryRecall,
      remember: memoryRemember,
      getAll: async () => [],
      count: async () => 0,
      clear: async () => {},
    };

    const agentWithMemory = new Agent(model, [
      {
        name: 'echo',
        description: 'echo',
        parameters: { type: 'object', properties: { text: { type: 'string' } } },
        handler: async (args: { text: string }) => args.text,
      },
    ], {
      maxRounds: 2,
      memoryStore,
      autoSaveMemories: true,
    });

    const responses: LLMResponse[] = [
      {
        content: 'Hi',
        toolCalls: [{ id: 'c1', name: 'echo', arguments: { text: 'hello' } }],
        stopReason: 'toolUse',
        usage: { input: 5, output: 2, totalTokens: 7, cost: { input: 0, output: 0, total: 0 } },
      },
      {
        content: 'Done',
        stopReason: 'stop',
        usage: { input: 10, output: 5, totalTokens: 15, cost: { input: 0, output: 0, total: 0 } },
      },
    ];

    agentWithMemory.setLLMProvider(createSequentialMockLLM(responses));
    await agentWithMemory.run('Test memory');

    expect(memoryRecall).toHaveBeenCalled();
    expect(memoryRemember).toHaveBeenCalled();
  });
});
