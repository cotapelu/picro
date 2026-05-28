import { describe, it, expect } from 'vitest';
import {
  getModel,
  getProviders,
  getModels,
  calculateCost,
  supportsXhigh,
} from './models.js';
import type { Model } from './types.js';

describe('Model Lookups', () => {
  it('getModel returns correct model for known provider and id', () => {
    const model = getModel('302ai', 'claude-opus-4-7');
    expect(model).toBeDefined();
    expect(model?.id).toBe('claude-opus-4-7');
    expect(model?.provider).toBe('302ai');
  });

  it('getModel returns undefined for unknown provider', () => {
    expect(getModel('unknown', 'model')).toBeUndefined();
  });

  it('getModel returns undefined for unknown model id', () => {
    expect(getModel('302ai', 'nonexistent')).toBeUndefined();
  });

  it('getProviders returns list of provider names', () => {
    const providers = getProviders();
    expect(Array.isArray(providers)).toBe(true);
    expect(providers.length).toBeGreaterThan(0);
    // Spot check
    expect(providers).toContain('302ai');
  });

  it('getModels returns array of models for known provider', () => {
    const models = getModels('302ai');
    expect(Array.isArray(models)).toBe(true);
    expect(models.length).toBeGreaterThan(0);
    expect(models[0]).toHaveProperty('id');
    expect(models[0]).toHaveProperty('provider');
  });

  it('getModels returns empty array for unknown provider', () => {
    const models = getModels('nonexistent');
    expect(Array.isArray(models)).toBe(true);
    expect(models.length).toBe(0);
  });
});

describe('calculateCost', () => {
  it('calculates input and output costs correctly', () => {
    const model: Model = {
      id: 'test',
      name: 'Test',
      api: 'openai-completions',
      provider: 'test',
      baseUrl: 'https://test.com',
      reasoning: false,
      input: ['text'],
      cost: {
        input: 10, // $10 per million tokens
        output: 20,
        cacheRead: 0,
        cacheWrite: 0,
      },
      contextWindow: 1000,
      maxTokens: 500,
    };
    const usage = {
      input: 1_000_000,
      output: 500_000,
      cacheRead: 0,
      cacheWrite: 0,
      totalTokens: 1_500_000,
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0,
        total: 0,
      },
    };
    calculateCost(model, usage);
    expect(usage.cost.input).toBe(10);
    expect(usage.cost.output).toBe(10); // 20/1M * 500k = 10
    expect(usage.cost.total).toBe(20);
  });

  it('includes cache read/write costs', () => {
    const model: Model = {
      id: 'test',
      name: 'Test',
      api: 'openai-completions',
      provider: 'test',
      baseUrl: 'https://test.com',
      reasoning: false,
      input: ['text'],
      cost: {
        input: 0,
        output: 0,
        cacheRead: 1,
        cacheWrite: 2,
      },
      contextWindow: 1000,
      maxTokens: 500,
    };
    const usage = {
      input: 0,
      output: 0,
      cacheRead: 1_000_000,
      cacheWrite: 500_000,
      totalTokens: 1_500_000,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
    };
    calculateCost(model, usage);
    expect(usage.cost.cacheRead).toBe(1);
    expect(usage.cost.cacheWrite).toBe(1); // 2/1M * 500k = 1
    expect(usage.cost.total).toBe(2);
  });

  it('handles zero usage gracefully', () => {
    const model: Model = {
      id: 'test',
      name: 'Test',
      api: 'openai-completions',
      provider: 'test',
      baseUrl: 'https://test.com',
      reasoning: false,
      input: ['text'],
      cost: { input: 10, output: 20, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 1000,
      maxTokens: 500,
    };
    const usage = {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      totalTokens: 0,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
    };
    calculateCost(model, usage);
    expect(usage.cost.total).toBe(0);
  });
});

describe('supportsXhigh', () => {
  it('returns false for xai provider', () => {
    const model: Model = {
      id: 'grok-1',
      name: 'Grok',
      api: 'openai-completions',
      provider: 'xai',
      baseUrl: 'https://api.x.ai',
      reasoning: true,
      input: ['text'],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 1000,
      maxTokens: 500,
    };
    expect(supportsXhigh(model)).toBe(false);
  });

  it('returns false for zai provider', () => {
    const model: Model = {
      id: 'zai-model',
      name: 'ZAI',
      api: 'openai-completions',
      provider: 'zai',
      baseUrl: 'https://api.z.ai',
      reasoning: true,
      input: ['text'],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 1000,
      maxTokens: 500,
    };
    expect(supportsXhigh(model)).toBe(false);
  });

  it('returns true for other providers', () => {
    const model: Model = {
      id: 'gpt-4',
      name: 'GPT-4',
      api: 'openai-completions',
      provider: 'openai',
      baseUrl: 'https://api.openai.com',
      reasoning: false,
      input: ['text'],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 1000,
      maxTokens: 500,
    };
    expect(supportsXhigh(model)).toBe(true);
  });
});
