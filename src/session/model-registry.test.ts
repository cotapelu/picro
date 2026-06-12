import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DefaultModelRegistry, createModelRegistry } from './model-registry.js';

// Mock llm index module
vi.mock('../llm/index.js', () => {
  return {
    getModel: vi.fn(),
    getProviders: vi.fn(),
    getModels: vi.fn(),
  };
});

import { getModel, getProviders, getModels } from '../llm/index.js';
import type { Model } from '../llm/index.js';

describe('DefaultModelRegistry', () => {
  let registry: DefaultModelRegistry;

  const mockModel = (provider: string, id: string): Model => ({
    provider,
    id,
    name: `${provider}/${id}`,
    baseUrl: 'https://api.openai.com',
    reasoning: false,
    input: ['text'],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 4096,
    maxTokens: 1024,
  } as Model);

  beforeEach(() => {
    vi.clearAllMocks();
    registry = new DefaultModelRegistry();
    vi.mocked(getProviders).mockReturnValue(['openai', 'anthropic']);
    vi.mocked(getModels).mockImplementation((p: string) => {
      if (p === 'openai') return [mockModel('openai', 'gpt-4'), mockModel('openai', 'gpt-4o-mini')];
      if (p === 'anthropic') return [mockModel('anthropic', 'claude-3-5-sonnet')];
      return [];
    });
  });

  describe('find', () => {
    it('should return model from getModel', () => {
      const expected = mockModel('openai', 'gpt-4');
      vi.mocked(getModel).mockReturnValue(expected);
      expect(registry.find('openai', 'gpt-4')).toBe(expected);
      expect(getModel).toHaveBeenCalledWith('openai', 'gpt-4');
    });

    it('should return undefined when getModel returns undefined', () => {
      vi.mocked(getModel).mockReturnValue(undefined);
      expect(registry.find('openai', 'unknown')).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return all models from all providers', () => {
      const all = registry.getAll();
      expect(getProviders).toHaveBeenCalled();
      expect(getModels).toHaveBeenCalledTimes(2);
      expect(all).toHaveLength(3);
    });
  });

  describe('getProviders', () => {
    it('should return providers from llm', () => {
      vi.mocked(getProviders).mockReturnValue(['openai']);
      expect(registry.getProviders()).toEqual(['openai']);
    });
  });

  describe('hasConfiguredAuth', () => {
    it('returns true if custom API key set', () => {
      registry.setApiKey('openai', 'custom-key');
      const model = mockModel('openai', 'gpt-4');
      expect(registry.hasConfiguredAuth(model)).toBe(true);
    });

    it('returns true if env var set', () => {
      const model = mockModel('openai', 'gpt-4');
      process.env.OPENAI_API_KEY = 'env-key';
      expect(registry.hasConfiguredAuth(model)).toBe(true);
      delete process.env.OPENAI_API_KEY;
    });

    it('returns false if no api key', () => {
      const model = mockModel('openai', 'gpt-4');
      expect(registry.hasConfiguredAuth(model)).toBe(false);
    });

    it('returns true for custom wildcard key for any model of provider', () => {
      registry.setApiKey('anthropic', 'custom-key');
      const model = mockModel('anthropic', 'claude-3');
      expect(registry.hasConfiguredAuth(model)).toBe(true);
    });
  });

  describe('getApiKeyAndHeaders', () => {
    it('returns custom api key and headers', async () => {
      registry.setApiKey('openai', 'custom-key', { 'X-Custom': 'val' });
      const model = mockModel('openai', 'gpt-4');
      const res = await registry.getApiKeyAndHeaders(model);
      expect(res.ok).toBe(true);
      expect(res.apiKey).toBe('custom-key');
      expect(res.headers).toEqual({ 'X-Custom': 'val' });
    });

    it('returns env api key if no custom', async () => {
      process.env.OPENAI_API_KEY = 'env-key';
      const model = mockModel('openai', 'gpt-4');
      const res = await registry.getApiKeyAndHeaders(model);
      expect(res.ok).toBe(true);
      expect(res.apiKey).toBe('env-key');
      delete process.env.OPENAI_API_KEY;
    });

    it('returns error if no api key available', async () => {
      const model = mockModel('openai', 'gpt-4');
      const res = await registry.getApiKeyAndHeaders(model);
      expect(res.ok).toBe(false);
      expect(res.error).toContain('No API key found');
    });

    it('merges model-specific headers with provider headers', async () => {
      registry.setApiKey('openai', 'key', { 'X-Prov': 'prov' });
      registry.setModelApiKey('openai', 'gpt-4', undefined, { 'X-Model': 'model' });
      const model = mockModel('openai', 'gpt-4');
      const res = await registry.getApiKeyAndHeaders(model);
      expect(res.ok).toBe(true);
      expect(res.headers).toEqual({ 'X-Prov': 'prov', 'X-Model': 'model' });
    });

    it('model-specific headers override provider headers on conflict', async () => {
      registry.setApiKey('openai', 'key', { 'X-Common': 'prov' });
      registry.setModelApiKey('openai', 'gpt-4', undefined, { 'X-Common': 'model' });
      const model = mockModel('openai', 'gpt-4');
      const res = await registry.getApiKeyAndHeaders(model);
      expect(res.headers!['X-Common']).toBe('model');
    });
  });

  describe('registerProvider', () => {
    it('should set apiKey and headers via setApiKey', () => {
      registry.registerProvider('custom', { apiKey: 'custom-key', extraHeaders: { 'X-Custom': 'val' } });
      const model = mockModel('custom', 'any');
      expect(registry.hasConfiguredAuth(model)).toBe(true);
      return registry.getApiKeyAndHeaders(model).then(res => {
        expect(res.ok).toBe(true);
        expect(res.apiKey).toBe('custom-key');
        expect(res.headers).toEqual({ 'X-Custom': 'val' });
      });
    });

    it('should merge extraHeaders with existing', () => {
      registry.registerProvider('custom', { apiKey: 'ckey', extraHeaders: { 'X-A': '1' } });
      registry.registerProvider('custom', { extraHeaders: { 'X-B': '2' } });
      // The second call will merge into existing headers (since _getKey wildcard)
      return registry.getApiKeyAndHeaders(mockModel('custom', 'any')).then(res => {
        expect(res.ok).toBe(true);
        expect(res.headers).toEqual({ 'X-A': '1', 'X-B': '2' });
      });
    });
  });

  describe('createModelRegistry', () => {
    it('returns an instance of DefaultModelRegistry', () => {
      const reg = createModelRegistry();
      expect(reg).toBeInstanceOf(DefaultModelRegistry);
    });
  });

  describe('AuthStorage integration', () => {
    it('should include models when AuthStorage has API key', async () => {
      const mockAuthStorage = {
        getApiKey: vi.fn((provider: string) => {
          if (provider === 'openai') return 'sk-test';
          if (provider === '*') return 'wildcard-key';
          return undefined;
        }),
      } as any;

      const registry = new DefaultModelRegistry(mockAuthStorage);

      vi.mocked(getProviders).mockReturnValue(['openai']);
      vi.mocked(getModels).mockImplementation((p: string) => {
        if (p === 'openai') return [mockModel('openai', 'gpt-4')];
        return [];
      });

      const available = await registry.getAvailable();
      expect(available).toHaveLength(1);
      expect(available[0].id).toBe('gpt-4');
      expect(mockAuthStorage.getApiKey).toHaveBeenCalledWith('openai');
    });

    it('should not include models when AuthStorage has no key', async () => {
      const mockAuthStorage = {
        getApiKey: vi.fn(() => undefined),
      } as any;

      const registry = new DefaultModelRegistry(mockAuthStorage);
      vi.mocked(getProviders).mockReturnValue(['openai']);
      vi.mocked(getModels).mockImplementation((p: string) => {
        if (p === 'openai') return [mockModel('openai', 'gpt-4')];
        return [];
      });

      const available = await registry.getAvailable();
      expect(available).toHaveLength(0);
    });
  });
});
