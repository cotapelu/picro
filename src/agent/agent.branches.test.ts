import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Agent } from './agent.js';
import type { Model, AgentConfig, ToolDefinition } from './types.js';
import { EventEmitter } from 'events';

// Mock llm/index to control LLM responses
vi.mock('../llm/index.js', () => {
  const mockComplete = vi.fn().mockResolvedValue({
    content: 'default',
    stopReason: 'stop',
    usage: { input: 0, output: 0, totalTokens: 0, cost: { input: 0, output: 0, total: 0 } },
    toolCalls: [],
  });
  const mockStream = vi.fn().mockReturnValue(async function* () {
    yield { type: 'delta', text: '' };
    return {
      content: 'default',
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
    toolExecutionMode: 'parallel',
    queueMode: 'all',
    followUpMode: 'all',
    compaction: { enabled: true, autoCompact: true },
    ...overrides,
  };
}

describe('Agent branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('creates contextBuilder unless convertToLlm provided', () => {
      const agent1 = new Agent(undefined as any, [], defaultConfig());
      expect((agent1 as any).contextBuilder).toBeDefined();

      const agent2 = new Agent(undefined as any, [], {
        ...defaultConfig(),
        convertToLlm: () => ({ messages: [], tools: [] }),
      });
      expect((agent2 as any).contextBuilder).toBeUndefined();
    });

    it('registers executor handlers if provided', () => {
      const handler = vi.fn().mockResolvedValue('handled');
      const agent = new Agent(undefined as any, [], {
        ...defaultConfig(),
        executor: { handlers: { myTool: handler as any } },
      });
      expect(agent.hasTool('myTool')).toBe(true);
      expect(agent.getToolNames()).toContain('myTool');
    });



    it('creates logger emitter when enableLogging true and verbose true', async () => {
      const agent = new Agent(undefined as any, [], {
        ...defaultConfig(),
        enableLogging: true,
        verbose: true,
      });
      const emitter = agent.getEmitter();
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await emitter.emit({ type: 'agent:start', timestamp: Date.now() } as any);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('🚀 Agent started'));
      logSpy.mockRestore();
    });

    it('does not log when enableLogging false', async () => {
      const agent = new Agent(undefined as any, [], defaultConfig());
      const emitter = agent.getEmitter();
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await emitter.emit({ type: 'agent:start', timestamp: Date.now() } as any);
      expect(logSpy).not.toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('assigns llm providers when model provided in constructor', () => {
      const model = createModel();
      const agent = new Agent(model, [], defaultConfig());
      expect((agent as any).llmComplete).toBeDefined();
      expect((agent as any).llmStream).toBeDefined();
    });

    it('maps queueMode and followUpMode correctly', () => {
      const agent = new Agent(undefined as any, [], {
        ...defaultConfig(),
        queueMode: 'one-at-a-time',
        followUpMode: 'one-at-a-time',
      });
      // @ts-ignore
      const steering = agent.steeringQueue as any;
      // @ts-ignore
      const followUp = agent.followUpQueue as any;
      // Default mapping: 'all' => 'drain-all', else 'dequeue-one'
      expect(steering.mode).toBe('dequeue-one');
      expect(followUp.mode).toBe('dequeue-one');
    });
  });

  describe('setModel', () => {
    it('sets providers when model provided', () => {
      const agent = new Agent(undefined as any, [], defaultConfig());
      const model = createModel();
      agent.setModel(model);
      expect((agent as any).llmComplete).toBeDefined();
      expect((agent as any).llmStream).toBeDefined();
    });

    it('clears providers when set to undefined', () => {
      const agent = new Agent(createModel(), [], defaultConfig());
      agent.setModel(undefined);
      expect((agent as any).llmComplete).toBeUndefined();
      expect((agent as any).llmStream).toBeUndefined();
    });
  });

  describe('_llmComplete', () => {
    it('processes array content by concatenating text and thinking', async () => {
      const agent = new Agent(createModel(), [], defaultConfig());
      const context = { messages: [], tools: [] } as any;
      mockComplete.mockResolvedValue({
        content: [
          { type: 'text', text: 'Hello ' },
          { type: 'thinking', thinking: 'world' },
        ],
        stopReason: 'stop',
        usage: {} as any,
        toolCalls: [],
      });
      const result = await (agent as any)._llmComplete(context);
      expect(result.content).toBe('Hello world');
      expect(mockComplete).toHaveBeenCalledWith(
        expect.anything(),
        context,
        expect.objectContaining({}),
      );
    });

    it('includes apiKey from config.getApiKey', async () => {
      const apiKey = 'sk-test';
      const agent = new Agent(createModel(), [], {
        ...defaultConfig(),
        getApiKey: async () => apiKey,
      });
      const context = { messages: [] } as any;
      mockComplete.mockResolvedValue({
        content: 'ok',
        stopReason: 'stop',
        usage: {} as any,
        toolCalls: [],
      });
      await (agent as any)._llmComplete(context);
      expect(mockComplete).toHaveBeenCalledWith(
        expect.anything(),
        context,
        expect.objectContaining({ apiKey }),
      );
    });

    it('handles string content directly', async () => {
      const agent = new Agent(createModel(), [], defaultConfig());
      const context = { messages: [] } as any;
      mockComplete.mockResolvedValue({
        content: 'Plain string',
        stopReason: 'stop',
        usage: {} as any,
        toolCalls: [],
      });
      const result = await (agent as any)._llmComplete(context);
      expect(result.content).toBe('Plain string');
    });
  });

  describe('_prepareModel', () => {
    it('fills missing fields with defaults', () => {
      const agent = new Agent(undefined as any, [], defaultConfig());
      const partial: Model = {
        id: 'id',
        name: 'name',
        provider: 'openai',
        baseUrl: 'url',
        contextWindow: 2000,
        maxTokens: 500,
      } as any;
      // @ts-ignore
      const prepared = (agent as any)._prepareModel(partial);
      expect(prepared.input).toEqual(['text']);
      expect(prepared.cost).toEqual({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0 });
      expect(prepared.reasoning).toBe(false);
      expect(prepared.api).toBe('openai-completions');
      expect(prepared.provider).toBe('openai');
      expect(prepared.baseUrl).toBe('url');
      expect(prepared.id).toBe('id');
      expect(prepared.name).toBe('name');
      expect(prepared.contextWindow).toBe(2000);
      expect(prepared.maxTokens).toBe(500);
    });
  });

  describe('_convertToolsToLlm', () => {
    it('maps tools correctly', () => {
      const agent = new Agent(undefined as any, [], defaultConfig());
      const tools: ToolDefinition[] = [
        { name: 't1', description: 'desc1', parameters: { type: 'object' } },
        { name: 't2', description: 'desc2', parameters: {} },
      ];
      // @ts-ignore
      const llmTools = (agent as any)._convertToolsToLlm(tools as any);
      expect(llmTools).toEqual([
        { name: 't1', description: 'desc1', parameters: { type: 'object' } },
        { name: 't2', description: 'desc2', parameters: {} },
      ]);
    });
  });

  describe('createLogger', () => {
    it('attaches event listeners when verbose true', async () => {
      const agent = new Agent(undefined as any, [], defaultConfig());
      // @ts-ignore
      const emitter = agent.createLogger(true);
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await emitter.emit({ type: 'agent:start', timestamp: Date.now() } as any);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('🚀 Agent started'));
      logSpy.mockRestore();
    });

    it('emitter has no listeners when verbose false', async () => {
      const agent = new Agent(undefined as any, [], defaultConfig());
      // @ts-ignore
      const emitter = agent.createLogger(false);
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await emitter.emit({ type: 'agent:start', timestamp: Date.now() } as any);
      expect(logSpy).not.toHaveBeenCalled();
      logSpy.mockRestore();
    });
  });

  describe('reset', () => {
    it('resets runner, queues, and idle promise when not running', () => {
      const agent = new Agent(undefined as any, [], defaultConfig());
      // Spy on components
      const runner = (agent as any).runner;
      runner.reset = vi.fn();
      const steeringQueue = (agent as any).steeringQueue;
      steeringQueue.clear = vi.fn();
      const followUpQueue = (agent as any).followUpQueue;
      followUpQueue.clear = vi.fn();
      (agent as any)._currentRunIdlePromise = Promise.resolve();

      agent.reset();

      expect(runner.reset).toHaveBeenCalled();
      expect(steeringQueue.clear).toHaveBeenCalled();
      expect(followUpQueue.clear).toHaveBeenCalled();
      expect((agent as any)._currentRunIdlePromise).toBeNull();
    });

    it('throws if agent is running', () => {
      const agent = new Agent(undefined as any, [], defaultConfig());
      (agent as any).runner.getState = () => ({ isRunning: true });
      expect(() => agent.reset()).toThrow('Cannot reset agent while it is running');
    });
  });

  describe('waitForIdle', () => {
    it('returns a resolved promise when idle', async () => {
      const agent = new Agent(undefined as any, [], defaultConfig());
      (agent as any)._currentRunIdlePromise = null;
      const p = agent.waitForIdle();
      await expect(p).resolves.toBeUndefined();
    });

    it('returns the current run idle promise', () => {
      const agent = new Agent(undefined as any, [], defaultConfig());
      const idlePromise = Promise.resolve();
      (agent as any)._currentRunIdlePromise = idlePromise;
      const p = agent.waitForIdle();
      expect(p).toBe(idlePromise);
    });
  });

  describe('run error handling', () => {
    it('rejects if already running', async () => {
      const agent = new Agent(undefined as any, [], defaultConfig());
      agent.setLLMProvider(async () => ({ content: 'ok', stopReason: 'stop', usage: {} as any, toolCalls: [] }));
      (agent as any).runner.getState = () => ({ isRunning: true });
      await expect(agent.run('test')).rejects.toThrow('Agent is already running');
    });

    it('rejects if no LLM provider set', async () => {
      const agent = new Agent(undefined as any, [], defaultConfig());
      agent.setModel(undefined);
      await expect(agent.run('test')).rejects.toThrow(
        'LLM provider not set. Provide a model or setModel() first.',
      );
    });
  });

  describe('stream error handling', () => {
    it('throws if already running', async () => {
      const agent = new Agent(createModel(), [], defaultConfig());
      (agent as any).runner.getState = () => ({ isRunning: true });
      const gen = agent.stream('test');
      await expect(gen.next()).rejects.toThrow('Agent is already running');
    });

    it('throws if no LLM stream provider set', async () => {
      const agent = new Agent(undefined as any, [], defaultConfig());
      agent.setModel(undefined);
      const gen = agent.stream('test');
      await expect(gen.next()).rejects.toThrow(
        'LLM stream provider not set. Provide a model or setModel() first.',
      );
    });
  });

  // Additional branch tests can be added in future rounds
});
