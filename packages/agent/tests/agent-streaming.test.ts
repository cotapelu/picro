import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Agent } from '../src/agent';
import type { ToolDefinition, AIModel, LLMStreamEvent } from '../src/types';

function createMockModel(): AIModel {
  return {
    id: 'test-model',
    name: 'Test Model',
    api: 'test',
    provider: 'test',
    reasoning: false,
    contextWindow: 4096,
    maxTokens: 1024,
    inputCost: 0,
    outputCost: 0,
  };
}

function createMockStreamProvider(response: string, shouldCallTool: boolean = false): (prompt: string, tools: ToolDefinition[], options?: any) => AsyncIterable<LLMStreamEvent> {
  let totalCalls = 0;
  return async function* () {
    totalCalls++;
    const callNumber = totalCalls;
    const partial: any = {
      role: 'assistant',
      content: [],
      api: 'test',
      provider: 'test',
      model: 'test-model',
      usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
      timestamp: Date.now(),
      stopReason: undefined,
      errorMessage: undefined,
    };

    yield { type: 'start', partial } as LLMStreamEvent;

    const willCallTool = shouldCallTool && callNumber === 1; // Only call tool on first round
    if (willCallTool) {
      // Simulate a tool call
      partial.content.push({
        type: 'toolCall',
        id: 'call_1',
        name: 'test_tool',
        arguments: { arg: 'value' },
        partialArgs: '',
      } as any);
      yield { type: 'toolcall_start', contentIndex: 0, toolCall: partial.content[0] as any, partial } as LLMStreamEvent;
      partial.content[0] = { ...partial.content[0], arguments: { arg: 'value' } };
      yield { type: 'toolcall_end', contentIndex: 0, toolCall: partial.content[0] as any, partial } as LLMStreamEvent;
    } else {
      // Text response
      for (const ch of response) {
        // Simulate text delta
        yield { type: 'text_delta', delta: ch, partial } as LLMStreamEvent;
      }
    }

    const finalMessage: any = {
      role: 'assistant',
      content: willCallTool
        ? [{
            type: 'toolCall',
            id: 'call_1',
            name: 'test_tool',
            arguments: { arg: 'value' }
          } as any]
        : [{ type: 'text', text: response }],
      api: 'test',
      provider: 'test',
      model: 'test-model',
      usage: { input: 10, output: 5, cacheRead: 0, cacheWrite: 0, totalTokens: 15, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
      timestamp: Date.now(),
      stopReason: willCallTool ? 'toolUse' : 'stop',
      errorMessage: undefined,
    };
    yield { type: 'done', message: finalMessage } as LLMStreamEvent;
  };
}

describe('Agent Streaming', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should stream text response and return final result', async () => {
    const agent = new Agent(createMockModel(), [], { maxRounds: 2 });
    const responseText = 'Hello streaming!';
    agent.setStreamProvider(createMockStreamProvider(responseText));

    const gen = agent.stream('Say something') as AsyncGenerator<LLMStreamEvent, any, unknown>;
    const events: LLMStreamEvent[] = [];
    let finalResult: any;

    while (true) {
      const { value, done } = await gen.next();
      if (done) {
        finalResult = value;
        break;
      }
      events.push(value);
    }

    expect(finalResult.success).toBe(true);
    expect(finalResult.finalAnswer).toBe(responseText);
    expect(events.some(e => e.type === 'start')).toBe(true);
    expect(events.some(e => e.type === 'text_delta')).toBe(true);
    expect(finalResult.stopReason).toBe('stop');
  });

  it('should handle tool calls in streaming', async () => {
    const tool: ToolDefinition = {
      name: 'test_tool',
      description: 'A test tool',
      parameters: { type: 'object', properties: { arg: { type: 'string' } } },
      handler: async (args) => `Result: ${args.arg}`
    };
    const agent = new Agent(createMockModel(), [tool], { maxRounds: 3 }); // 1st round: tool call; 2nd round: text response
    const finalResponse = 'Tool executed!';
    agent.setStreamProvider(createMockStreamProvider(finalResponse, true));

    const gen = agent.stream('Use tool') as AsyncGenerator<LLMStreamEvent, any, unknown>;
    const events: LLMStreamEvent[] = [];
    let finalResult: any;

    while (true) {
      const { value, done } = await gen.next();
      if (done) {
        finalResult = value;
        break;
      }
      events.push(value);
    }

    if (!finalResult.success) {
      console.error('Stream failed:', finalResult.error);
      console.error('finalResult:', JSON.stringify(finalResult, null, 2));
    }
    expect(finalResult.success).toBe(true);
    expect(finalResult.totalToolCalls).toBe(1);
    expect(finalResult.toolResults.length).toBe(1);
    expect(finalResult.toolResults[0].toolName).toBe('test_tool');
    expect(finalResult.finalAnswer).toBe(finalResponse);
  });
});
