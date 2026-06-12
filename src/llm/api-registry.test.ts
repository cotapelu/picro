// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiRegistry } from './api-registry.js';
import type { Model } from './types.js';

vi.mock('openai', () => {
  class MockOpenAI {
    // any methods can be added if needed
  }
  return { default: MockOpenAI };
});

import OpenAI from 'openai';

describe('ApiRegistry', () => {
  let registry: ApiRegistry;

  const mockModel = (overrides: Partial<Model> = {}): Model => ({
    provider: 'openai',
    id: 'gpt-4',
    name: 'GPT-4',
    baseUrl: 'https://api.openai.com/v1',
    reasoning: false,
    input: ['text'],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 8192,
    maxTokens: 4096,
    ...overrides,
  });

  beforeEach(() => {
    registry = new ApiRegistry();
    vi.clearAllMocks();
  });

  describe('getOrCreate', () => {
    it('should create a new client when none exists', () => {
      const model = mockModel();
      const client = registry.getOrCreate(model, 'sk-key');
      expect(client).toBeDefined();
      expect(registry.getStats().totalClients).toBe(1);
    });

    it('should reuse the same client for identical calls', () => {
      const model = mockModel();
      const client1 = registry.getOrCreate(model, 'sk-key');
      const client2 = registry.getOrCreate(model, 'sk-key');
      expect(client1).toBe(client2);
      expect(registry.getStats().totalClients).toBe(1);
    });

    it('should create separate clients for different models', () => {
      const model1 = mockModel({ id: 'gpt-4' });
      const model2 = mockModel({ id: 'gpt-3.5-turbo' });
      const client1 = registry.getOrCreate(model1, 'sk-key');
      const client2 = registry.getOrCreate(model2, 'sk-key');
      expect(client1).not.toBe(client2);
      expect(registry.getStats().totalClients).toBe(2);
    });

    it('should return a client even if no apiKey provided', () => {
      const model = mockModel();
      const client = registry.getOrCreate(model);
      expect(client).toBeDefined();
      expect(registry.getStats().totalClients).toBe(1);
    });
  });

  describe('getStats', () => {
    it('should return correct stats after creating clients', () => {
      const model1 = mockModel({ id: 'm1' });
      const model2 = mockModel({ id: 'm2' });
      registry.getOrCreate(model1, 'key1');
      registry.getOrCreate(model2, 'key2');

      const stats = registry.getStats();
      expect(stats.totalClients).toBe(2);
      expect(Object.keys(stats.clients)).toHaveLength(2);
    });
  });

  describe('closeAll', () => {
    it('should clear all clients and stats', async () => {
      const model = mockModel();
      registry.getOrCreate(model, 'key');
      expect(registry.getStats().totalClients).toBe(1);
      await registry.closeAll();
      expect(registry.getStats().totalClients).toBe(0);
      expect(registry.getStats().clients).toEqual({});
    });
  });

  describe('makeKey', () => {
    it('should generate different keys for different apiKeys', () => {
      const model = mockModel();
      const key1 = (registry as any)['makeKey'](model, 'sk1');
      const key2 = (registry as any)['makeKey'](model, 'sk2');
      expect(key1).not.toBe(key2);
    });

    it('should generate same key for same parameters', () => {
      const model = mockModel();
      const key1 = (registry as any)['makeKey'](model, 'sk');
      const key2 = (registry as any)['makeKey'](model, 'sk');
      expect(key1).toBe(key2);
    });
  });
});
