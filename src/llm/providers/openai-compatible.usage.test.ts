// SPDX-License-Identifier: Apache-2.0
/**
 * Usage accounting regression tests.
 *
 * calcUsage must follow documented OpenAI/OpenRouter semantics:
 * - completion_tokens already includes reasoning_tokens (they must not be added again)
 * - cached_tokens is a cache-READ count and must not have cache_write_tokens subtracted
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Model, Context } from '../types.js';

vi.mock('../overflow.js', () => ({
  truncateContext: vi.fn().mockImplementation((ctx) => ctx),
}));

vi.mock('../transform-messages.js', () => ({
  transformMessages: vi.fn().mockImplementation((msgs) => msgs),
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

vi.mock('../env-api-keys.js', () => ({
  getApiKey: vi.fn().mockReturnValue('test-api-key'),
}));

vi.mock('../models.js', () => ({
  calculateCost: vi.fn(),
}));

import { stream, complete } from './openai-compatible.js';
import { apiRegistry } from '../api-registry.js';

const baseModel: Model = {
  provider: 'openai',
  id: 'gpt-4',
  baseUrl: 'https://api.openai.com/v1',
  reasoning: false,
  input: ['text'],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 4096,
  maxTokens: 1024,
};

const baseContext: Context = {
  messages: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
  systemPrompt: 'You are a helpful assistant',
  tools: undefined,
};

function mockClientWithUsage(usage: any) {
  const mockClient = {
    chat: {
      completions: {
        create: vi.fn().mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
            yield { choices: [{ delta: { content: 'Hello' }, index: 0 }] };
            yield { choices: [{ finish_reason: 'stop', index: 0, usage }] };
          },
        }),
      },
    },
  };
  vi.spyOn(apiRegistry, 'getOrCreate').mockReturnValue(mockClient as any);
  return mockClient;
}

describe('openai-compatible usage accounting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not add reasoning_tokens to completion_tokens', async () => {
    mockClientWithUsage({
      prompt_tokens: 100,
      completion_tokens: 200,
      completion_tokens_details: { reasoning_tokens: 150 },
    });

    const result = await complete(baseModel, baseContext, {});

    // completion_tokens already includes reasoning tokens.
    expect(result.usage.output).toBe(200);
    expect(result.usage.totalTokens).toBe(300);
  });

  it('does not subtract cache_write_tokens from cached_tokens', async () => {
    mockClientWithUsage({
      prompt_tokens: 1000,
      completion_tokens: 10,
      prompt_tokens_details: { cached_tokens: 800, cache_write_tokens: 200 },
    });

    const result = await complete(baseModel, baseContext, {});

    expect(result.usage.cacheRead).toBe(800);
    expect(result.usage.cacheWrite).toBe(200);
    expect(result.usage.input).toBe(0);
    expect(result.usage.totalTokens).toBe(1010);
  });

  it('accepts alternative cached-token placements', async () => {
    mockClientWithUsage({
      prompt_tokens: 100,
      completion_tokens: 10,
      prompt_cache_hit_tokens: 40,
    });

    const result = await complete(baseModel, baseContext, {});

    expect(result.usage.cacheRead).toBe(40);
    expect(result.usage.input).toBe(60);
  });

  it('defaults missing usage numbers to zero', async () => {
    mockClientWithUsage({});

    const result = await complete(baseModel, baseContext, {});

    expect(result.usage.input).toBe(0);
    expect(result.usage.output).toBe(0);
    expect(result.usage.cacheRead).toBe(0);
    expect(result.usage.totalTokens).toBe(0);
  });
});
