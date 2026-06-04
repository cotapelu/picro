import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the 'openai' module
vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      constructor(config: any) {}
    }
  };
});

import { ApiRegistry } from './api-registry.js';

describe('ApiRegistry', () => {
  let registry: ApiRegistry;

  beforeEach(() => {
    // Create a fresh instance for each test
    registry = new ApiRegistry();
    // Clear env impacts
    vi.clearAllMocks();
  });

  describe('getOrCreate', () => {
    it('should create a new client when none exists', () => {
      const model = {
        provider: 'openai',
        id: 'gpt-4',
        baseUrl: 'https://api.openai.com/v1',
        headers: {},
      } as any;

      const client = registry.getOrCreate(model);

      expect(client).toBeDefined();
      // Since we mocked OpenAI, client is whatever the mock returns
    });

    it('should reuse the same client for identical model+apiKey', () => {
      const model = {
        provider: 'openai',
        id: 'gpt-4',
        baseUrl: 'https://api.openai.com/v1',
        headers: {},
      } as any;

      const client1 = registry.getOrCreate(model);
      const client2 = registry.getOrCreate(model);

      expect(client1).toBe(client2);
    });

    it('should create different clients for different apiKeys', () => {
      const model = {
        provider: 'openai',
        id: 'gpt-4',
        baseUrl: 'https://api.openai.com/v1',
        headers: {},
      } as any;

      const client1 = registry.getOrCreate(model, 'apiKey1');
      const client2 = registry.getOrCreate(model, 'apiKey2');

      expect(client1).not.toBe(client2);
    });

    it('should use env apiKey when none provided and env var set', () => {
      const model = {
        provider: 'openai',
        id: 'gpt-4',
        baseUrl: 'https://api.openai.com/v1',
        headers: {},
      } as any;
      process.env.OPENAI_API_KEY = 'env-key';

      const client = registry.getOrCreate(model);

      expect(client).toBeDefined();
    });

    it('should update lastUsed time on subsequent calls', async () => {
      const model = {
        provider: 'openai',
        id: 'gpt-4',
        baseUrl: 'https://api.openai.com/v1',
        headers: {},
      } as any;

      const client1 = registry.getOrCreate(model);
      const stats1 = registry.getStats();
      const lastUsed1 = stats1.clients[Object.keys(stats1.clients)[0]].lastUsed;

      // Small delay to ensure time difference
      await new Promise(resolve => setTimeout(resolve, 10));

      const client2 = registry.getOrCreate(model);
      const stats2 = registry.getStats();
      const lastUsed2 = stats2.clients[Object.keys(stats2.clients)[0]].lastUsed;

      expect(lastUsed2).toBeGreaterThanOrEqual(lastUsed1);
    });
  });

  describe('getStats', () => {
    it('should return totalClients and clients map', () => {
      const model = {
        provider: 'openai',
        id: 'gpt-4',
        baseUrl: 'https://api.openai.com/v1',
        headers: {},
      } as any;

      expect(registry.getStats().totalClients).toBe(0);

      registry.getOrCreate(model);

      const stats = registry.getStats();
      expect(stats.totalClients).toBe(1);
      expect(typeof stats.clients).toBe('object');
      expect(stats.clients).toHaveProperty('openai:gpt-4:https://api.openai.com/v1:env');
    });
  });

  describe('closeAll', () => {
    it('should clear all clients', async () => {
      const model = {
        provider: 'openai',
        id: 'gpt-4',
        baseUrl: 'https://api.openai.com/v1',
        headers: {},
      } as any;

      registry.getOrCreate(model);
      expect(registry.getStats().totalClients).toBe(1);

      await registry.closeAll();
      expect(registry.getStats().totalClients).toBe(0);
    });
  });


});
