// SPDX-License-Identifier: Apache-2.0
/**
 * Additional branch coverage for Agent class methods.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Agent } from './agent.js';
import type { Model, AgentConfig, ToolDefinition } from './types.js';

// Mock llm/index
vi.mock('../llm/index.js', () => {
  const mockComplete = vi.fn().mockResolvedValue({
    content: 'mock response',
    stopReason: 'stop',
    usage: { input: 0, output: 0, totalTokens: 0, cost: { input: 0, output: 0, total: 0 } },
    toolCalls: [],
  });
  const mockStream = vi.fn().mockReturnValue(async function* () {
    yield { type: 'delta', text: '' };
    return {
      content: 'mock stream response',
      stopReason: 'stop',
      usage: {} as any,
      toolCalls: [],
    };
  });
  return { complete: mockComplete, stream: mockStream };
});

import { complete as mockComplete, stream as mockStream } from '../llm/index.js';

function createModel(overrides: Partial<Model> = {}): Model {
  return {
    id: 'test-model',
    name: 'Test Model',
    api: 'openai',
    provider: 'openai',
    baseUrl: '',
    reasoning: false,
    input: ['text'],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 1000,
    maxTokens: 100,
    ...overrides,
  };
}

function defaultConfig(overrides: Partial<AgentConfig> = {}): AgentConfig {
  return {
    maxRounds: 10,
    verbose: false,
    enableLogging: false,
    toolTimeout: 30000,
    cacheResults: false,
    toolExecutionStrategy: 'parallel',
    queueMode: 'all',
    followUpMode: 'all',
    compaction: { enabled: true, autoCompact: true },
    ...overrides,
  };
}

describe('Agent missing branches', () => {
  let agent: Agent;
  let model: Model;

  beforeEach(() => {
    vi.clearAllMocks();
    model = createModel();
    agent = new Agent(model, [], defaultConfig());
  });

  describe('getState', () => {
    it('returns runner state with messages', () => {
      const state = agent.getState();
      expect(state).toHaveProperty('history');
      expect(state).toHaveProperty('isRunning');
      expect(state).toHaveProperty('round');
    });
  });

  describe('getStrategy', () => {
    it('returns the loop strategy', () => {
      const strategy = agent.getStrategy();
      expect(strategy).toBeDefined();
    });
  });

  describe('getMaxRounds', () => {
    it('returns configured maxRounds', () => {
      expect(agent.getMaxRounds()).toBe(10);
    });

    it('returns custom maxRounds', () => {
      const customAgent = new Agent(undefined, [], { ...defaultConfig(), maxRounds: 5 });
      expect(customAgent.getMaxRounds()).toBe(5);
    });
  });

  describe('getEmitter', () => {
    it('returns the event emitter', () => {
      const emitter = agent.getEmitter();
      expect(emitter).toBeDefined();
      expect(emitter.on).toBeDefined();
    });
  });

  describe('registerTool', () => {
    it('registers a new tool', () => {
      const tool: ToolDefinition = {
        name: 'customTool',
        description: 'A custom tool',
        parameters: { type: 'object', properties: {} },
        handler: async () => ({ result: 'ok' }),
      };
      agent.registerTool(tool);
      expect(agent.hasTool('customTool')).toBe(true);
      expect(agent.getToolNames()).toContain('customTool');
    });
  });

  describe('getToolNames', () => {
    it('returns empty array when no tools', () => {
      const agentNoTools = new Agent(undefined, [], defaultConfig());
      expect(agentNoTools.getToolNames()).toEqual([]);
    });
  });

  describe('hasTool', () => {
    it('returns false for non-existent tool', () => {
      expect(agent.hasTool('nonexistent')).toBe(false);
    });
  });

  describe('steer', () => {
    it('enqueues a turn to steering queue', () => {
      const turn = { role: 'user' as const, content: [{ type: 'text', text: 'steer test' }], timestamp: Date.now() };
      agent.steer(turn);
      const steeringQueue = (agent as any).steeringQueue as any;
      // MessageQueue.size returns the number of pending items
      expect(steeringQueue.size).toBeGreaterThan(0);
    });
  });

  describe('followUp', () => {
    it('enqueues a turn to follow-up queue', () => {
      const turn = { role: 'user' as const, content: [{ type: 'text', text: 'followup test' }], timestamp: Date.now() };
      agent.followUp(turn);
      const followUpQueue = (agent as any).followUpQueue as any;
      expect(followUpQueue.size).toBeGreaterThan(0);
    });
  });

  describe('clearAllQueues', () => {
    it('clears both steering and follow-up queues', () => {
      agent.steer({ role: 'user', content: [{ type: 'text', text: 'test' }], timestamp: Date.now() });
      agent.followUp({ role: 'user', content: [{ type: 'text', text: 'test2' }], timestamp: Date.now() });
      agent.clearAllQueues();
      const steeringQueue = (agent as any).steeringQueue as any;
      const followUpQueue = (agent as any).followUpQueue as any;
      expect(steeringQueue.size).toBe(0);
      expect(followUpQueue.size).toBe(0);
    });
  });

  describe('waitForIdle', () => {
    it('resolves immediately when not running', async () => {
      await expect(agent.waitForIdle()).resolves.toBeUndefined();
    });
  });

  describe('subscribe', () => {
    it('returns an unsubscribe function', () => {
      const handler = vi.fn();
      const unsubscribe = agent.subscribe(handler);
      expect(typeof unsubscribe).toBe('function');
    });

    it('calls subscribed handler on event', async () => {
      const handler = vi.fn();
      agent.subscribe(handler);
      await agent.getEmitter().emit({ type: 'agent:start', timestamp: Date.now() } as any);
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('signal', () => {
    it('returns undefined when no signal active', () => {
      expect(agent.signal).toBeUndefined();
    });
  });

  describe('transport', () => {
    it('returns null', () => {
      expect(agent.transport).toBeNull();
    });
  });

  describe('getConfig', () => {
    it('returns agent config', () => {
      const config = agent.getConfig();
      expect(config).toBeDefined();
      expect(config.maxRounds).toBe(10);
    });
  });

  describe('setModel with invalid', () => {
    it('clears providers when set to undefined', () => {
      agent.setModel(undefined);
      expect((agent as any).llmComplete).toBeUndefined();
      expect((agent as any).llmStream).toBeUndefined();
    });
  });
});
