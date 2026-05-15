// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect } from 'vitest';
import { Agent } from './agent';
import type { AgentConfig, LLMResponse } from './types';

// Mock LLM provider
const mockLLMProvider = async (prompt: string, tools: any[], options?: any): Promise<LLMResponse> => {
  return {
    content: 'Mock response',
    stopReason: 'stop',
    usage: { input: 10, output: 20, totalTokens: 30, cost: { input: 0, output: 0, total: 0 } },
    toolCalls: [],
  };
};

function createTestConfig(overrides?: Partial<AgentConfig>): AgentConfig {
  return {
    maxRounds: 3,
    verbose: false,
    toolTimeout: 30000,
    cacheResults: false,
    toolExecutionStrategy: 'parallel',
    contextBuilder: {
      maxTokens: 128000,
      reservedTokens: 4096,
      minMessages: 5,
      enableMemoryInjection: true,
    },
    executor: {
      timeout: 30000,
      cacheEnabled: false,
      toolExecutionStrategy: 'parallel',
    },
    enableLogging: false,
    steeringMode: 'dequeue-one',
    followUpMode: 'dequeue-one',
    debug: false,
    compaction: { enabled: true, autoCompact: true },
    ...overrides,
  };
}

describe('Agent', () => {
  it('should forward user prompt to runner and record in history', async () => {
    const config = createTestConfig();
    const agent = new Agent(undefined as any, [], config);
    agent.setLLMProvider(mockLLMProvider);

    await agent.run('Hello world');

    const state = agent.getState();
    expect(state.history.length).toBeGreaterThan(0);
    const userTurn = state.history.find(turn => turn.role === 'user');
    expect(userTurn).toBeDefined();
    const textBlock = (userTurn!.content as any[]).find(c => c.type === 'text');
    expect(textBlock).toBeDefined();
    expect(textBlock.text).toBe('Hello world');
  });

  it('should record assistant response in history', async () => {
    const config = createTestConfig();
    const agent = new Agent(undefined as any, [], config);
    agent.setLLMProvider(mockLLMProvider);

    await agent.run('Test prompt');

    const state = agent.getState();
    const assistantTurns = state.history.filter(turn => turn.role === 'assistant');
    expect(assistantTurns.length).toBe(1);
    expect(assistantTurns[0].content).toEqual([{ type: 'text', text: 'Mock response' }]);
  });
});
