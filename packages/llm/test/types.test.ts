import { describe, it, expect } from 'vitest';
import type {
  Message, UserMessage, AssistantMessage, ToolResultMessage,
  Model, Context, Tool, Usage, TextContent, ImageContent,
  ThinkingContent, ToolCall, StopReason, StreamOptions,
} from '../src/types';

describe('Type Definitions', () => {
  describe('StopReason', () => {
    it('should allow valid stop reasons', () => {
      const stop: StopReason = 'stop';
      const length: StopReason = 'length';
      const toolUse: StopReason = 'toolUse';
      const error: StopReason = 'error';
      const aborted: StopReason = 'aborted';
      expect(stop).toBe('stop');
      expect(length).toBe('length');
      expect(toolUse).toBe('toolUse');
      expect(error).toBe('error');
      expect(aborted).toBe('aborted');
    });
  });

  describe('Usage', () => {
    it('should create valid Usage object', () => {
      const usage: Usage = {
        input: 1000, output: 500, cacheRead: 100, cacheWrite: 50, totalTokens: 1650,
        cost: { input: 0.001, output: 0.001, cacheRead: 0.0001, cacheWrite: 0.00005, total: 0.00215 },
      };
      expect(usage.input).toBe(1000);
      expect(usage.output).toBe(500);
    });
  });

  describe('TextContent', () => {
    it('should create valid TextContent', () => {
      const content: TextContent = { type: 'text', text: 'Hello, world!' };
      expect(content.type).toBe('text');
      expect(content.text).toBe('Hello, world!');
    });
  });

  describe('ImageContent', () => {
    it('should create valid ImageContent', () => {
      const content: ImageContent = { type: 'image', data: 'base64encodeddata', mimeType: 'image/png' };
      expect(content.type).toBe('image');
      expect(content.mimeType).toBe('image/png');
    });
  });

  describe('ThinkingContent', () => {
    it('should create valid ThinkingContent', () => {
      const content: ThinkingContent = { type: 'thinking', thinking: 'Let me think...' };
      expect(content.type).toBe('thinking');
    });
  });

  describe('ToolCall', () => {
    it('should create valid ToolCall', () => {
      const toolCall: ToolCall = { type: 'toolCall', id: 'call_123', name: 'get_weather', arguments: { city: 'Tokyo' } };
      expect(toolCall.type).toBe('toolCall');
      expect(toolCall.name).toBe('get_weather');
    });
  });

  describe('UserMessage', () => {
    it('should create UserMessage with string content', () => {
      const msg: UserMessage = { role: 'user', content: 'Hello!', timestamp: Date.now() };
      expect(msg.role).toBe('user');
      expect(typeof msg.content).toBe('string');
    });
  });

  describe('AssistantMessage', () => {
    it('should create AssistantMessage', () => {
      const msg: AssistantMessage = {
        role: 'assistant', content: [{ type: 'text', text: 'Hello!' }], api: 'openai',
        provider: 'openai', model: 'gpt-4',
        usage: { input: 100, output: 50, cacheRead: 0, cacheWrite: 0, totalTokens: 150, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
        stopReason: 'stop', timestamp: Date.now(),
      };
      expect(msg.role).toBe('assistant');
      expect(msg.content[0].type).toBe('text');
    });
  });

  describe('ToolResultMessage', () => {
    it('should create ToolResultMessage', () => {
      const msg: ToolResultMessage = {
        role: 'toolResult', toolCallId: 'call_123', toolName: 'get_weather',
        content: [{ type: 'text', text: 'Sunny, 25°C' }], isError: false, timestamp: Date.now(),
      };
      expect(msg.role).toBe('toolResult');
      expect(msg.isError).toBe(false);
    });
  });

  describe('Context', () => {
    it('should create Context with messages', () => {
      const context: Context = { messages: [{ role: 'user', content: 'Hello!', timestamp: Date.now() }] };
      expect(context.messages.length).toBe(1);
    });

    it('should create Context with system prompt', () => {
      const context: Context = { systemPrompt: 'You are a helpful assistant.', messages: [] };
      expect(context.systemPrompt).toBe('You are a helpful assistant.');
    });

    it('should create Context with tools', () => {
      const context: Context = {
        messages: [], tools: [{ name: 'get_weather', description: 'Get weather', parameters: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] } }],
      };
      expect(context.tools?.length).toBe(1);
    });
  });

  describe('Model', () => {
    it('should create valid Model', () => {
      const model: Model = {
        id: 'gpt-4', name: 'GPT-4', api: 'openai', provider: 'openai', baseUrl: 'https://api.openai.com/v1',
        reasoning: false, input: ['text'], cost: { input: 30, output: 60, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 8192, maxTokens: 4096,
      };
      expect(model.id).toBe('gpt-4');
      expect(model.input).toContain('text');
    });

    it('should support vision models', () => {
      const model: Model = {
        id: 'gpt-4-vision', name: 'GPT-4 Vision', api: 'openai', provider: 'openai', baseUrl: 'https://api.openai.com/v1',
        reasoning: false, input: ['text', 'image'], cost: { input: 30, output: 60, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 8192, maxTokens: 4096,
      };
      expect(model.input).toContain('image');
    });
  });

  describe('StreamOptions', () => {
    it('should support temperature', () => {
      const options: StreamOptions = { temperature: 0.7 };
      expect(options.temperature).toBe(0.7);
    });

    it('should support maxTokens', () => {
      const options: StreamOptions = { maxTokens: 1000 };
      expect(options.maxTokens).toBe(1000);
    });

    it('should support reasoningEffort', () => {
      const options: StreamOptions = { reasoningEffort: 'high' };
      expect(options.reasoningEffort).toBe('high');
    });
  });
});