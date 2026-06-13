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
    expect(asstMsg?.content).toEqual([
      { type: 'text', text: 'I am thinking' },
      { type: 'text', text: 'Hello' },
    ]);
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
    const hasThinking = asstMsg?.content.some((b: any) => b.type === 'thinking');
    expect(hasThinking).toBe(true);
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
    const toolCall = asstMsg?.content.find((b: any) => b.type === 'toolCall');
    expect(toolCall?.id).toBe('abc123xyz_456');
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
});
