import { vi, describe, it, expect, beforeEach } from 'vitest';

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
    insertAssistantBetweenToolAndUser: false,
    ...overrides,
  };
}

describe('openai-compatible additional branch coverage', () => {
  describe('toolChoice handling', () => {
    it('passes through toolChoice: auto', () => {
      const model = defaultModel();
      const ctx = defaultContext();
      const opts = defaultOptions({ toolChoice: 'auto' as any });
      const compat = defaultCompat();
      const params = buildParams(model, ctx, opts, compat);
      expect(params.tool_choice).toBe('auto');
    });

    it('passes through toolChoice: none', () => {
      const model = defaultModel();
      const ctx = defaultContext();
      const opts = defaultOptions({ toolChoice: 'none' as any });
      const compat = defaultCompat();
      const params = buildParams(model, ctx, opts, compat);
      expect(params.tool_choice).toBe('none');
    });

    it('passes through toolChoice: required', () => {
      const model = defaultModel();
      const ctx = defaultContext();
      const opts = defaultOptions({ toolChoice: 'required' as any });
      const compat = defaultCompat();
      const params = buildParams(model, ctx, opts, compat);
      expect(params.tool_choice).toBe('required');
    });

    it('passes through toolChoice specific function', () => {
      const model = defaultModel();
      const ctx = defaultContext();
      const opts = defaultOptions({ toolChoice: { type: 'function', function: { name: 'my_tool' } } as any });
      const compat = defaultCompat();
      const params = buildParams(model, ctx, opts, compat);
      expect(params.tool_choice).toEqual({ type: 'function', function: { name: 'my_tool' } });
    });
  });

  describe('supportsDeveloperRole', () => {
    it('uses developer role when reasoning and supportsDeveloperRole true', () => {
      const model = defaultModel({ reasoning: true });
      const ctx = defaultContext({ systemPrompt: 'Dev prompt' });
      const opts = defaultOptions();
      const compat = defaultCompat({ supportsDeveloperRole: true });
      const params = buildParams(model, ctx, opts, compat);
      // Should have a message with role 'developer'
      const devMsg = params.messages.find((m: any) => m.role === 'developer');
      expect(devMsg).toBeDefined();
      expect(devMsg.content).toBe('Dev prompt');
    });

    it('falls back to system role when reasoning false or supportsDeveloperRole false', () => {
      const model = defaultModel({ reasoning: false });
      const ctx = defaultContext({ systemPrompt: 'Sys prompt' });
      const opts = defaultOptions();
      const compat = defaultCompat({ supportsDeveloperRole: false });
      const params = buildParams(model, ctx, opts, compat);
      const sysMsg = params.messages.find((m: any) => m.role === 'system');
      expect(sysMsg).toBeDefined();
      expect(sysMsg.content).toBe('Sys prompt');
    });
  });

  describe('insertAssistantBetweenToolAndUser', () => {
    it('inserts assistant message when lastRole is tool and current is user', () => {
      const model = defaultModel();
      const ctx = defaultContext({
        messages: [
          { role: 'toolResult', content: [{ type: 'text', text: 'tool result' }], toolCallId: 'call1' },
          { role: 'user', content: [{ type: 'text', text: 'next user' }] },
        ],
      });
      const opts = defaultOptions();
      const compat = defaultCompat({ insertAssistantBetweenToolAndUser: true });
      const params = buildParams(model, ctx, opts, compat);
      // Expect assistant message between tool and user
      const roles = params.messages.map((m: any) => m.role);
      expect(roles).toContain('assistant');
      const userIndex = roles.indexOf('user');
      const assistantIndex = roles.indexOf('assistant');
      expect(assistantIndex).toBeLessThan(userIndex);
    });

    it('does not insert when flag false', () => {
      const model = defaultModel();
      const ctx = defaultContext({
        messages: [
          { role: 'toolResult', content: [{ type: 'text', text: 'tool result' }], toolCallId: 'call1' },
          { role: 'user', content: [{ type: 'text', text: 'next user' }] },
        ],
      });
      const opts = defaultOptions();
      const compat = defaultCompat({ insertAssistantBetweenToolAndUser: false });
      const params = buildParams(model, ctx, opts, compat);
      const roles = params.messages.map((m: any) => m.role);
      expect(roles).not.toContain('assistant');
    });
  });

  describe('image handling', () => {
    it('includes image_url when model.input includes image', () => {
      const model = defaultModel({ input: ['image'] });
      const ctx = defaultContext({
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'look' },
              { type: 'image', mimeType: 'image/png', data: 'abc123' },
            ],
          },
        ],
      });
      const opts = defaultOptions();
      const compat = defaultCompat();
      const params = buildParams(model, ctx, opts, compat);
      const userMsg = params.messages.find((m: any) => m.role === 'user');
      // content should be array of blocks: text and image_url
      const imageBlock = userMsg.content.find((b: any) => b.type === 'image_url');
      expect(imageBlock).toBeDefined();
      expect(imageBlock.image_url.url).toBe('data:image/png;base64,abc123');
    });

    it('filters out image blocks when model.input does not include image', () => {
      const model = defaultModel({ input: ['text'] });
      const ctx = defaultContext({
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'look' },
              { type: 'image', mimeType: 'image/jpeg', data: 'xyz' },
            ],
          },
        ],
      });
      const opts = defaultOptions();
      const compat = defaultCompat();
      const params = buildParams(model, ctx, opts, compat);
      const userMsg = params.messages.find((m: any) => m.role === 'user');
      // Only text block should remain; image block filtered
      expect(userMsg.content).toHaveLength(1);
      expect(userMsg.content[0].type).toBe('text');
    });
  });
});
