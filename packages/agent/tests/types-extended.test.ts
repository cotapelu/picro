/**
 * Extended Tests for types.ts - More edge cases and validation
 */

import { describe, it, expect } from 'vitest';
import type {
  ToolCall,
  ToolResult,
  ToolDefinition,
  ToolContext,
  ToolProgress,
  LLMResponse,
  LLMInstance,
  LLMCallOptions,
  AgentState,
  AgentConfig,
  BaseAgentConfig,
  AgentRunResult,
  StopReason,
  Message,
  UserMessage,
  AssistantMessage,
  ToolMessage,
  SystemMessage,
  StreamChunk,
  StreamCallbacks,
  AgentEvent,
  AgentEventType,
  LoopStrategy,
  QueueMode,
} from '../src/types.js';

describe('Extended ToolCall Tests', () => {
  it('should allow empty arguments', () => {
    const toolCall: ToolCall = {
      id: 'call_1',
      name: 'noArgs',
      arguments: {},
    };
    expect(toolCall.arguments).toEqual({});
  });

  it('should allow nested arguments', () => {
    const toolCall: ToolCall = {
      id: 'call_1',
      name: 'nested',
      arguments: {
        user: { name: 'John', age: 30 },
        options: { enabled: true, tags: ['a', 'b'] },
      },
    };
    expect(toolCall.arguments.user.name).toBe('John');
    expect(toolCall.arguments.options.tags).toHaveLength(2);
  });

  it('should allow all JSON types in arguments', () => {
    const toolCall: ToolCall = {
      id: 'call_1',
      name: 'types',
      arguments: {
        string: 'hello',
        number: 42,
        float: 3.14,
        boolean: true,
        null: null,
        array: [1, 2, 3],
      },
    };
    expect(toolCall.arguments.null).toBeNull();
    expect(toolCall.arguments.float).toBe(3.14);
  });

  it('should handle thought field', () => {
    const toolCall: ToolCall = {
      id: 'call_1',
      name: 'search',
      arguments: { query: 'test' },
      thought: 'I should search for this query in the database',
    };
    expect(toolCall.thought).toContain('search');
  });
});

describe('Extended ToolResult Tests', () => {
  it('should handle empty result string', () => {
    const result: ToolResult = {
      toolCallId: 'call_1',
      toolName: 'echo',
      result: '',
      isError: false,
    };
    expect(result.result).toBe('');
  });

  it('should handle very long result', () => {
    const longString = 'x'.repeat(100000);
    const result: ToolResult = {
      toolCallId: 'call_1',
      toolName: 'long',
      result: longString,
      isError: false,
    };
    expect(result.result.length).toBe(100000);
  });

  it('should handle result with newlines and special chars', () => {
    const result: ToolResult = {
      toolCallId: 'call_1',
      toolName: 'special',
      result: 'Line1\nLine2\r\nLine3\tTab"Quote"',
      isError: false,
    };
    expect(result.result).toContain('\n');
    expect(result.result).toContain('\t');
  });

  it('should include timing info', () => {
    const result: ToolResult = {
      toolCallId: 'call_1',
      toolName: 'timed',
      result: 'done',
      isError: false,
      executionTime: 1500,
    };
    expect(result.executionTime).toBe(1500);
  });

  it('should include error details', () => {
    const result: ToolResult = {
      toolCallId: 'call_1',
      toolName: 'fail',
      result: 'Error: Connection refused',
      isError: true,
      errorMessage: 'ECONNREFUSED: Connection refused',
      executionTime: 100,
    };
    expect(result.isError).toBe(true);
    expect(result.errorMessage).toContain('ECONNREFUSED');
  });

  it('should include structured details', () => {
    const result: ToolResult = {
      toolCallId: 'call_1',
      toolName: 'data',
      result: 'Got 5 items',
      isError: false,
      details: {
        items: 5,
        duration: 100,
        cached: false,
      },
    };
    expect(result.details?.items).toBe(5);
  });
});

describe('Extended LLMResponse Tests', () => {
  it('should handle empty content', () => {
    const response: LLMResponse = { content: '' };
    expect(response.content).toBe('');
  });

  it('should handle multiple tool calls', () => {
    const response: LLMResponse = {
      toolCalls: [
        { id: 'c1', name: 'search', arguments: { q: 'a' } },
        { id: 'c2', name: 'search', arguments: { q: 'b' } },
        { id: 'c3', name: 'calc', arguments: { expr: '1+1' } },
      ],
    };
    expect(response.toolCalls).toHaveLength(3);
  });

  it('should handle thinking without content', () => {
    const response: LLMResponse = {
      thinking: 'Let me compute this...',
    };
    expect(response.thinking).toBe('Let me compute this...');
    expect(response.content).toBeUndefined();
  });

  it('should include raw response', () => {
    const response: LLMResponse = {
      content: 'Answer',
      raw: {
        id: 'resp_123',
        model: 'gpt-4',
        created: 1234567890,
      },
    };
    expect(response.raw?.id).toBe('resp_123');
  });

  it('should include usage stats', () => {
    const response: LLMResponse = {
      content: 'Answer',
      usage: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
        cost: 0.005,
      },
    };
    expect(response.usage?.total_tokens).toBe(150);
  });
});

describe('Extended Message Tests', () => {
  it('should handle empty content', () => {
    const msg: UserMessage = { role: 'user', content: '', timestamp: 0 };
    expect(msg.content).toBe('');
  });

  it('should handle unicode content', () => {
    const msg: UserMessage = { role: 'user', content: '你好世界🌍', timestamp: 0 };
    expect(msg.content).toContain('世界');
  });

  it('should handle very long content', () => {
    const content = 'a'.repeat(100000);
    const msg: UserMessage = { role: 'user', content, timestamp: 0 };
    expect(msg.content.length).toBe(100000);
  });

  it('should preserve timestamp', () => {
    const ts = Date.now();
    const msg: UserMessage = { role: 'user', content: 'test', timestamp: ts };
    expect(msg.timestamp).toBe(ts);
  });

  it('should handle assistant with usage', () => {
    const msg: AssistantMessage = {
      role: 'assistant',
      content: 'Answer',
      timestamp: 0,
      usage: { prompt_tokens: 100, completion_tokens: 50 } as any,
    };
    expect(msg.usage?.prompt_tokens).toBe(100);
  });

  it('should handle tool message with all fields', () => {
    const msg: ToolMessage = {
      role: 'tool',
      content: 'Result data',
      toolCallId: 'call_123',
      toolName: 'search',
      isError: false,
      timestamp: 1234567890,
    };
    expect(msg.toolCallId).toBe('call_123');
    expect(msg.toolName).toBe('search');
  });

  it('should handle system message', () => {
    const msg: SystemMessage = {
      role: 'system',
      content: 'You are a helpful assistant.',
      timestamp: 0,
    };
    expect(msg.role).toBe('system');
  });
});

describe('Extended AgentState Tests', () => {
  it('should track zero state', () => {
    const state: AgentState = {
      round: 0,
      totalToolCalls: 0,
      totalTokens: 0,
      promptLength: 0,
      isRunning: false,
      isCancelled: false,
      toolResults: [],
      history: [],
      metadata: {},
    };
    expect(state.isRunning).toBe(false);
    expect(state.isCancelled).toBe(false);
  });

  it('should track running state', () => {
    const state: AgentState = {
      round: 5,
      totalToolCalls: 10,
      totalTokens: 5000,
      promptLength: 2000,
      isRunning: true,
      isCancelled: false,
      toolResults: [],
      history: [],
      metadata: { currentTool: 'search' },
    };
    expect(state.isRunning).toBe(true);
    expect(state.metadata.currentTool).toBe('search');
  });

  it('should track cancelled state', () => {
    const state: AgentState = {
      round: 3,
      totalToolCalls: 5,
      totalTokens: 2000,
      promptLength: 1000,
      isRunning: false,
      isCancelled: true,
      toolResults: [],
      history: [],
      metadata: {},
    };
    expect(state.isCancelled).toBe(true);
  });

  it('should track large tool results', () => {
    const toolResults = Array.from({ length: 100 }, (_, i) => ({
      toolCallId: `call_${i}`,
      toolName: 'tool',
      result: `result_${i}`,
      isError: false,
    }));
    const state: AgentState = {
      round: 10,
      totalToolCalls: 100,
      totalTokens: 10000,
      promptLength: 5000,
      isRunning: false,
      isCancelled: false,
      toolResults,
      history: [],
      metadata: {},
    };
    expect(state.toolResults).toHaveLength(100);
  });

  it('should allow custom metadata', () => {
    const state: AgentState = {
      round: 1,
      totalToolCalls: 0,
      totalTokens: 0,
      promptLength: 0,
      isRunning: false,
      isCancelled: false,
      toolResults: [],
      history: [],
      metadata: {
        customField: 'value',
        nested: { deep: true },
        array: [1, 2, 3],
      },
    };
    expect(state.metadata.customField).toBe('value');
    expect(state.metadata.nested.deep).toBe(true);
  });
});

describe('Extended AgentConfig Tests', () => {
  it('should use all defaults when empty', () => {
    const config: AgentConfig = {};
    expect(config.maxRounds).toBeUndefined();
    expect(config.verbose).toBeUndefined();
    expect(config.maxContextTokens).toBeUndefined();
  });

  it('should accept all config options', () => {
    const config: BaseAgentConfig = {
      maxRounds: 50,
      verbose: true,
      maxContextTokens: 64000,
      reservedTokens: 2000,
      minMessages: 10,
      toolTimeout: 60000,
      cacheResults: true,
      strategy: 'react',
      enableLogging: true,
      sessionId: 'session-123',
      reasoningLevel: 'high',
      steeringMode: 'all',
      followUpMode: 'all',
    };
    expect(config.maxRounds).toBe(50);
    expect(config.verbose).toBe(true);
    expect(config.sessionId).toBe('session-123');
    expect(config.reasoningLevel).toBe('high');
  });

  it('should handle thinkingBudgets', () => {
    const config: BaseAgentConfig = {
      thinkingBudgets: {
        minimal: 100,
        low: 500,
        medium: 1500,
        high: 4000,
        xhigh: 8000,
      },
      reasoningLevel: 'xhigh',
    };
    expect(config.thinkingBudgets?.xhigh).toBe(8000);
  });
});

describe('Extended AgentRunResult Tests', () => {
  it('should track success with stop reason', () => {
    const result: AgentRunResult = {
      finalAnswer: 'Complete answer',
      totalRounds: 5,
      totalToolCalls: 10,
      totalTokens: 5000,
      toolResults: [],
      success: true,
      stopReason: 'stop',
      finalState: {} as AgentState,
    };
    expect(result.success).toBe(true);
    expect(result.stopReason).toBe('stop');
  });

  it('should track failure with error', () => {
    const result: AgentRunResult = {
      finalAnswer: '',
      totalRounds: 1,
      totalToolCalls: 0,
      totalTokens: 1000,
      toolResults: [],
      success: false,
      error: 'Network error',
      stopReason: 'error',
      finalState: {} as AgentState,
    };
    expect(result.success).toBe(false);
    expect(result.error).toBe('Network error');
  });

  it('should track max rounds stop', () => {
    const result: AgentRunResult = {
      finalAnswer: '',
      totalRounds: 10,
      totalToolCalls: 5,
      totalTokens: 10000,
      toolResults: [],
      success: false,
      error: 'Max rounds reached',
      stopReason: 'max_rounds',
      finalState: {} as AgentState,
    };
    expect(result.stopReason).toBe('max_rounds');
  });

  it('should track aborted stop', () => {
    const result: AgentRunResult = {
      finalAnswer: '',
      totalRounds: 3,
      totalToolCalls: 2,
      totalTokens: 2000,
      toolResults: [],
      success: false,
      error: 'Cancelled by user',
      stopReason: 'aborted',
      finalState: {} as AgentState,
    };
    expect(result.stopReason).toBe('aborted');
  });

  it('should include all tool results on success', () => {
    const toolResults = [
      { toolCallId: '1', toolName: 'a', result: 'r1', isError: false },
      { toolCallId: '2', toolName: 'b', result: 'r2', isError: false },
    ];
    const result: AgentRunResult = {
      finalAnswer: 'Done',
      totalRounds: 3,
      totalToolCalls: 2,
      totalTokens: 3000,
      toolResults,
      success: true,
      stopReason: 'stop',
      finalState: {} as AgentState,
    };
    expect(result.toolResults).toHaveLength(2);
  });
});

describe('StreamChunk Tests', () => {
  it('should create text_delta chunk', () => {
    const chunk: StreamChunk = { type: 'text_delta', delta: 'Hello' };
    expect(chunk.type).toBe('text_delta');
    expect(chunk.delta).toBe('Hello');
  });

  it('should create thinking_delta chunk', () => {
    const chunk: StreamChunk = { type: 'thinking_delta', delta: 'Thinking...' };
    expect(chunk.type).toBe('thinking_delta');
  });

  it('should create toolcall_delta chunk', () => {
    const chunk: StreamChunk = {
      type: 'toolcall_delta',
      toolCall: { id: 'call_1', name: 'search', arguments: {} },
    };
    expect(chunk.type).toBe('toolcall_delta');
    expect(chunk.toolCall?.id).toBe('call_1');
  });

  it('should create done chunk', () => {
    const response: LLMResponse = { content: 'Final' };
    const chunk: StreamChunk = { type: 'done', response };
    expect(chunk.type).toBe('done');
    expect(chunk.response?.content).toBe('Final');
  });

  it('should create error chunk', () => {
    const chunk: StreamChunk = { type: 'error', error: 'Failed' };
    expect(chunk.type).toBe('error');
    expect(chunk.error).toBe('Failed');
  });
});

describe('QueueMode Tests', () => {
  it('should allow "all" mode', () => {
    const mode: QueueMode = 'all';
    expect(mode).toBe('all');
  });

  it('should allow "one-at-a-time" mode', () => {
    const mode: QueueMode = 'one-at-a-time';
    expect(mode).toBe('one-at-a-time');
  });
});

describe('EventType Tests', () => {
  it('should include all agent event types', () => {
    const types: AgentEventType[] = [
      'agent:start',
      'agent:end',
      'round:start',
      'round:end',
      'llm:request',
      'llm:response',
      'tool:call',
      'tool:result',
      'tool:update',
      'tool:error',
      'error',
    ];
    expect(types).toHaveLength(11);
  });
});

describe('Edge Case Tests', () => {
  it('should handle zero-length prompt', () => {
    const state: AgentState = {
      round: 0,
      totalToolCalls: 0,
      totalTokens: 0,
      promptLength: 0,
      isRunning: false,
      isCancelled: false,
      toolResults: [],
      history: [],
      metadata: {},
    };
    expect(state.promptLength).toBe(0);
  });

  it('should handle null values in tool arguments', () => {
    const toolCall: ToolCall = {
      id: 'c1',
      name: 'test',
      arguments: { nullValue: null, undefinedValue: undefined as any },
    };
    expect(toolCall.arguments.nullValue).toBeNull();
  });

  it('should handle NaN in tool arguments', () => {
    const toolCall: ToolCall = {
      id: 'c1',
      name: 'test',
      arguments: { value: NaN },
    };
    expect(Number.isNaN(toolCall.arguments.value)).toBe(true);
  });

  it('should handle Infinity in tool arguments', () => {
    const toolCall: ToolCall = {
      id: 'c1',
      name: 'test',
      arguments: { value: Infinity },
    };
    expect(toolCall.arguments.value).toBe(Infinity);
  });

  it('should handle Date objects in arguments', () => {
    const date = new Date('2024-01-01');
    const toolCall: ToolCall = {
      id: 'c1',
      name: 'test',
      arguments: { date },
    };
    expect(toolCall.arguments.date).toBeInstanceOf(Date);
  });

  it('should handle Buffer-like structures', () => {
    const toolCall: ToolCall = {
      id: 'c1',
      name: 'test',
      arguments: { buffer: new Uint8Array([1, 2, 3]) },
    };
    expect(toolCall.arguments.buffer).toBeInstanceOf(Uint8Array);
  });
});