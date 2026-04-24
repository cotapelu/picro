import { describe, it, expect } from 'vitest';
import { MODELS, getModel, getProviders, getModels, calculateCost, supportsXhigh } from '../src/models';
import type { Model, Usage } from '../src/types';

describe('MODELS', () => {
  it('should export MODELS object', () => {
    expect(MODELS).toBeDefined();
    expect(typeof MODELS).toBe('object');
  });

  it('should have at least one provider', () => {
    const providers = Object.keys(MODELS);
    expect(providers.length).toBeGreaterThan(0);
  });

  it('should have valid provider structure', () => {
    const providers = Object.keys(MODELS);
    expect(providers.length).toBeGreaterThan(0);
    
    for (const provider of providers) {
      expect(MODELS[provider]).toBeDefined();
      expect(typeof MODELS[provider]).toBe('object');
    }
  });
});

describe('getProviders', () => {
  it('should return array of provider names', () => {
    const providers = getProviders();
    expect(Array.isArray(providers)).toBe(true);
  });

  it('should return non-empty array', () => {
    const providers = getProviders();
    expect(providers.length).toBeGreaterThan(0);
  });

  it('should include common providers', () => {
    const providers = getProviders();
    const hasKnownProvider = providers.some(p => 
      ['nvidia-nim', 'openai', 'anthropic', 'groq', 'openrouter', 'google'].includes(p)
    );
    expect(hasKnownProvider).toBe(true);
  });
});

describe('getModels', () => {
  it('should return array of models for valid provider', () => {
    const providers = getProviders();
    if (providers.length > 0) {
      const models = getModels(providers[0]);
      expect(Array.isArray(models)).toBe(true);
    }
  });

  it('should return empty array for unknown provider', () => {
    const models = getModels('unknown-provider-xyz');
    expect(models).toEqual([]);
  });

  it('should return models with required fields', () => {
    const providers = getProviders();
    if (providers.length > 0) {
      const models = getModels(providers[0]);
      if (models.length > 0) {
        const model = models[0];
        expect(model.id).toBeDefined();
        expect(model.name).toBeDefined();
        expect(model.api).toBeDefined();
        expect(model.provider).toBeDefined();
        expect(model.baseUrl).toBeDefined();
        expect(typeof model.reasoning).toBe('boolean');
        expect(Array.isArray(model.input)).toBe(true);
        expect(model.contextWindow).toBeDefined();
        expect(model.maxTokens).toBeDefined();
      }
    }
  });
});

describe('getModel', () => {
  it('should return model for valid provider and modelId', () => {
    const providers = getProviders();
    if (providers.length > 0) {
      const models = getModels(providers[0]);
      if (models.length > 0) {
        const model = getModel(providers[0], models[0].id);
        expect(model).toBeDefined();
        expect(model?.id).toBe(models[0].id);
      }
    }
  });

  it('should return undefined for unknown provider', () => {
    const model = getModel('unknown-provider', 'some-model');
    expect(model).toBeUndefined();
  });

  it('should return undefined for unknown model', () => {
    const providers = getProviders();
    if (providers.length > 0) {
      const model = getModel(providers[0], 'unknown-model-id-123');
      expect(model).toBeUndefined();
    }
  });

  it('should return model with correct structure', () => {
    const providers = getProviders();
    if (providers.length > 0) {
      const models = getModels(providers[0]);
      if (models.length > 0) {
        const model = getModel(providers[0], models[0].id);
        expect(model).toMatchObject({
          id: expect.any(String),
          name: expect.any(String),
          api: expect.any(String),
          provider: expect.any(String),
          baseUrl: expect.any(String),
          reasoning: expect.any(Boolean),
          input: expect.any(Array),
          cost: expect.objectContaining({
            input: expect.any(Number),
            output: expect.any(Number),
          }),
          contextWindow: expect.any(Number),
          maxTokens: expect.any(Number),
        });
      }
    }
  });
});

describe('calculateCost', () => {
  const mockModel: Model = {
    id: 'test-model',
    name: 'Test Model',
    api: 'openai',
    provider: 'test',
    baseUrl: 'https://api.test.com',
    reasoning: false,
    input: ['text'],
    cost: {
      input: 1.0,
      output: 2.0,
      cacheRead: 0.1,
      cacheWrite: 0.1,
    },
    contextWindow: 128000,
    maxTokens: 4096,
  };

  it('should calculate cost correctly', () => {
    const usage: Usage = {
      input: 1000000,
      output: 500000,
      cacheRead: 0,
      cacheWrite: 0,
      totalTokens: 1500000,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
    };

    calculateCost(mockModel, usage);

    expect(usage.cost.input).toBe(1.0);
    expect(usage.cost.output).toBe(1.0);
    expect(usage.cost.total).toBe(2.0);
  });

  it('should handle cache costs', () => {
    const usage: Usage = {
      input: 500000,
      output: 100000,
      cacheRead: 300000,
      cacheWrite: 100000,
      totalTokens: 1000000,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
    };

    calculateCost(mockModel, usage);

    expect(usage.cost.total).toBeGreaterThan(0);
  });

  it('should handle zero usage', () => {
    const usage: Usage = {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      totalTokens: 0,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
    };

    calculateCost(mockModel, usage);

    expect(usage.cost.total).toBe(0);
  });

  it('should handle small token counts', () => {
    const usage: Usage = {
      input: 100,
      output: 50,
      cacheRead: 0,
      cacheWrite: 0,
      totalTokens: 150,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
    };

    calculateCost(mockModel, usage);

    expect(usage.cost.input).toBeCloseTo(0.0001, 4);
    expect(usage.cost.output).toBeCloseTo(0.0001, 4);
    expect(usage.cost.total).toBeCloseTo(0.0002, 4);
  });
});

describe('supportsXhigh', () => {
  it('should return false for xAI provider', () => {
    const model: Model = {
      id: 'grok-3',
      name: 'Grok 3',
      api: 'openai',
      provider: 'xai',
      baseUrl: 'https://api.x.ai',
      reasoning: true,
      input: ['text'],
      cost: { input: 1, output: 2, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 128000,
      maxTokens: 4096,
    };

    expect(supportsXhigh(model)).toBe(false);
  });

  it('should return false for xAI baseUrl', () => {
    const model: Model = {
      id: 'grok-3',
      name: 'Grok 3',
      api: 'openai',
      provider: 'some-provider',
      baseUrl: 'https://api.x.ai/v1',
      reasoning: true,
      input: ['text'],
      cost: { input: 1, output: 2, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 128000,
      maxTokens: 4096,
    };

    expect(supportsXhigh(model)).toBe(false);
  });

  it('should return false for ZAI provider', () => {
    const model: Model = {
      id: 'zai-model',
      name: 'ZAI Model',
      api: 'openai',
      provider: 'zai',
      baseUrl: 'https://api.z.ai',
      reasoning: true,
      input: ['text'],
      cost: { input: 1, output: 2, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 128000,
      maxTokens: 4096,
    };

    expect(supportsXhigh(model)).toBe(false);
  });

  it('should return false for ZAI baseUrl', () => {
    const model: Model = {
      id: 'zai-model',
      name: 'ZAI Model',
      api: 'openai',
      provider: 'some-provider',
      baseUrl: 'https://api.z.ai/v1',
      reasoning: true,
      input: ['text'],
      cost: { input: 1, output: 2, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 128000,
      maxTokens: 4096,
    };

    expect(supportsXhigh(model)).toBe(false);
  });

  it('should return true for standard providers', () => {
    const model: Model = {
      id: 'gpt-4',
      name: 'GPT-4',
      api: 'openai',
      provider: 'openai',
      baseUrl: 'https://api.openai.com',
      reasoning: false,
      input: ['text'],
      cost: { input: 1, output: 2, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 128000,
      maxTokens: 4096,
    };

    expect(supportsXhigh(model)).toBe(true);
  });

  it('should return true for OpenRouter', () => {
    const model: Model = {
      id: 'anthropic/claude-3-opus',
      name: 'Claude 3 Opus',
      api: 'openai',
      provider: 'openrouter',
      baseUrl: 'https://openrouter.ai/api/v1',
      reasoning: false,
      input: ['text'],
      cost: { input: 1, output: 2, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 200000,
      maxTokens: 4096,
    };

    expect(supportsXhigh(model)).toBe(true);
  });
});

describe('MODELS consistency', () => {
  it('getProviders should return same keys as MODELS', () => {
    const providers = getProviders();
    const modelKeys = Object.keys(MODELS);
    expect(providers.sort()).toEqual(modelKeys.sort());
  });

  it('getModels should return same models as MODELS direct access', () => {
    const providers = getProviders();
    for (const provider of providers) {
      const viaGetModels = getModels(provider);
      const viaDirect = Object.values(MODELS[provider] || {});
      
      expect(viaGetModels.length).toBe(viaDirect.length);
      
      if (viaGetModels.length > 0) {
        const ids = viaGetModels.map(m => m.id).sort();
        const directIds = viaDirect.map(m => m.id).sort();
        expect(ids).toEqual(directIds);
      }
    }
  });

  it('getModel should return same as MODELS direct access', () => {
    const providers = getProviders();
    for (const provider of providers) {
      const models = getModels(provider);
      for (const model of models) {
        const viaGetModel = getModel(provider, model.id);
        const viaDirect = MODELS[provider]?.[model.id];
        
        expect(viaGetModel).toEqual(viaDirect);
      }
    }
  });
});