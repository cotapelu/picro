// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi } from 'vitest';
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

  describe('reset', () => {
    it('should clear history and queues', async () => {
      const config = createTestConfig();
      const agent = new Agent(undefined as any, [], config);
      agent.setLLMProvider(mockLLMProvider);

      // Run once to populate history
      await agent.run('First');
      expect(agent.getState().history.length).toBeGreaterThan(0);

      // Add some queued messages
      agent.steer({ role: 'user', content: [{ type: 'text', text: 'Steered' }], timestamp: Date.now() });
      agent.followUp({ role: 'user', content: [{ type: 'text', text: 'FollowUp' }], timestamp: Date.now() });
      expect(agent.hasQueuedMessages()).toBe(true);

      // Reset
      agent.reset();

      // Verify cleared
      expect(agent.getState().history).toEqual([]);
      expect(agent.hasQueuedMessages()).toBe(false);
    });

    it('should throw if called while running', async () => {
      const config = createTestConfig();
      const agent = new Agent(undefined as any, [], config);
      // Provider that blocks indefinitely unless aborted
      agent.setLLMProvider((prompt, tools, options) => {
        return new Promise((resolve, reject) => {
          const onAbort = () => {
            reject(new Error('aborted'));
          };
          options?.signal?.addEventListener('abort', onAbort, { once: true });
        });
      });

      const runPromise = agent.run('Test');
      // The agent should be running immediately
      expect(agent.getState().isRunning).toBe(true);
      // Reset should throw
      expect(() => agent.reset()).toThrow('Cannot reset agent while it is running');

      // Clean up - abort, then wait for run to terminate (may produce error result, not necessarily reject)
      agent.abort();
      const result = await runPromise;
      expect(result.success).toBe(false);
      expect(result.stopReason).toBe('aborted');
    });

    it('should allow reuse after reset', async () => {
      const config = createTestConfig();
      const agent = new Agent(undefined as any, [], config);
      agent.setLLMProvider(mockLLMProvider);

      await agent.run('First');
      expect(agent.getState().history.length).toBeGreaterThan(0);

      agent.reset();
      expect(agent.getState().history).toEqual([]);

      await agent.run('Second');
      expect(agent.getState().history.length).toBeGreaterThan(0);
      // Check that second prompt is present
      const userTurn = agent.getState().history.find(t => t.role === 'user');
      const text = (userTurn!.content as any[]).find(c => c.type === 'text');
      expect((text as any).text).toBe('Second');
    });
  });

  describe('waitForIdle', () => {
    it('should resolve immediately when agent is idle', async () => {
      const config = createTestConfig();
      const agent = new Agent(undefined as any, [], config);
      agent.setLLMProvider(mockLLMProvider);

      await expect(agent.waitForIdle()).resolves.toBeUndefined();
    });

    it('should resolve after run completes', async () => {
      const config = createTestConfig();
      const agent = new Agent(undefined as any, [], config);
      // Use a slower provider (200ms) to ensure run is still in progress
      agent.setLLMProvider(async () => {
        await new Promise(r => setTimeout(r, 200));
        return mockLLMProvider('', []);
      });

      const runPromise = agent.run('Test');
      // While running, idle is pending. We'll check via a flag.
      let resolved = false;
      agent.waitForIdle().then(() => { resolved = true; });
      // Give some time; should not resolve yet
      await new Promise(r => setTimeout(r, 100));
      expect(resolved).toBe(false);

      await runPromise;
      // After completion, new call to waitForIdle should resolve immediately
      await expect(agent.waitForIdle()).resolves.toBeUndefined();
      // And the earlier pending call should have resolved
      expect(resolved).toBe(true);
    });

    it('should resolve after abort', async () => {
      const config = createTestConfig();
      const agent = new Agent(undefined as any, [], config);
      // Provider that blocks until aborted
      agent.setLLMProvider((prompt, tools, options) => {
        return new Promise((resolve, reject) => {
          const onAbort = () => reject(new Error('aborted'));
          options?.signal?.addEventListener('abort', onAbort, { once: true });
        });
      });

      const runPromise = agent.run('Long');
      let resolved = false;
      agent.waitForIdle().then(() => { resolved = true; });
      await new Promise(r => setTimeout(r, 100));
      expect(resolved).toBe(false);

      agent.abort();
      await runPromise;
      await expect(agent.waitForIdle()).resolves.toBeUndefined();
      expect(resolved).toBe(true);
    });
  });
});
