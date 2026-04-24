/**
 * Tests for types.ts - Core type definitions
 */

import { describe, it, expect } from 'vitest';
import type {
  ToolCall,
  ToolResult,
  LLMResponse,
  Message,
  UserMessage,
  AssistantMessage,
  ToolMessage,
  SystemMessage,
  AgentState,
  AgentConfig,
  AgentRunResult,
  AgentEvent,
  AgentStartEvent,
  RoundStartEvent,
} from '../src/types.js';

describe('ToolCall', () => {
  it('should create a valid ToolCall', () => {
    const toolCall: ToolCall = {
      id: 'call_123',
      name: 'search',
      arguments: { query: 'test' },
    };

    expect(toolCall.id).toBe('call_123');
    expect(toolCall.name).toBe('search');
    expect(toolCall.arguments).toEqual({ query: 'test' });
  });

  it('should allow optional thought field', () => {
    const toolCall: ToolCall = {
      id: 'call_456',
      name: 'search',
      arguments: {},
      thought: 'I need to search for information',
    };

    expect(toolCall.thought).toBe('I need to search for information');
  });
});

describe('ToolResult', () => {
  it('should create a successful ToolResult', () => {
    const result: ToolResult = {
      toolCallId: 'call_123',
      toolName: 'search',
      result: 'Search results here',
      isError: false,
    };

    expect(result.toolCallId).toBe('call_123');
    expect(result.toolName).toBe('search');
    expect(result.result).toBe('Search results here');
    expect(result.isError).toBe(false);
  });

  it('should create an error ToolResult', () => {
    const result: ToolResult = {
      toolCallId: 'call_456',
      toolName: 'search',
      result: 'Error:Tool not found',
      isError: true,
      errorMessage: 'Tool not found',
      executionTime: 100,
    };

    expect(result.isError).toBe(true);
    expect(result.errorMessage).toBe('Tool not found');
    expect(result.executionTime).toBe(100);
  });

  it('should allow additional details', () => {
    const result: ToolResult = {
      toolCallId: 'call_789',
      toolName: 'search',
      result: 'Done',
      isError: false,
      details: { items: 5, status: 'completed' },
    };

    expect(result.details).toEqual({ items: 5, status: 'completed' });
  });
});

describe('LLMResponse', () => {
  it('should create response with content only', () => {
    const response: LLMResponse = {
      content: 'Final answer',
    };

    expect(response.content).toBe('Final answer');
    expect(response.toolCalls).toBeUndefined();
  });

  it('should create response with tool calls only', () => {
    const response: LLMResponse = {
      toolCalls: [
        { id: 'call_1', name: 'search', arguments: { query: 'test' } },
      ],
    };

    expect(response.toolCalls).toHaveLength(1);
    expect(response.toolCalls?.[0].name).toBe('search');
  });

  it('should create response with both content and tool calls', () => {
    const response: LLMResponse = {
      content: 'I will search for that',
      toolCalls: [{ id: 'call_1', name: 'search', arguments: { query: 'test' } }],
      thinking: 'Let me think about this...',
    };

    expect(response.content).toBe('I will search for that');
    expect(response.toolCalls).toHaveLength(1);
    expect(response.thinking).toBe('Let me think about this...');
  });

  it('should allow raw and usage fields', () => {
    const response: LLMResponse = {
      content: 'Answer',
      raw: { model: 'gpt-4' },
      usage: { tokens: 100, cost: 0.01 },
    };

    expect(response.raw).toEqual({ model: 'gpt-4' });
    expect(response.usage).toEqual({ tokens: 100, cost: 0.01 });
  });
});

describe('Message Types', () => {
  it('should create UserMessage', () => {
    const msg: UserMessage = {
      role: 'user',
      content: 'Hello',
      timestamp: 1234567890,
    };

    expect(msg.role).toBe('user');
    expect(msg.content).toBe('Hello');
  });

  it('should create AssistantMessage with tool calls', () => {
    const msg: AssistantMessage = {
      role: 'assistant',
      content: 'I will help',
      timestamp: 1234567890,
      toolCalls: [{ id: 'call_1', name: 'search', arguments: {} }],
    };

    expect(msg.role).toBe('assistant');
    expect(msg.toolCalls).toHaveLength(1);
  });

  it('should create ToolMessage', () => {
    const msg: ToolMessage = {
      role: 'tool',
      content: 'Result',
      toolCallId: 'call_123',
      toolName: 'search',
      timestamp: 1234567890,
    };

    expect(msg.role).toBe('tool');
    expect(msg.toolCallId).toBe('call_123');
    expect(msg.toolName).toBe('search');
  });

  it('should create SystemMessage', () => {
    const msg: SystemMessage = {
      role: 'system',
      content: 'You are helpful',
      timestamp: 1234567890,
    };

    expect(msg.role).toBe('system');
  });

  it('should allow isError on ToolMessage', () => {
    const msg: ToolMessage = {
      role: 'tool',
      content: 'Error occurred',
      toolCallId: 'call_123',
      toolName: 'search',
      isError: true,
      timestamp: 1234567890,
    };

    expect(msg.isError).toBe(true);
  });
});

describe('AgentState', () => {
  it('should create initial AgentState', () => {
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

    expect(state.round).toBe(0);
    expect(state.isRunning).toBe(false);
    expect(state.toolResults).toHaveLength(0);
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
});

describe('AgentConfig', () => {
  it('should have default values', () => {
    const config: AgentConfig = {};

    expect(config.maxRounds).toBeUndefined();
    expect(config.verbose).toBeUndefined();
    expect(config.maxContextTokens).toBeUndefined();
  });

  it('should allow custom values', () => {
    const config: AgentConfig = {
      maxRounds: 20,
      verbose: true,
      maxContextTokens: 64000,
      toolTimeout: 60000,
      cacheResults: true,
    };

    expect(config.maxRounds).toBe(20);
    expect(config.verbose).toBe(true);
    expect(config.toolTimeout).toBe(60000);
    expect(config.cacheResults).toBe(true);
  });
});

describe('AgentRunResult', () => {
  it('should create successful result', () => {
    const result: AgentRunResult = {
      finalAnswer: 'Answer',
      totalRounds: 3,
      totalToolCalls: 5,
      totalTokens: 3000,
      toolResults: [],
      success: true,
      stopReason: 'stop',
      finalState: {
        round: 3,
        totalToolCalls: 5,
        totalTokens: 3000,
        promptLength: 1000,
        isRunning: false,
        isCancelled: false,
        toolResults: [],
        history: [],
        metadata: {},
      },
    };

    expect(result.success).toBe(true);
    expect(result.stopReason).toBe('stop');
  });

  it('should create error result', () => {
    const result: AgentRunResult = {
      finalAnswer: '',
      totalRounds: 1,
      totalToolCalls: 0,
      totalTokens: 1000,
      toolResults: [],
      success: false,
      error: 'Something went wrong',
      stopReason: 'error',
      finalState: {
        round: 1,
        totalToolCalls: 0,
        totalTokens: 1000,
        promptLength: 500,
        isRunning: false,
        isCancelled: false,
        toolResults: [],
        history: [],
        metadata: {},
      },
    };

    expect(result.success).toBe(false);
    expect(result.error).toBe('Something went wrong');
  });
});

describe('Event Types', () => {
  it('should create AgentStartEvent', () => {
    const event: AgentStartEvent = {
      type: 'agent:start',
      timestamp: 1234567890,
      round: 0,
      initialPrompt: 'Test prompt',
    };

    expect(event.type).toBe('agent:start');
    expect(event.initialPrompt).toBe('Test prompt');
  });

  it('should create RoundStartEvent', () => {
    const event: RoundStartEvent = {
      type: 'round:start',
      timestamp: 1234567890,
      round: 1,
      metadata: { promptLength: 1000 },
    };

    expect(event.type).toBe('round:start');
    expect(event.round).toBe(1);
    expect(event.metadata.promptLength).toBe(1000);
  });
});