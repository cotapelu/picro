import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the required modules
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: { completions: { create: vi.fn() } },
  })),
}));

vi.mock('../../src/env-api-keys', () => ({
  getApiKey: vi.fn(() => 'mock-api-key'),
}));

vi.mock('../../src/api-registry', () => ({
  apiRegistry: {
    getOrCreate: vi.fn(() => ({
      chat: { completions: { create: vi.fn() } },
    })),
  },
}));

import { stream, complete } from '../../src/providers/openai-compatible';
import type { Model, Context } from '../../src/types';

describe('stream function', () => {
  const mockModel: Model = {
    id: 'gpt-4',
    name: 'GPT-4',
    api: 'openai',
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    reasoning: false,
    input: ['text'],
    cost: { input: 30, output: 60, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 8192,
    maxTokens: 4096,
  };

  it('should be a function', () => {
    expect(typeof stream).toBe('function');
  });

  it('should accept model and context parameters', () => {
    const context: Context = {
      messages: [{ role: 'user', content: 'Hello', timestamp: Date.now() }],
    };

    const result = stream(mockModel, context);
    expect(result).toBeDefined();
  });

  it('should accept empty options', () => {
    const context: Context = {
      messages: [{ role: 'user', content: 'Hello', timestamp: Date.now() }],
    };

    const result = stream(mockModel, context, {});
    expect(result).toBeDefined();
  });

  it('should handle context with system prompt', () => {
    const context: Context = {
      systemPrompt: 'You are a helpful assistant.',
      messages: [{ role: 'user', content: 'Hello', timestamp: Date.now() }],
    };

    const result = stream(mockModel, context);
    expect(result).toBeDefined();
  });

  it('should handle context with multiple messages', () => {
    const context: Context = {
      messages: [
        { role: 'user', content: 'Hello', timestamp: Date.now() },
        { role: 'assistant', content: [{ type: 'text', text: 'Hi!' }], api: 'openai', provider: 'openai', model: 'gpt-4', usage: { input: 10, output: 5, cacheRead: 0, cacheWrite: 0, totalTokens: 15, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } }, stopReason: 'stop', timestamp: Date.now() },
        { role: 'user', content: 'How are you?', timestamp: Date.now() },
      ],
    };

    const result = stream(mockModel, context);
    expect(result).toBeDefined();
  });

  it('should handle reasoning model with reasoningEffort', () => {
    const reasoningModel: Model = {
      ...mockModel,
      id: 'o1-preview',
      reasoning: true,
    };

    const context: Context = {
      messages: [{ role: 'user', content: 'Solve this', timestamp: Date.now() }],
    };

    const result = stream(reasoningModel, context, { reasoningEffort: 'high' });
    expect(result).toBeDefined();
  });

  it('should handle vision model with image', () => {
    const visionModel: Model = {
      ...mockModel,
      id: 'gpt-4-vision',
      input: ['text', 'image'],
    };

    const context: Context = {
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'What is in this image?' },
            { type: 'image', data: 'base64data', mimeType: 'image/png' },
          ],
          timestamp: Date.now(),
        },
      ],
    };

    const result = stream(visionModel, context);
    expect(result).toBeDefined();
  });
});

describe('complete function', () => {
  const mockModel: Model = {
    id: 'gpt-4',
    name: 'GPT-4',
    api: 'openai',
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    reasoning: false,
    input: ['text'],
    cost: { input: 30, output: 60, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 8192,
    maxTokens: 4096,
  };

  it('should be a function', () => {
    expect(typeof complete).toBe('function');
  });

  it('should accept model and context', () => {
    const context: Context = {
      messages: [{ role: 'user', content: 'Hello', timestamp: Date.now() }],
    };

    const result = complete(mockModel, context);
    expect(result).toBeInstanceOf(Promise);
  });
});

describe('StreamOptions', () => {
  const mockModel: Model = {
    id: 'gpt-4',
    name: 'GPT-4',
    api: 'openai',
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    reasoning: false,
    input: ['text'],
    cost: { input: 30, output: 60, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 8192,
    maxTokens: 4096,
  };

  it('should accept temperature option', () => {
    const context: Context = {
      messages: [{ role: 'user', content: 'Hello', timestamp: Date.now() }],
    };

    const result = stream(mockModel, context, { temperature: 0.7 });
    expect(result).toBeDefined();
  });

  it('should accept maxTokens option', () => {
    const context: Context = {
      messages: [{ role: 'user', content: 'Hello', timestamp: Date.now() }],
    };

    const result = stream(mockModel, context, { maxTokens: 1000 });
    expect(result).toBeDefined();
  });

  it('should accept signal option', () => {
    const context: Context = {
      messages: [{ role: 'user', content: 'Hello', timestamp: Date.now() }],
    };

    const controller = new AbortController();
    const result = stream(mockModel, context, { signal: controller.signal });
    expect(result).toBeDefined();
  });

  it('should accept reasoningEffort option', () => {
    const context: Context = {
      messages: [{ role: 'user', content: 'Hello', timestamp: Date.now() }],
    };

    const result = stream(mockModel, context, { reasoningEffort: 'high' });
    expect(result).toBeDefined();
  });

  it('should accept onPayload hook', () => {
    const context: Context = {
      messages: [{ role: 'user', content: 'Hello', timestamp: Date.now() }],
    };

    const onPayload = (payload: any) => payload;
    const result = stream(mockModel, context, { onPayload });
    expect(result).toBeDefined();
  });

  it('should accept toolChoice option', () => {
    const context: Context = {
      messages: [{ role: 'user', content: 'Use a tool', timestamp: Date.now() }],
      tools: [
        {
          name: 'get_weather',
          description: 'Get weather',
          parameters: {
            type: 'object',
            properties: { city: { type: 'string' } },
          },
        },
      ],
    };

    const result = stream(mockModel, context, { toolChoice: 'auto' });
    expect(result).toBeDefined();
  });

  it('should accept custom headers', () => {
    const context: Context = {
      messages: [{ role: 'user', content: 'Hello', timestamp: Date.now() }],
    };

    const result = stream(mockModel, context, { headers: { 'X-Custom': 'value' } });
    expect(result).toBeDefined();
  });
});