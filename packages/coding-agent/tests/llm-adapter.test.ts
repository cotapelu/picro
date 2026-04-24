import { createLLMInstance } from '../src/llm-adapter.js';
import type { Model } from '@picro/llm';
import * as streamModule from '@picro/llm';

// Spy on stream from @picro/llm
const mockStream = vi.spyOn(streamModule, 'stream');
mockStream.mockImplementation(async function* () {
  yield { type: 'text_start' };
  yield { type: 'text_delta', delta: 'Hello' };
  yield { type: 'text_delta', delta: ' world' };
  yield { type: 'done', message: { usage: { input: 5, output: 6, totalTokens: 11, cost: { input: 0.1, output: 0.2, total: 0.3 } }, stopReason: 'stop' } };
});

describe('createLLMInstance', () => {
  let model: Model;

  beforeEach(() => {
    model = {
      id: 'test-model',
      name: 'Test Model',
      api: 'testapi',
      provider: 'test-provider',
      baseUrl: 'https://api.test.com',
      reasoning: false,
      contextWindow: 4096,
      maxTokens: 1024,
      inputCost: 0.1,
      outputCost: 0.2,
    };
    mockStream.mockClear();
  });

  it('should return an LLMInstance with getModel and chat methods', () => {
    const llm = createLLMInstance(model);
    expect(llm).toBeDefined();
    expect(typeof llm.getModel).toBe('function');
    expect(typeof llm.chat).toBe('function');
    expect(typeof llm.chatWithTools).toBe('function');
  });

  it('getModel should return the model id', () => {
    const llm = createLLMInstance(model);
    expect(llm.getModel()).toBe('test-model');
  });

  describe('chat', () => {
    it('should concatenate text deltas and return final string', async () => {
      const llm = createLLMInstance(model);
      const result = await llm.chat('Hello there');
      expect(result).toBe('Hello world');
      // Check that stream was called with correct context
      expect(mockStream).toHaveBeenCalledWith(model, expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'user', content: 'Hello there' })
        ])
      }), undefined);
    });

    it('should ignore non-text events', async () => {
      // Override mock to include toolcall events and other
      mockStream.mockImplementation(async function* () {
        yield { type: 'text_start' };
        yield { type: 'toolcall_start', toolCall: { name: 'test_tool', arguments: {} } };
        yield { type: 'text_delta', delta: 'Some' };
        yield { type: 'toolcall_end', toolCall: { name: 'test_tool' } };
        yield { type: 'done' };
      });
      const llm = createLLMInstance(model);
      const result = await llm.chat('test');
      expect(result).toBe('Some');
    });
  });

  describe('chatWithTools', () => {
    it('should collect text content and tool calls', async () => {
      // Stream with toolcall
      mockStream.mockImplementation(async function* () {
        yield { type: 'text_start' };
        yield { type: 'text_delta', delta: 'Calling' };
        yield { type: 'toolcall_start', toolCall: { id: 'call1', name: 'test_tool', arguments: { arg: 'value' } } };
        yield { type: 'toolcall_delta', toolCall: { partialArgs: '{"arg":"val' } };
        yield { type: 'toolcall_delta', toolCall: { arguments: { arg: 'value' } } };
        yield { type: 'toolcall_end', toolCall: { id: 'call1', name: 'test_tool', arguments: { arg: 'value' } } };
        yield { type: 'text_delta', delta: ' done' };
        yield { type: 'done', message: { usage: { input: 10, output: 20, totalTokens: 30, cost: { input: 0.2, output: 0.4, total: 0.6 } }, stopReason: 'stop' } };
      });
      const llm = createLLMInstance(model);
      const tools = [{ name: 'test_tool', description: 'A test tool', parameters: {} }];
      const result = await llm.chatWithTools('Do something', tools);
      expect(result.content).toBe('Calling done');
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls[0].name).toBe('test_tool');
      expect(result.toolCalls[0].arguments).toEqual({ arg: 'value' });
      expect(result.stopReason).toBe('stop');
      expect(result.usage).toEqual({
        input: 10,
        output: 20,
        totalTokens: 30,
        cost: { input: 0.2, output: 0.4, total: 0.6 }
      });
    });

    it('should handle cases where toolCall has no id by generating one', async () => {
      mockStream.mockImplementation(async function* () {
        yield { type: 'toolcall_start', toolCall: { name: 'tool', arguments: {} } };
        yield { type: 'toolcall_end', toolCall: { name: 'tool', arguments: {} } };
        yield { type: 'done' };
      });
      const llm = createLLMInstance(model);
      const result = await llm.chatWithTools('test', []);
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls[0].id).toBeDefined();
    });
  });
});
