// SPDX-License-Identifier: Apache-2.0
/**
 * Branch coverage tests for OpenAI-compatible provider buildParams function.
 * Covers system message role selection, system prompt omission, max tokens param variation,
 * thinking-to-text transformation when requiresThinkingAsText, toolCall ID cleaning,
 * and tools/tool_choice passthrough.
 */

import { vi, describe, it, expect } from 'vitest';

// Mock dependencies before importing buildParams
vi.mock('../overflow.js', () => ({
  truncateContext: vi.fn().mockImplementation(ctx => ctx),
}));
vi.mock('../transform-messages.js', () => ({
  transformMessages: vi.fn().mockImplementation((msgs, model) => msgs),
}));
vi.mock('../utils/sanitize-unicode.js', () => ({
  sanitizeSurrogates: vi.fn().mockImplementation(s => s),
}));

import { buildParams } from './openai-compatible.js';
import type { Model, Context, StreamOptions } from '../../llm/types.js';

// Helper to create a default model
function defaultModel(overrides: Partial<Model> = {}): Model {
  return {
    id: 'gpt-4',
    provider: 'openai',
    contextWindow: 8192,
    maxTokens: 4096,
    reasoning: false,
    baseUrl: undefined,
    compat: undefined,
    ...overrides,
  };
}

// Helper to create a default context
function defaultContext(overrides: Partial<Context> = {}): Context {
  return {
    messages: [],
    systemPrompt: 'System prompt',
    tools: [],
    ...overrides,
  };
}

// Helper to create default options
function defaultOptions(overrides: Partial<StreamOptions> = {}): StreamOptions {
  return {
    maxTokens: 1000,
    temperature: 1,
    topP: 1,
    stop: [],
    presencePenalty: 0,
    frequencyPenalty: 0,
    logitBias: undefined,
    user: undefined,
    ...overrides,
  };
}

// Helper to create required CompatSettings
function defaultCompat(overrides: any = {}): any {
  return {
    requiresThinkingAsText: false,
    supportsDeveloperRole: false,
    maxTokensParam: 'max_tokens',
    ...overrides,
  };
}

describe('buildParams branch coverage', () => {
  it('includes system message with role system when no reasoning', () => {
    const model = defaultModel();
    const ctx = defaultContext({ messages: [] });
    const params = buildParams(model, ctx, defaultOptions(), defaultCompat());
    expect(params.messages.some((m: any) => m.role === 'system')).toBe(true);
    expect(params.messages[0].content).toContain('System prompt');
  });

  it('uses developer role when reasoning and supportsDeveloperRole true', () => {
    const model = defaultModel({ reasoning: true });
    const ctx = defaultContext();
    const compat = defaultCompat({ supportsDeveloperRole: true });
    const params = buildParams(model, ctx, defaultOptions(), compat);
    expect(params.messages[0].role).toBe('developer');
  });

  it('uses system role when reasoning but supportsDeveloperRole false', () => {
    const model = defaultModel({ reasoning: true });
    const ctx = defaultContext();
    const compat = defaultCompat({ supportsDeveloperRole: false });
    const params = buildParams(model, ctx, defaultOptions(), compat);
    expect(params.messages[0].role).toBe('system');
  });

  it('omits system message when systemPrompt empty', () => {
    const model = defaultModel();
    const ctx = defaultContext({ systemPrompt: '' });
    const params = buildParams(model, ctx, defaultOptions(), defaultCompat());
    const hasSystem = params.messages.some((m: any) => m.role === 'system' || m.role === 'developer');
    expect(hasSystem).toBe(false);
  });

  it('sets max tokens param according to compat.maxTokensParam', () => {
    const model = defaultModel();
    const ctx = defaultContext();
    const options = defaultOptions({ maxTokens: 500 });
    const params = buildParams(model, ctx, options, defaultCompat());
    expect(params.max_tokens).toBe(500);
  });

  it('uses alternative max tokens param name for certain providers', () => {
    const model = defaultModel();
    const ctx = defaultContext();
    const options = defaultOptions({ maxTokens: 500 });
    const compat = defaultCompat({ maxTokensParam: 'max_output_tokens' });
    const params = buildParams(model, ctx, options, compat);
    expect(params.max_output_tokens).toBe(500);
  });

  it('transforms thinking block to text when requiresThinkingAsText true', () => {
    const model = defaultModel();
    const ctx = defaultContext({
      messages: [
        {
          role: 'assistant',
          content: [
            { type: 'thinking', thinking: 'I am thinking' },
            { type: 'text', text: 'Hello' },
          ],
        } as any,
      ],
    });
    const compat = defaultCompat({ requiresThinkingAsText: true });
    const params = buildParams(model, ctx, defaultOptions(), compat);
    const asstMsg = params.messages.find((m: any) => m.role === 'assistant');
    // Final content is a string concatenating thinking and text (no separator)
    expect(typeof asstMsg?.content).toBe('string');
    expect(asstMsg?.content).toBe('I am thinkingHello');
  });

  it('keeps thinking block when requiresThinkingAsText false', () => {
    const model = defaultModel();
    const ctx = defaultContext({
      messages: [
        {
          role: 'assistant',
          content: [
            { type: 'thinking', thinking: 'I am thinking' },
            { type: 'text', text: 'Hello' },
          ],
        } as any,
      ],
    });
    const params = buildParams(model, ctx, defaultOptions(), defaultCompat());
    const asstMsg = params.messages.find((m: any) => m.role === 'assistant');
    // When requiresThinkingAsText false, thinking block is dropped; content becomes the text block's text
    expect(asstMsg?.content).toBe('Hello');
  });

  it('cleans toolCall ID containing pipe and special characters', () => {
    const model = defaultModel();
    const ctx = defaultContext({
      messages: [
        {
          role: 'assistant',
          content: [
            {
              type: 'toolCall',
              id: 'abc|123-xyz@456',
              name: 'test',
              arguments: {},
            } as any,
          ],
        } as any,
      ],
    });
    const params = buildParams(model, ctx, defaultOptions(), defaultCompat());
    const asstMsg = params.messages.find((m: any) => m.role === 'assistant');
    // Tool calls are placed in tool_calls array, not in content
    expect(asstMsg?.tool_calls).toHaveLength(1);
    expect(asstMsg.tool_calls[0].id).toBe('abc');
  });

  it('passes through tools and tool_choice', () => {
    const model = defaultModel();
    const tools = [{ name: 'read', description: 'read file', parameters: {} }];
    const ctx = defaultContext({ tools });
    const options = defaultOptions({ toolChoice: { type: 'function', function: { name: 'read' } } });
    const params = buildParams(model, ctx, options, defaultCompat());
    expect(params.tools).toHaveLength(1);
    expect(params.tools[0]).toEqual({ type: 'function', function: tools[0] });
    expect(params.tool_choice).toEqual({ type: 'function', function: { name: 'read' } });
  });

  describe('image handling in user messages', () => {
    it('keeps image block when model supports images', () => {
      const model = defaultModel({ input: ['text', 'image'] });
      const ctx = defaultContext({
        messages: [{ role: 'user', content: [{ type: 'image', mimeType: 'image/png', data: 'abc' }] }],
      });
      const params = buildParams(model, ctx, defaultOptions(), defaultCompat());
      const userMsg = params.messages.find((m: any) => m.role === 'user');
      expect(userMsg?.content[0].type).toBe('image_url');
      expect(userMsg?.content[0].image_url.url).toBe('data:image/png;base64,abc');
    });

    it('filters out image block when model lacks image support', () => {
      const model = defaultModel({ input: ['text'] });
      const ctx = defaultContext({
        messages: [{ role: 'user', content: [{ type: 'image', mimeType: 'image/png', data: 'abc' }] }],
      });
      const params = buildParams(model, ctx, defaultOptions(), defaultCompat());
      const userMsg = params.messages.find((m: any) => m.role === 'user');
      // image block filtered, content array empty -> message not added (since length check)
      expect(userMsg).toBeUndefined();
    });
  });

  describe('insertAssistantBetweenToolAndUser', () => {
    it('inserts assistant message when toolResult followed by user', () => {
      const model = defaultModel();
      const ctx = defaultContext({
        systemPrompt: '', // no system message to simplify
        messages: [
          { role: 'toolResult', content: [{ type: 'text', text: 'result' }], toolCallId: 'c1' },
          { role: 'user', content: [{ type: 'text', text: 'next' }] },
        ],
      });
      const compat = defaultCompat({ insertAssistantBetweenToolAndUser: true });
      const params = buildParams(model, ctx, defaultOptions(), compat);
      // Expect three messages: tool, assistant placeholder, user (note: provider expects 'tool' role instead of toolResult)
      const roles = params.messages.map((m: any) => m.role);
      expect(roles).toEqual(['tool', 'assistant', 'user']);
      const asstMsg = params.messages[1];
      expect(asstMsg.content).toBe('Processed tool results.');
    });
  });

  describe('tools parameter handling', () => {
    it('sets params.tools = [] when no tools provided but tool calls present in history', () => {
      const model = defaultModel();
      const ctx = defaultContext({
        messages: [{
          role: 'assistant',
          content: [{ type: 'toolCall', id: 'c1', name: 'bash', arguments: { cmd: 'ls' } }],
        }],
      });
      const params = buildParams(model, ctx, defaultOptions(), defaultCompat());
      expect(params.tools).toEqual([]);
    });

    it('leaves params.tools undefined when no tools and no tool calls', () => {
      const model = defaultModel();
      const ctx = defaultContext({ messages: [{ role: 'user', content: 'hi' }] });
      const params = buildParams(model, ctx, defaultOptions(), defaultCompat());
      expect(params.tools).toBeUndefined();
    });
  });

  describe('reasoningEffort handling', () => {
    const modelWithReasoning = defaultModel({ reasoning: true });
    const optionsWithEffort = defaultOptions({ reasoningEffort: 'medium' });

    it('enables thinking when thinkingFormat is zai', () => {
      const compat = defaultCompat({ supportsReasoningEffort: true, thinkingFormat: 'zai' });
      const params = buildParams(modelWithReasoning, defaultContext(), optionsWithEffort, compat);
      expect(params.enable_thinking).toBe(true);
    });

    it('enables thinking when thinkingFormat is qwen', () => {
      const compat = defaultCompat({ supportsReasoningEffort: true, thinkingFormat: 'qwen' });
      const params = buildParams(modelWithReasoning, defaultContext(), optionsWithEffort, compat);
      expect(params.enable_thinking).toBe(true);
    });

    it('sets reasoning object when thinkingFormat is openrouter', () => {
      const compat = defaultCompat({ supportsReasoningEffort: true, thinkingFormat: 'openrouter' });
      const params = buildParams(modelWithReasoning, defaultContext(), optionsWithEffort, compat);
      expect(params.reasoning).toEqual({ effort: 'medium' });
    });

    it('sets reasoning_effort when thinkingFormat other', () => {
      const compat = defaultCompat({ supportsReasoningEffort: true, thinkingFormat: 'anthropic' });
      const params = buildParams(modelWithReasoning, defaultContext(), optionsWithEffort, compat);
      expect(params.reasoning_effort).toBe('medium');
    });

    it('does not set any reasoning params when reasoning false', () => {
      const model = defaultModel({ reasoning: false });
      const compat = defaultCompat({ supportsReasoningEffort: true, thinkingFormat: 'openrouter' });
      const params = buildParams(model, defaultContext(), optionsWithEffort, compat);
      expect(params.enable_thinking).toBeUndefined();
      expect(params.reasoning).toBeUndefined();
      expect(params.reasoning_effort).toBeUndefined();
    });
  });

  describe('usage streaming and store flags', () => {
    it('sets stream_options when reportUsageInStream true', () => {
      const compat = defaultCompat({ reportUsageInStream: true });
      const params = buildParams(defaultModel(), defaultContext(), defaultOptions(), compat);
      expect(params.stream_options).toEqual({ include_usage: true });
    });

    it('sets store false when supportsStore true', () => {
      const compat = defaultCompat({ supportsStore: true });
      const params = buildParams(defaultModel(), defaultContext(), defaultOptions(), compat);
      expect(params.store).toBe(false);
    });
  });

  describe('insertAssistantBetweenToolAndUser disabled', () => {
    it('does not insert assistant when flag false', () => {
      const model = defaultModel();
      const ctx = defaultContext({
        systemPrompt: '',
        messages: [
          { role: 'toolResult', content: [{ type: 'text', text: 'result' }], toolCallId: 'c1' },
          { role: 'user', content: [{ type: 'text', text: 'next' }] },
        ],
      });
      const compat = defaultCompat({ insertAssistantBetweenToolAndUser: false });
      const params = buildParams(model, ctx, defaultOptions(), compat);
      const roles = params.messages.map((m: any) => m.role);
      expect(roles).toEqual(['tool', 'user']);
    });
  });

  describe('reportUsageInStream false', () => {
    it('does not set stream_options when disabled', () => {
      const compat = defaultCompat({ reportUsageInStream: false });
      const params = buildParams(defaultModel(), defaultContext(), defaultOptions(), compat);
      expect(params.stream_options).toBeUndefined();
    });
  });

  describe('supportsStore false', () => {
    it('does not set store flag when disabled', () => {
      const compat = defaultCompat({ supportsStore: false });
      const params = buildParams(defaultModel(), defaultContext(), defaultOptions(), compat);
      expect(params.store).toBeUndefined();
    });
  });
});
