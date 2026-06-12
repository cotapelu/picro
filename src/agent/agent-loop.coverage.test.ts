import { describe, it, expect, vi } from 'vitest';
import { AgentLoop } from './agent-loop.js';
import { ToolExecutor } from './tool-executor.js';
import { ContextBuilder } from './context-manager.js';
import { EventEmitter } from '../events/event-emitter.js';
import { LoopStrategy, ReActLoopStrategy } from './loop-strategy.js';
import { MessageQueue } from './message-queue.js';
import type { AgentConfig, LLMResponse } from './types.js';
import type { Context } from '../llm/index.js';

// Simple strategy that stops after first assistant turn
const stopAfterOne: LoopStrategy = {
  shouldContinue: () => false,
  formatResults: () => '',
};

function defaultConfig(overrides: Partial<AgentConfig> = {}): AgentConfig {
  return {
    maxRounds: 3,
    verbose: false,
    toolTimeout: 30000,
    cacheResults: false,
    toolExecutionMode: 'parallel',
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
    compaction: { enabled: false, autoCompact: false },
    ...overrides,
  };
}

describe('AgentLoop Coverage', () => {
  let loop: AgentLoop;
  let config: AgentConfig;
  let emitter: EventEmitter;
  let toolExecutor: ToolExecutor;
  let contextBuilder: ContextBuilder;

  beforeEach(() => {
    emitter = new EventEmitter();
    toolExecutor = new ToolExecutor();
    contextBuilder = new ContextBuilder();
    config = defaultConfig();
  });

  describe('streaming with all event types', () => {
    it('handles full range of stream events', async () => {
      const finalContent = 'All done';
      const streamProvider = async function* (context: Context, options?: any): AsyncGenerator<any> {
        // start
        yield { type: 'start', partial: { content: [{ type: 'text', text: '' }] } };
        // text_start
        yield { type: 'text_start' };
        // text_delta chunks
        yield { type: 'text_delta', delta: 'Hello ' };
        yield { type: 'text_delta', delta: 'World' };
        // text_end
        yield { type: 'text_end' };
        // thinking_start, thinking_delta, thinking_end
        yield { type: 'thinking_start' };
        yield { type: 'thinking_delta', delta: 'thinking' };
        yield { type: 'thinking_end' };
        // toolcall_start, toolcall_delta, toolcall_end
        yield { type: 'toolcall_start', partial: { name: 'echo', arguments: { message: 'hi' } } };
        yield { type: 'toolcall_delta', delta: { name: 'echo', arguments: { message: 'hi' } } };
        yield { type: 'toolcall_end' };
        // done with final message (no tool calls)
        yield {
          type: 'done',
          message: {
            content: [{ type: 'text', text: finalContent }],
            stopReason: 'stop',
            usage: { input: 10, output: 10, totalTokens: 20, cost: { input: 0, output: 0, total: 0 } },
            toolCalls: [],
          },
        };
      };

      loop = new AgentLoop(
        config,
        emitter,
        toolExecutor,
        contextBuilder,
        stopAfterOne,
        async () => { throw new Error('llmComplete not used'); },
        streamProvider,
        undefined,
        []
      );

      const events: any[] = [];
      const gen = loop.stream('test', new MessageQueue(), new MessageQueue());
      while (true) {
        const { value, done } = await gen.next();
        if (done) {
          const result = value;
          expect(result.success).toBe(true);
          expect(result.finalAnswer).toBe(finalContent);
          break;
        }
        events.push(value);
      }

      const types = events.map(e => e.type);
      expect(types).toContain('start');
      expect(types).toContain('text_start');
      expect(types).toContain('text_delta');
      expect(types).toContain('text_end');
      expect(types).toContain('thinking_start');
      expect(types).toContain('thinking_delta');
      expect(types).toContain('thinking_end');
      expect(types).toContain('toolcall_start');
      expect(types).toContain('toolcall_delta');
      expect(types).toContain('toolcall_end');
      expect(types).toContain('done');
    });
  });

  describe('streaming error path', () => {
    it('handles error event from stream and returns failure', async () => {
      const streamProvider = async function* (context: Context, options?: any) {
        yield { type: 'start', partial: { content: [{ type: 'text', text: '' }] } };
        yield { type: 'error', error: { errorMessage: 'Stream failed' } };
      };

      loop = new AgentLoop(
        config,
        emitter,
        toolExecutor,
        contextBuilder,
        stopAfterOne,
        async () => { throw new Error('llmComplete not used'); },
        streamProvider,
        undefined,
        []
      );

      const gen = loop.stream('test', new MessageQueue(), new MessageQueue());
      const events: any[] = [];
      let finalResult: any;
      while (true) {
        const { value, done } = await gen.next();
        if (done) {
          finalResult = value;
          break;
        }
        events.push(value);
      }

      expect(finalResult.success).toBe(false);
      expect(finalResult.error).toMatch(/Stream failed/);
    });
  });

  describe('autoSaveMemory', () => {
    it('saves user input, assistant response, and tool results when autoSaveMemories and tool calls present', async () => {
      const memoryStore = {
        remember: vi.fn().mockResolvedValue(undefined),
      };
      const configWithAutoSave = defaultConfig({
        autoSaveMemories: true,
      });
      // Register a simple tool
      const echoTool = {
        name: 'echo',
        description: 'Echo',
        parameters: { type: 'object', properties: { message: { type: 'string' } } },
        handler: async (args: any) => `Echo: ${args.message}`,
      };
      toolExecutor.registerTool(echoTool as any);

      // LLM that triggers a tool call
      let callCount = 0;
      const llmComplete = async (context: Context, options?: any): Promise<LLMResponse> => {
        callCount++;
        if (callCount === 1) {
          return {
            content: 'Using tool',
            stopReason: 'toolUse',
            usage: { input: 10, output: 5, totalTokens: 15, cost: { input: 0, output: 0, total: 0 } },
            toolCalls: [{ id: 't1', name: 'echo', arguments: { message: 'hello' } }],
          } as LLMResponse;
        } else {
          return {
            content: 'Final answer',
            stopReason: 'stop',
            usage: { input: 10, output: 10, totalTokens: 20, cost: { input: 0, output: 0, total: 0 } },
            toolCalls: [],
          } as LLMResponse;
        }
      };

      // Use ReActLoopStrategy to continue after tool call
      const reactStrategy = new ReActLoopStrategy();

      loop = new AgentLoop(
        configWithAutoSave,
        emitter,
        toolExecutor,
        contextBuilder,
        reactStrategy,
        llmComplete,
        async () => { throw new Error('stream not used'); },
        memoryStore as any,
        []
      );

      await loop.run('prompt', new MessageQueue(), new MessageQueue());

      // autoSaveMemory should have been called at least once (after tool execution)
      expect(memoryStore.remember).toHaveBeenCalled();
      const calls = memoryStore.remember.mock.calls;
      const types = calls.map(c => c[0]);
      // Should include user_input, assistant_response, and tool_result
      expect(types).toContain('user_input');
      expect(types).toContain('assistant_response');
      expect(types).toContain('tool_result');
    });

    it('does not crash if memoryStore.remember throws', async () => {
      const memoryStore = {
        remember: vi.fn().mockRejectedValue(new Error('DB error')),
      };
      const configWithAutoSave = defaultConfig({
        autoSaveMemories: true,
      });
      // Register a tool to ensure tool calls occur
      const echoTool = {
        name: 'echo',
        description: 'Echo',
        parameters: { type: 'object', properties: { message: { type: 'string' } } },
        handler: async (args: any) => `Echo: ${args.message}`,
      };
      toolExecutor.registerTool(echoTool as any);

      let callCount = 0;
      const llmComplete = async (context: Context, options?: any): Promise<LLMResponse> => {
        callCount++;
        if (callCount === 1) {
          return {
            content: 'Using tool',
            stopReason: 'toolUse',
            usage: { input: 10, output: 5, totalTokens: 15, cost: { input: 0, output: 0, total: 0 } },
            toolCalls: [{ id: 't1', name: 'echo', arguments: { message: 'hello' } }],
          } as LLMResponse;
        } else {
          return {
            content: 'Final',
            stopReason: 'stop',
            usage: { input: 10, output: 10, totalTokens: 20, cost: { input: 0, output: 0, total: 0 } },
            toolCalls: [],
          } as LLMResponse;
        }
      };
      const reactStrategy = new ReActLoopStrategy();

      loop = new AgentLoop(
        configWithAutoSave,
        emitter,
        toolExecutor,
        contextBuilder,
        reactStrategy,
        llmComplete,
        async () => { throw new Error('stream not used'); },
        memoryStore as any,
        []
      );

      // Should not throw despite remember failing
      await expect(loop.run('prompt', new MessageQueue(), new MessageQueue())).resolves.toBeDefined();
      expect(memoryStore.remember).toHaveBeenCalled();
    });
  });
});
