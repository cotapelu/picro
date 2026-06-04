import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildParams } from './openai-compatible.js';

// Mock dependencies exactly as needed
vi.mock('../overflow.js', () => ({
  truncateContext: vi.fn().mockImplementation(ctx => ctx),
}));

vi.mock('../transform-messages.js', () => ({
  transformMessages: vi.fn().mockImplementation(msgs => msgs),
}));

vi.mock('../compat-detection.js', () => ({
  detectCompat: vi.fn().mockReturnValue({
    supportsDeveloperRole: false,
    requiresThinkingAsText: false,
    insertAssistantBetweenToolAndUser: false,
    strictModeAvailable: false,
    needToolResultName: false,
    supportsReasoningEffort: false,
    thinkingFormat: 'default',
    reportUsageInStream: false,
    supportsStore: false,
  }),
  mergeCompat: vi.fn().mockImplementation((detected, overrides) => ({ ...detected, ...overrides })),
}));

vi.mock('../utils/sanitize-unicode.js', () => ({
  sanitizeSurrogates: vi.fn().mockImplementation((s: string) => s),
}));

describe('openai-compatible buildParams', () => {
  let model: any;
  let context: any;
  let options: any;
  let compat: any;

  const baseModel = {
    provider: 'openai',
    id: 'gpt-4',
    baseUrl: 'https://api.openai.com',
    reasoning: false,
    input: ['text'],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 4096,
    maxTokens: 1024,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    model = { ...baseModel };
    context = { messages: [], systemPrompt: undefined, tools: undefined };
    options = {};
    compat = {
      supportsDeveloperRole: false,
      requiresThinkingAsText: false,
      insertAssistantBetweenToolAndUser: false,
      strictModeAvailable: false,
      needToolResultName: false,
      supportsReasoningEffort: false,
      thinkingFormat: 'default',
      reportUsageInStream: false,
      supportsStore: false,
    };
  });

  describe('system prompt', () => {
    it('includes system prompt when set and no developer role', () => {
      context.systemPrompt = 'You are a helpful assistant';
      const result = buildParams(model, context, options, compat);
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].role).toBe('system');
      expect(result.messages[0].content).toBe('You are a helpful assistant');
    });

    it('uses developer role when model.reasoning and supportsDeveloperRole', () => {
      model.reasoning = true;
      compat.supportsDeveloperRole = true;
      context.systemPrompt = 'Think step by step';
      const result = buildParams(model, context, options, compat);
      expect(result.messages[0].role).toBe('developer');
      expect(result.messages[0].content).toBe('Think step by step');
    });
  });

  describe('user messages', () => {
    it('handles user text message array format', () => {
      context.messages = [{ role: 'user', content: [{ type: 'text', text: 'Hello' }] }];
      const result = buildParams(model, context, options, compat);
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].role).toBe('user');
      expect(result.messages[0].content).toEqual([{ type: 'text', text: 'Hello' }]);
    });

    it('handles user text message string format', () => {
      context.messages = [{ role: 'user', content: 'Hello string' }];
      const result = buildParams(model, context, options, compat);
      expect(result.messages[0].content).toEqual([{ type: 'text', text: 'Hello string' }]);
    });

    it('includes image block when model supports image input', () => {
      model.input = ['text', 'image'];
      context.messages = [{
        role: 'user',
        content: [{ type: 'image', mimeType: 'image/png', data: 'abc' }],
      }];
      const result = buildParams(model, context, options, compat);
      expect(result.messages[0].content).toEqual([{ type: 'image_url', image_url: { url: 'data:image/png;base64,abc' } }]);
    });

    it('handles mixed text and image', () => {
      model.input = ['text', 'image'];
      context.messages = [{
        role: 'user',
        content: [
          { type: 'text', text: 'See this' },
          { type: 'image', mimeType: 'image/jpeg', data: 'xyz' },
        ],
      }];
      const result = buildParams(model, context, options, compat);
      expect(result.messages[0].content).toHaveLength(2);
      expect(result.messages[0].content[0]).toEqual({ type: 'text', text: 'See this' });
      expect(result.messages[0].content[1]).toEqual({ type: 'image_url', image_url: { url: 'data:image/jpeg;base64,xyz' } });
    });
  });

  describe('assistant messages', () => {
    it('handles plain text content as array', () => {
      context.messages = [{
        role: 'assistant',
        content: [{ type: 'text', text: 'Hello there' }],
      }];
      const result = buildParams(model, context, options, compat);
      expect(result.messages[0].role).toBe('assistant');
      expect(result.messages[0].content).toBe('Hello there'); // concatenated string
    });

    it('handles multiple text blocks concatenated', () => {
      context.messages = [{
        role: 'assistant',
        content: [
          { type: 'text', text: 'Hello' },
          { type: 'text', text: ' world' },
        ],
      }];
      const result = buildParams(model, context, options, compat);
      expect(result.messages[0].content).toBe('Hello world');
    });

    it('includes tool calls', () => {
      context.messages = [{
        role: 'assistant',
        content: [{
          type: 'toolCall',
          id: 'call_123',
          name: 'test_tool',
          arguments: { arg: 'value' },
        }],
      }];
      const result = buildParams(model, context, options, compat);
      expect(result.messages[0].tool_calls).toHaveLength(1);
      expect(result.messages[0].tool_calls[0].id).toBe('call_123');
      expect(result.messages[0].tool_calls[0].function.name).toBe('test_tool');
      expect(result.messages[0].tool_calls[0].function.arguments).toBe('{"arg":"value"}');
    });

    it('cleans tool call id with pipe and special chars', () => {
      context.messages = [{
        role: 'assistant',
        content: [{
          type: 'toolCall',
          id: 'call_abc|extra$',
          name: 'toolX',
          arguments: {},
        }],
      }];
      const result = buildParams(model, context, options, compat);
      // Cleaning: split on '|' and take first part; non-alphanumeric/_/- become '_'.
      expect(result.messages[0].tool_calls[0].id).toBe('call_abc'); // first part, no extra sanitization needed
    });

    it('handles mixed text and tool calls', () => {
      context.messages = [{
        role: 'assistant',
        content: [
          { type: 'text', text: 'I will call a tool' },
          { type: 'toolCall', id: 'c1', name: 't1', arguments: {} },
        ],
      }];
      const result = buildParams(model, context, options, compat);
      expect(result.messages[0].content).toBe('I will call a tool');
      expect(result.messages[0].tool_calls).toHaveLength(1);
    });
  });

  describe('toolResult messages', () => {
    it('converts toolResult to tool role', () => {
      context.messages = [{
        role: 'toolResult',
        content: [{ type: 'text', text: 'Result data' }],
        toolCallId: 'call_999',
        toolName: 'my_tool',
      }];
      const result = buildParams(model, context, options, compat);
      expect(result.messages[0].role).toBe('tool');
      expect(result.messages[0].content).toBe('Result data');
      expect(result.messages[0].tool_call_id).toBe('call_999');
      expect(result.messages[0].name).toBeUndefined();
    });

    it('adds tool name when needToolResultName true', () => {
      compat.needToolResultName = true;
      context.messages = [{
        role: 'toolResult',
        content: [{ type: 'text', text: 'Ok' }],
        toolCallId: 'call_xyz',
        toolName: 'toolX',
      }];
      const result = buildParams(model, context, options, compat);
      expect(result.messages[0].name).toBe('toolX');
    });
  });

  describe('assistant placeholder insertion', () => {
    it('inserts placeholder between tool and user when required', () => {
      compat.insertAssistantBetweenToolAndUser = true;
      context.messages = [
        { role: 'toolResult', content: [{ type: 'text', text: 'Done' }], toolCallId: 'c1', toolName: 't' },
        { role: 'user', content: [{ type: 'text', text: 'Thanks' }] },
      ];
      const result = buildParams(model, context, options, compat);
      const roles = result.messages.map((m: any) => m.role);
      expect(roles).toEqual(['tool', 'assistant', 'user']);
      const placeholder = result.messages.find(m => m.role === 'assistant');
      expect(placeholder.content).toBe('Processed tool results.');
    });
  });

  describe('tools parameter', () => {
    it('includes tools when context.tools provided', () => {
      context.tools = [{ name: 'test_tool', description: 'Test tool', parameters: { type: 'object' } }];
      const result = buildParams(model, context, options, compat);
      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].type).toBe('function');
      expect(result.tools[0].function.name).toBe('test_tool');
      expect(result.tools[0].function.description).toBe('Test tool');
      expect(result.tools[0].strict).toBeUndefined(); // strictModeAvailable false
    });

    it('does not set tools when context.tools is empty', () => {
      context.tools = [];
      const result = buildParams(model, context, options, compat);
      expect(result.tools).toBeUndefined();
    });
  });

  describe('OpenRouter cache control', () => {
    it('adds cache_control to last user or assistant for anthropic models', () => {
      model.provider = 'openrouter';
      model.id = 'anthropic/claude-3';
      context.messages = [
        { role: 'user', content: [{ type: 'text', text: 'Hello' }] },
        { role: 'assistant', content: [{ type: 'text', text: 'Hi' }] },
      ];
      const result = buildParams(model, context, options, compat);
      // Assistant is last; its content becomes an array with cache_control on text block
      const asstMsg = result.messages.find(m => m.role === 'assistant');
      expect(asstMsg.content).toHaveLength(1);
      expect(asstMsg.content[0].type).toBe('text');
      expect(asstMsg.content[0].text).toBe('Hi');
      expect(asstMsg.content[0].cache_control).toEqual({ type: 'ephemeral' });
    });

    it('does not modify non-anthropic providers', () => {
      model.provider = 'openai';
      model.id = 'gpt-4';
      context.messages = [
        { role: 'user', content: [{ type: 'text', text: 'Hello' }] },
        { role: 'assistant', content: [{ type: 'text', text: 'Hi' }] },
      ];
      const result = buildParams(model, context, options, compat);
      const asstMsg = result.messages.find(m => m.role === 'assistant');
      expect(asstMsg.content).toBe('Hi'); // plain string
    });
  });

  describe('stream and model parameters', () => {
    it('includes model id and stream true', () => {
      context.messages = [{ role: 'user', content: 'Hello' }];
      const result = buildParams(model, context, options, compat);
      expect(result.model).toBe('gpt-4');
      expect(result.stream).toBe(true);
    });
  });
});
