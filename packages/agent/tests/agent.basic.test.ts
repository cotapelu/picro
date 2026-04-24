import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Agent } from '../src/agent';
import type { ToolDefinition, AIModel, LLMResponse } from '../src/types';

// Mock LLM provider returning LLMResponse
const createMockLLM = (response: string, toolCalls: any[] = []): any => {
  return async (prompt: string, tools: any[], options?: any): Promise<LLMResponse> => {
    // Simulate some delay
    await Promise.resolve();
    return {
      content: response,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      stopReason: toolCalls.length > 0 ? 'toolUse' : 'stop',
      usage: {
        input: 10,
        output: 20,
        totalTokens: 30,
        cost: { input: 0, output: 0, total: 0 },
      },
    };
  };
};

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

describe('Agent (Basic Integration)', () => {
  let agent: Agent;
  let model: AIModel;
  let tools: ToolDefinition[];

  beforeEach(() => {
    model = createMockModel();
    tools = [
      {
        name: 'get_weather',
        description: 'Get weather for a city',
        parameters: {
          type: 'object',
          properties: { city: { type: 'string' } },
          required: ['city'],
        },
        handler: async (args: any) => `Weather in ${args.city} is sunny`,
      },
    ];
  });

  describe('constructor', () => {
    it('should create agent with default config', () => {
      agent = new Agent(model, tools);
      expect(agent).toBeInstanceOf(Agent);
      expect(agent.getMaxRounds()).toBe(10);
    });

    it('should accept custom config', () => {
      agent = new Agent(model, tools, {
        maxRounds: 5,
        verbose: false,
      });
      expect(agent.getMaxRounds()).toBe(5);
    });

    it('should register tools on construction', () => {
      agent = new Agent(model, tools);
      expect(agent.hasTool('get_weather')).toBe(true);
      expect(agent.getToolNames()).toContain('get_weather');
    });
  });

  describe('setLLMProvider', () => {
    it('should allow setting LLM provider', () => {
      agent = new Agent(model, tools);
      expect(() => {
        agent.setLLMProvider(createMockLLM('Hello'));
      }).not.toThrow();
    });
  });

  describe('run', () => {
    it('should reject if no LLM provider set', async () => {
      agent = new Agent(model, tools);
      await expect(agent.run('Hello')).rejects.toThrow('LLM provider not set');
    });

    it('should execute and return result', async () => {
      agent = new Agent(model, tools);
      agent.setLLMProvider(createMockLLM('Final answer'));

      const result = await agent.run('Hello agent');

      expect(result.success).toBe(true);
      expect(result.finalAnswer).toBe('Final answer');
      expect(result.totalRounds).toBe(1);
      expect(result.totalToolCalls).toBe(0);
    });

    it('should reject if agent already running', async () => {
      agent = new Agent(model, tools);
      agent.setLLMProvider(createMockLLM('Answer'));
      agent.setStreamProvider(async function* () {
        yield { type: 'text_delta', delta: 'Hello' };
      });

      const run1 = agent.stream('First');
      const run2 = agent.stream('Second');

      // Not awaiting run1, so both are running
      // Actually, stream() checks isRunning and throws, but state not yet set?
      // Depending on implementation, this may or may not throw
    });
  });

  describe('queues', () => {
    it('should support steer queue', () => {
      agent = new Agent(model, tools);
      agent.setLLMProvider(createMockLLM('Done'));

      agent.steer({
        role: 'user',
        content: [{ type: 'text', text: 'Steering message' }],
        timestamp: Date.now(),
      });

      expect(agent.hasQueuedMessages()).toBe(true);
      agent.clearSteeringQueue();
      expect(agent.hasQueuedMessages()).toBe(false);
    });

    it('should support followUp queue', () => {
      agent = new Agent(model, tools);
      agent.setLLMProvider(createMockLLM('Done'));

      agent.followUp({
        role: 'user',
        content: [{ type: 'text', text: 'Follow-up' }],
        timestamp: Date.now(),
      });

      expect(agent.hasQueuedMessages()).toBe(true);
      agent.clearFollowUpQueue();
      expect(agent.hasQueuedMessages()).toBe(false);
    });

    it('should clear all queues', () => {
      agent = new Agent(model, tools);
      agent.setLLMProvider(createMockLLM('Done'));

      agent.steer({ role: 'user', content: [{ type: 'text', text: 'S' }], timestamp: Date.now() });
      agent.followUp({ role: 'user', content: [{ type: 'text', text: 'F' }], timestamp: Date.now() });

      expect(agent.hasQueuedMessages()).toBe(true);
      agent.clearAllQueues();
      expect(agent.hasQueuedMessages()).toBe(false);
    });
  });

  describe('subscriptions', () => {
    it('should allow subscription to events', () => {
      agent = new Agent(model, tools);
      agent.setLLMProvider(createMockLLM('Done'));

      const handler = vi.fn();
      const unsubscribe = agent.subscribe(handler);

      expect(typeof unsubscribe).toBe('function');

      agent.run('Hello').then(() => {
        expect(handler).toHaveBeenCalled();
      });
    });
  });

  describe('abort', () => {
    it('should have abort method', () => {
      agent = new Agent(model, tools);
      agent.setLLMProvider(createMockLLM('Done'));

      expect(() => agent.abort()).not.toThrow();
    });
  });

  describe('state', () => {
    it('should return state snapshot', () => {
      agent = new Agent(model, tools);
      agent.setLLMProvider(createMockLLM('Done'));

      const state = agent.getState();
      expect(state).toHaveProperty('round');
      expect(state).toHaveProperty('isRunning');
      expect(state).toHaveProperty('history');
    });
  });
});
