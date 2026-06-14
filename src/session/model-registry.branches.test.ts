// SPDX-License-Identifier: Apache-2.0
/**
 * Branch coverage tests for DefaultModelRegistry.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DefaultModelRegistry } from './model-registry.js';
import { AuthStorage } from './auth-storage.js';
import type { Model } from '../llm/index.js';

// Mock llm module functions
vi.mock('../llm/index.js', async () => {
  const actual = await vi.importActual('../llm/index.js');
  return {
    ...actual,
    getModel: vi.fn(),
    getModels: vi.fn(),
    getProviders: vi.fn(() => ['openai', 'anthropic', 'google', 'github-copilot']),
  };
});

// Helper to create a minimal Model mock
function mockModel(provider: string, id: string): Model {
  return {
    provider,
    id,
    name: `${provider}/${id}`,
    capabilities: { reasoning: true, vision: false },
  } as Model;
}

describe('DefaultModelRegistry branch coverage', () => {
  let registry: DefaultModelRegistry;
  let authStorage: AuthStorage;

  beforeEach(() => {
    registry = new DefaultModelRegistry();
    authStorage = AuthStorage.inMemory();
    // Set test env var for openai only
    process.env.OPENAI_API_KEY = 'env-openai-key';
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
  });

  describe('isUsingOAuth', () => {
    it('returns true for google provider', () => {
      const model = mockModel('google', 'gemini-pro');
      expect(registry.isUsingOAuth(model)).toBe(true);
    });

    it('returns true for github-copilot provider', () => {
      const model = mockModel('github-copilot', 'gpt-4');
      expect(registry.isUsingOAuth(model)).toBe(true);
    });

    it('returns false for other providers', () => {
      expect(registry.isUsingOAuth(mockModel('openai', 'gpt-4'))).toBe(false);
      expect(registry.isUsingOAuth(mockModel('anthropic', 'claude-3'))).toBe(false);
    });
  });

  describe('hasConfiguredAuth', () => {
    it('returns true when authStorage has provider key', () => {
      const model = mockModel('openai', 'gpt-4');
      authStorage.setRuntimeApiKey('openai', 'key-openai');
      const reg = new DefaultModelRegistry(authStorage);
      expect(reg.hasConfiguredAuth(model)).toBe(true);
    });

    it('returns true when authStorage has wildcard key', () => {
      const model = mockModel('anthropic', 'claude-3');
      authStorage.setRuntimeApiKey('*', 'wildkey');
      const reg = new DefaultModelRegistry(authStorage);
      expect(reg.hasConfiguredAuth(model)).toBe(true);
    });

    it('returns false when authStorage has no key and no env or custom', () => {
      const model = mockModel('nvidia', 'nvidia-model');
      // nvidia not in env
      const reg = new DefaultModelRegistry(authStorage);
      expect(reg.hasConfiguredAuth(model)).toBe(false);
    });

    it('returns true when env var present for provider', () => {
      const model = mockModel('openai', 'gpt-4');
      const reg = new DefaultModelRegistry();
      expect(reg.hasConfiguredAuth(model)).toBe(true);
    });

    it('returns true when custom api key set', () => {
      const model = mockModel('mistral', 'mistral-large');
      registry.setApiKey('mistral', 'custom-key');
      expect(registry.hasConfiguredAuth(model)).toBe(true);
    });

    it('returns false when provider not in PROVIDER_API_KEYS and no authStorage/custom', () => {
      const model = mockModel('unknown', 'test');
      expect(registry.hasConfiguredAuth(model)).toBe(false);
    });
  });

  describe('getApiKeyAndHeaders', () => {
    it('prefers authStorage over env and custom', async () => {
      const model = mockModel('openai', 'gpt-4');
      authStorage.setRuntimeApiKey('openai', 'auth-key');
      registry.setApiKey('openai', 'custom-key');
      const reg = new DefaultModelRegistry(authStorage);
      const result = await reg.getApiKeyAndHeaders(model);
      expect(result.ok).toBe(true);
      expect(result.apiKey).toBe('auth-key');
    });

    it('falls back to custom key if authStorage missing', async () => {
      const model = mockModel('anthropic', 'claude-3');
      registry.setApiKey('anthropic', 'custom-key');
      const result = await registry.getApiKeyAndHeaders(model);
      expect(result.ok).toBe(true);
      expect(result.apiKey).toBe('custom-key');
    });

    it('falls back to env var if no authStorage/custom', async () => {
      const model = mockModel('openai', 'gpt-4');
      const result = await registry.getApiKeyAndHeaders(model);
      expect(result.ok).toBe(true);
      expect(result.apiKey).toBe('env-openai-key');
    });

    it('returns error when no api key available', async () => {
      const model = mockModel('nvidia', 'nvidia-model');
      const result = await registry.getApiKeyAndHeaders(model);
      expect(result.ok).toBe(false);
      expect(result.error).toContain('No API key found');
    });

    it('includes custom headers when set via setApiKey', async () => {
      const model = mockModel('openai', 'gpt-4');
      registry.setApiKey('openai', 'custom-key', { 'X-Custom': 'value' });
      const result = await registry.getApiKeyAndHeaders(model);
      expect(result.ok).toBe(true);
      expect(result.headers).toEqual({ 'X-Custom': 'value' });
    });

    it('merges model-specific headers with wildcard', async () => {
      const model = mockModel('openai', 'gpt-4');
      // Wildcard headers
      registry.setApiKey('openai', '*key*', { 'X-Wild': 'wild' });
      // Model-specific headers
      registry.setModelApiKey('openai', 'gpt-4', 'model-key', { 'X-Model': 'model' });
      const result = await registry.getApiKeyAndHeaders(model);
      expect(result.ok).toBe(true);
      // Headers: wildcard + model-specific merge, model-specific overrides
      expect(result.headers).toEqual({ 'X-Wild': 'wild', 'X-Model': 'model' });
      // Note: current implementation uses wildcard key for apiKey (model-specific key not checked)
      expect(result.apiKey).toBe('*key*');
    });

    it('uses wildcard api key when model-specific not set', async () => {
      const model = mockModel('openai', 'gpt-4');
      registry.setApiKey('openai', 'wild-key');
      const result = await registry.getApiKeyAndHeaders(model);
      expect(result.ok).toBe(true);
      expect(result.apiKey).toBe('wild-key');
    });
  });

  describe('getAvailable', () => {
    it('returns only models with configured auth', async () => {
      // Mock providers and models
      const { getModels, getProviders } = await import('../llm/index.js');
      (getProviders as any).mockReturnValue(['openai', 'anthropic']);
      (getModels as any).mockImplementation((p: string) => {
        if (p === 'openai') return [mockModel('openai', 'gpt-4'), mockModel('openai', 'gpt-3.5')];
        if (p === 'anthropic') return [mockModel('anthropic', 'claude-3')];
        return [];
      });

      // Only set env for openai
      process.env.OPENAI_API_KEY = 'openai-key';
      const reg = new DefaultModelRegistry();
      const available = await reg.getAvailable();
      // Should only include openai models (anthropic has no auth)
      expect(available.length).toBeGreaterThanOrEqual(2);
      expect(available.every(m => m.provider === 'openai')).toBe(true);
    });
  });

  describe('registerProvider', () => {
    it('sets api key via setApiKey when provided', () => {
      const spy = vi.spyOn(registry, 'setApiKey');
      registry.registerProvider('test', { apiKey: 'test-key' });
      expect(spy).toHaveBeenCalledWith('test', 'test-key');
    });

    it('merges extraHeaders with existing wildcard headers', () => {
      registry.setApiKey('test', 'key1', { 'X-A': 'a' });
      registry.registerProvider('test', { extraHeaders: { 'X-B': 'b' } });
      const stored = (registry as any).customHeaders.get('test:*');
      expect(stored).toEqual({ 'X-A': 'a', 'X-B': 'b' });
    });
  });

  describe('getProviders', () => {
    it('returns all registered providers from llm', () => {
      const providers = registry.getProviders();
      expect(providers).toContain('openai');
      expect(providers).toContain('anthropic');
    });
  });
});
