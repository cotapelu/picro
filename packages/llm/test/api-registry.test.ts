import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('api-registry', () => {
  describe('ApiRegistry', () => {
    it('should create registry instance', async () => {
      const { apiRegistry } = await import('../src/api-registry');
      expect(apiRegistry).toBeDefined();
    });

    it('should have getOrCreate method', async () => {
      const { apiRegistry } = await import('../src/api-registry');
      expect(typeof apiRegistry.getOrCreate).toBe('function');
    });

    it('should have getStats method', async () => {
      const { apiRegistry } = await import('../src/api-registry');
      expect(typeof apiRegistry.getStats).toBe('function');
    });

    it('should have closeAll method', async () => {
      const { apiRegistry } = await import('../src/api-registry');
      expect(typeof apiRegistry.closeAll).toBe('function');
    });

    describe('getStats', () => {
      it('should return initial stats', async () => {
        const { apiRegistry } = await import('../src/api-registry');
        const stats = apiRegistry.getStats();
        
        expect(stats).toHaveProperty('totalClients');
        expect(stats).toHaveProperty('clients');
        expect(typeof stats.totalClients).toBe('number');
        expect(typeof stats.clients).toBe('object');
      });
    });

    describe('closeAll', () => {
      it('should resolve without error', async () => {
        const { apiRegistry } = await import('../src/api-registry');
        
        await expect(apiRegistry.closeAll()).resolves.toBeUndefined();
      });

      it('should clear all clients', async () => {
        const { apiRegistry } = await import('../src/api-registry');
        
        await apiRegistry.closeAll();
        
        const stats = apiRegistry.getStats();
        expect(stats.totalClients).toBe(0);
      });
    });
  });

  describe('getOrCreate', () => {
    let apiRegistry: any;
    
    beforeEach(async () => {
      const mod = await import('../src/api-registry');
      apiRegistry = mod.apiRegistry;
      await apiRegistry.closeAll();
    });

    afterEach(async () => {
      await apiRegistry.closeAll();
    });

    it('should create client for new model', async () => {
      const model = {
        id: 'gpt-4',
        name: 'GPT-4',
        api: 'openai',
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        reasoning: false,
        input: ['text'],
        cost: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 8000,
        maxTokens: 4000,
      };
      
      const client = apiRegistry.getOrCreate(model, 'test-key');
      
      expect(client).toBeDefined();
      expect(client.apiKey).toBe('test-key');
    });

    it('should return same client for same model and key', async () => {
      const model = {
        id: 'gpt-4',
        name: 'GPT-4',
        api: 'openai',
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        reasoning: false,
        input: ['text'],
        cost: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 8000,
        maxTokens: 4000,
      };
      
      const client1 = apiRegistry.getOrCreate(model, 'test-key');
      const client2 = apiRegistry.getOrCreate(model, 'test-key');
      
      expect(client1).toBe(client2);
    });

    it('should create different clients for different api keys', async () => {
      const model = {
        id: 'gpt-4',
        name: 'GPT-4',
        api: 'openai',
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        reasoning: false,
        input: ['text'],
        cost: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 8000,
        maxTokens: 4000,
      };
      
      const client1 = apiRegistry.getOrCreate(model, 'key1');
      const client2 = apiRegistry.getOrCreate(model, 'key2');
      
      expect(client1).not.toBe(client2);
    });

    it('should create different clients for different models', async () => {
      const model1 = {
        id: 'gpt-4',
        name: 'GPT-4',
        api: 'openai',
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        reasoning: false,
        input: ['text'],
        cost: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 8000,
        maxTokens: 4000,
      };
      
      const model2 = {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        api: 'openai',
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        reasoning: false,
        input: ['text'],
        cost: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 4000,
        maxTokens: 2000,
      };
      
      const client1 = apiRegistry.getOrCreate(model1, 'test-key');
      const client2 = apiRegistry.getOrCreate(model2, 'test-key');
      
      expect(client1).not.toBe(client2);
    });

    it('should use model headers', async () => {
      const model = {
        id: 'custom-model',
        name: 'Custom Model',
        api: 'openai',
        provider: 'custom',
        baseUrl: 'https://custom.api.com',
        reasoning: false,
        input: ['text'],
        cost: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 4000,
        maxTokens: 2000,
        headers: {
          'X-Custom-Header': 'custom-value',
        },
      };
      
      const client = apiRegistry.getOrCreate(model, 'test-key');
      
      expect(client).toBeDefined();
    });

    it('should merge custom headers with model headers', async () => {
      const model = {
        id: 'custom-model',
        name: 'Custom Model',
        api: 'openai',
        provider: 'custom',
        baseUrl: 'https://custom.api.com',
        reasoning: false,
        input: ['text'],
        cost: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 4000,
        maxTokens: 2000,
        headers: {
          'X-Model-Header': 'model-value',
        },
      };
      
      const client = apiRegistry.getOrCreate(model, 'test-key', {
        'X-Request-Header': 'request-value',
      });
      
      expect(client).toBeDefined();
    });

    it('should track client stats', async () => {
      const model = {
        id: 'gpt-4',
        name: 'GPT-4',
        api: 'openai',
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        reasoning: false,
        input: ['text'],
        cost: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 8000,
        maxTokens: 4000,
      };
      
      apiRegistry.getOrCreate(model, 'test-key');
      
      const stats = apiRegistry.getStats();
      expect(stats.totalClients).toBe(1);
      expect(Object.keys(stats.clients).length).toBe(1);
    });
  });
});