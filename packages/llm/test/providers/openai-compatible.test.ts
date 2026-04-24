import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the OpenAI client
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: { completions: { create: vi.fn() } },
    })),
  };
});

// Mock env-api-keys
vi.mock('../../src/env-api-keys', () => ({
  getApiKey: vi.fn(() => 'mock-api-key'),
}));

// Mock api-registry
vi.mock('../../src/api-registry', () => ({
  apiRegistry: {
    getOrCreate: vi.fn(() => ({ chat: { completions: { create: vi.fn() } } })),
    getStats: vi.fn(() => ({ totalClients: 0, clients: {} })),
    closeAll: vi.fn(),
  },
}));

describe('providers/openai-compatible', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('stream function', () => {
    it('should be exported', async () => {
      const { stream } = await import('../../src/providers/openai-compatible');
      expect(stream).toBeDefined();
      expect(typeof stream).toBe('function');
    });

    it('should accept model, context and options', async () => {
      const { stream } = await import('../../src/providers/openai-compatible');
      const model = {
        id: 'gpt-4', name: 'GPT-4', api: 'openai', provider: 'openai', baseUrl: 'https://api.openai.com/v1',
        reasoning: false, input: ['text'], cost: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 8000, maxTokens: 4000,
      };
      const context = { messages: [{ role: 'user', content: 'Hello', timestamp: Date.now() }] };
      const result = stream(model, context);
      expect(result).toBeDefined();
    });
  });

  describe('complete function', () => {
    it('should be exported', async () => {
      const { complete } = await import('../../src/providers/openai-compatible');
      expect(complete).toBeDefined();
      expect(typeof complete).toBe('function');
    });
  });

  describe('Provider exports', () => {
    it('should export stream and complete from index', async () => {
      const { stream, complete } = await import('../../src/providers/index');
      expect(stream).toBeDefined();
      expect(complete).toBeDefined();
    });
  });
});

describe('Integration scenarios', () => {
  describe('Message transformation', () => {
    it('should transform user messages to OpenAI format', async () => {
      const { stream } = await import('../../src/providers/openai-compatible');
      const model = {
        id: 'gpt-4', name: 'GPT-4', api: 'openai', provider: 'openai', baseUrl: 'https://api.openai.com/v1',
        reasoning: false, input: ['text'], cost: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 8000, maxTokens: 4000,
      };
      const context = {
        systemPrompt: 'You are a helpful assistant.',
        messages: [
          { role: 'user', content: 'Hello!', timestamp: Date.now() },
        ],
      };
      const streamResult = stream(model, context);
      expect(streamResult).toBeDefined();
    });

    it('should handle tools in context', async () => {
      const { stream } = await import('../../src/providers/openai-compatible');
      const model = {
        id: 'gpt-4', name: 'GPT-4', api: 'openai', provider: 'openai', baseUrl: 'https://api.openai.com/v1',
        reasoning: false, input: ['text'], cost: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 8000, maxTokens: 4000,
      };
      const context = {
        messages: [{ role: 'user', content: 'What is the weather?', timestamp: Date.now() }],
        tools: [{ name: 'get_weather', description: 'Get weather for a location', parameters: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] } }],
      };
      const streamResult = stream(model, context);
      expect(streamResult).toBeDefined();
    });
  });

  describe('Stream options', () => {
    it('should accept temperature option', async () => {
      const { stream } = await import('../../src/providers/openai-compatible');
      const model = {
        id: 'gpt-4', name: 'GPT-4', api: 'openai', provider: 'openai', baseUrl: 'https://api.openai.com/v1',
        reasoning: false, input: ['text'], cost: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 8000, maxTokens: 4000,
      };
      const context = { messages: [{ role: 'user', content: 'Hello', timestamp: Date.now() }] };
      const streamResult = stream(model, context, { temperature: 0.7 });
      expect(streamResult).toBeDefined();
    });

    it('should accept maxTokens option', async () => {
      const { stream } = await import('../../src/providers/openai-compatible');
      const model = {
        id: 'gpt-4', name: 'GPT-4', api: 'openai', provider: 'openai', baseUrl: 'https://api.openai.com/v1',
        reasoning: false, input: ['text'], cost: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 8000, maxTokens: 4000,
      };
      const context = { messages: [{ role: 'user', content: 'Hello', timestamp: Date.now() }] };
      const streamResult = stream(model, context, { maxTokens: 1000 });
      expect(streamResult).toBeDefined();
    });

    it('should accept signal option', async () => {
      const { stream } = await import('../../src/providers/openai-compatible');
      const model = {
        id: 'gpt-4', name: 'GPT-4', api: 'openai', provider: 'openai', baseUrl: 'https://api.openai.com/v1',
        reasoning: false, input: ['text'], cost: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 8000, maxTokens: 4000,
      };
      const context = { messages: [{ role: 'user', content: 'Hello', timestamp: Date.now() }] };
      const controller = new AbortController();
      const streamResult = stream(model, context, { signal: controller.signal });
      expect(streamResult).toBeDefined();
    });

    it('should accept reasoningEffort option', async () => {
      const { stream } = await import('../../src/providers/openai-compatible');
      const model = {
        id: 'o1-preview', name: 'o1 Preview', api: 'openai', provider: 'openai', baseUrl: 'https://api.openai.com/v1',
        reasoning: true, input: ['text'], cost: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 128000, maxTokens: 32768,
      };
      const context = { messages: [{ role: 'user', content: 'Solve this problem...', timestamp: Date.now() }] };
      const streamResult = stream(model, context, { reasoningEffort: 'high' });
      expect(streamResult).toBeDefined();
    });
  });
});