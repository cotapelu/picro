/**
 * Integration Tests - Full Workflow Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseAgent } from '../src/base-agent.js';
import { ContextManager } from '../src/context-manager.js';
import { ToolExecutor } from '../src/tool-executor.js';
import { EventEmitter } from '../src/events.js';
import { ReActStrategy, PlanAndSolveStrategy } from '../src/loop-strategy.js';
import type { LLMInstance, LLMResponse, ToolDefinition, AgentState, Message } from '../src/types.js';

describe('Integration: BaseAgent + LLM + Tools', () => {
  it('should complete full Q&A workflow with tools', async () => {
    const llm: LLMInstance = {
      chatWithTools: vi.fn().mockImplementation(async (prompt) => {
        if (prompt.includes('search')) {
          return {
            content: 'I will search.',
            toolCalls: [{ id: 'c1', name: 'search', arguments: { query: 'AI' } }],
          };
        }
        return { content: 'Based on search results', toolCalls: [] };
      }),
      chat: async () => 'Answer',
      getModel: () => 'test',
    };

    const tools: ToolDefinition[] = [
      { name: 'search', description: 'Search', handler: async (args) => `Found: ${args.query}` },
    ];

    const agent = new BaseAgent(llm, tools, { maxRounds: 5 });
    const result = await agent.run('What is AI?');

    expect(result.success).toBe(true);
  });

  it('should handle multiple tool calls in one round', async () => {
    let toolCount = 0;
    const llm: LLMInstance = {
      chatWithTools: vi.fn().mockImplementation(async (prompt) => {
        if (prompt.includes('Tool Results')) {
          return { content: 'Done', toolCalls: [] };
        }
        return {
          content: 'Calling',
          toolCalls: [
            { id: 'c1', name: 'search', arguments: { q: 'a' } },
            { id: 'c2', name: 'calc', arguments: { n: 1 } },
          ],
        };
      }),
      chat: async () => 'OK',
      getModel: () => 'test',
    };

    const tools: ToolDefinition[] = [
      { name: 'search', description: '', handler: async () => { toolCount++; return 'R1'; } },
      { name: 'calc', description: '', handler: async () => { toolCount++; return 'R2'; } },
    ];

    const agent = new BaseAgent(llm, tools);
    const result = await agent.run('Do both');

    expect(result.totalToolCalls).toBe(2);
  });

  it('should recover from tool error', async () => {
    const llm: LLMInstance = {
      chatWithTools: vi.fn().mockImplementation(async (prompt) => {
        if (prompt.includes('Error')) return { content: 'Handled', toolCalls: [] };
        return { content: 'Call', toolCalls: [{ id: 'c1', name: 'fail', arguments: {} }] };
      }),
      chat: async () => 'OK',
      getModel: () => 'test',
    };

    const tools: ToolDefinition[] = [
      { name: 'fail', description: '', handler: async () => { throw new Error('Oops'); } },
    ];

    const agent = new BaseAgent(llm, tools);
    const result = await agent.run('Try');

    expect(result.totalToolCalls).toBe(1);
  });
});

describe('Integration: ToolExecutor + EventEmitter', () => {
  it('should emit events during execution', async () => {
    const events: any[] = [];
    const emitter = new EventEmitter();
    emitter.onAny((e) => events.push(e));

    const executor = new ToolExecutor({ emitter });
    executor.registerTool({
      name: 'test', description: 'Test', handler: async () => 'result',
    });

    await executor.execute({ id: 'c1', name: 'test', arguments: {} });

    const types = events.map(e => e.type);
    expect(types).toContain('tool:call');
    expect(types).toContain('tool:result');
  });

  it('should emit error event on failure', async () => {
    const errors: any[] = [];
    const emitter = new EventEmitter();
    emitter.on('tool:error', (e) => errors.push(e));

    const executor = new ToolExecutor({ emitter });
    executor.registerTool({
      name: 'bad', description: '', handler: async () => { throw new Error('Oops'); },
    });

    await executor.execute({ id: 'c1', name: 'bad', arguments: {} });

    expect(errors.length).toBe(1);
  });
});

describe('Integration: ContextManager + Memory', () => {
  it('should inject relevant memories', () => {
    const cm = new ContextManager({ enableMemoryInjection: true });
    cm.setMemories([
      { content: 'User likes dark mode', relevance: 0.9 },
    ]);

    const prompt = cm.injectMemories('Settings', 'dark');
    expect(prompt).toContain('dark mode');
  });

  it('should build prompt with history', () => {
    const cm = new ContextManager({ maxTokens: 1000, minMessages: 2 });

    const history: Message[] = [
      { role: 'user', content: 'Hello', timestamp: 0 } as any,
      { role: 'assistant', content: 'Hi', timestamp: 1 } as any,
    ];

    const { prompt, tokensUsed } = cm.buildPrompt('Current', history, 'test');
    expect(prompt).toContain('Current');
    expect(tokensUsed).toBeGreaterThan(0);
  });
});

describe('Integration: Multiple Strategies', () => {
  it('should use ReAct strategy', async () => {
    const llm: LLMInstance = {
      chatWithTools: vi.fn()
        .mockResolvedValueOnce({ content: 'Thinking', toolCalls: [{ id: 'c1', name: 'search', arguments: {} }] })
        .mockResolvedValueOnce({ content: 'Done', toolCalls: [] }),
      chat: async () => 'OK',
      getModel: () => 'test',
    };

    const agent = new BaseAgent(llm, [
      { name: 'search', description: '', handler: async () => 'Found' },
    ], { strategy: new ReActStrategy() });

    const result = await agent.run('Test');
    expect(result.success).toBe(true);
  });

  it('should use Plan & Solve strategy', async () => {
    const llm: LLMInstance = {
      chatWithTools: vi.fn()
        .mockResolvedValueOnce({ content: 'Plan: step 1', toolCalls: [{ id: 'c1', name: 'do', arguments: {} }] })
        .mockResolvedValueOnce({ content: 'Done', toolCalls: [] }),
      chat: async () => 'OK',
      getModel: () => 'test',
    };

    const agent = new BaseAgent(llm, [
      { name: 'do', description: '', handler: async () => 'Done' },
    ], { strategy: new PlanAndSolveStrategy() });

    const result = await agent.run('Test');
    expect(result.success).toBe(true);
  });
});

describe('Integration: Streaming', () => {
  it('should stream and collect response', async () => {
    const llm: LLMInstance = {
      chatWithTools: vi.fn().mockResolvedValue({ content: 'Streamed content', toolCalls: [] }),
      chat: async () => 'OK',
      getModel: () => 'test',
    };

    const agent = new BaseAgent(llm, []);
    let collected = '';

    for await (const chunk of agent.stream('Test')) {
      if (chunk.type === 'text_delta') {
        collected += chunk.delta;
      }
    }

    expect(collected).toContain('content');
  });

  it('should emit done chunk', async () => {
    const llm: LLMInstance = {
      chatWithTools: vi.fn().mockResolvedValue({ content: 'Done', toolCalls: [] }),
      chat: async () => 'OK',
      getModel: () => 'test',
    };

    const agent = new BaseAgent(llm, []);
    let done = false;

    for await (const chunk of agent.stream('Test')) {
      if (chunk.type === 'done') done = true;
    }

    expect(done).toBe(true);
  });
});

describe('Integration: Error Recovery', () => {
  it('should handle LLM API failure', async () => {
    const llm: LLMInstance = {
      chatWithTools: vi.fn().mockRejectedValue(new Error('Rate limit')),
      chat: async () => 'Error',
      getModel: () => 'test',
    };

    const agent = new BaseAgent(llm, []);
    const result = await agent.run('Test');

    expect(result.success).toBe(false);
  });

  it('should handle abort signal', async () => {
    const llm: LLMInstance = {
      chatWithTools: vi.fn().mockResolvedValue({ content: 'Done', toolCalls: [] }),
      chat: async () => 'OK',
      getModel: () => 'test',
    };

    const agent = new BaseAgent(llm, []);
    
    // Test that abort method works
    agent.abort();
    
    const state = agent.getState();
    expect(state.isCancelled).toBe(true);
  });
});