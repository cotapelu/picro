// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect } from 'vitest';
import { calculateCost, supportsXhigh } from './models.js';
import type { Model } from './types.js';

describe('calculateCost', () => {
  it('should calculate costs correctly', () => {
    const model: Model = {
      provider: 'openai',
      id: 'gpt-4',
      name: 'GPT-4',
      baseUrl: 'https://api.openai.com/v1',
      reasoning: false,
      input: ['text'],
      cost: { input: 10, output: 30, cacheRead: 1, cacheWrite: 2 },
      contextWindow: 8192,
      maxTokens: 4096,
    };

    const usage = {
      input: 1000,
      output: 2000,
      cacheRead: 500,
      cacheWrite: 0,
      totalTokens: 3500,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } as any,
    };

    calculateCost(model, usage);

    expect(usage.cost.input).toBeCloseTo((10 / 1_000_000) * 1000, 10);
    expect(usage.cost.output).toBeCloseTo((30 / 1_000_000) * 2000, 10);
    expect(usage.cost.cacheRead).toBeCloseTo((1 / 1_000_000) * 500, 10);
    expect(usage.cost.cacheWrite).toBe(0);
    expect(usage.cost.total).toBeCloseTo(
      (10 / 1_000_000) * 1000 +
      (30 / 1_000_000) * 2000 +
      (1 / 1_000_000) * 500,
      10
    );
  });

  it('handles zero usage', () => {
    const model: Model = {
      provider: 'openai',
      id: 'gpt-4',
      name: 'GPT-4',
      baseUrl: 'https://api.openai.com/v1',
      reasoning: false,
      input: ['text'],
      cost: { input: 10, output: 30, cacheRead: 1, cacheWrite: 2 },
      contextWindow: 8192,
      maxTokens: 4096,
    };

    const usage = {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      totalTokens: 0,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } as any,
    };

    calculateCost(model, usage);
    expect(usage.cost.total).toBe(0);
  });
});

describe('supportsXhigh', () => {
  it('returns false for xai provider', () => {
    const model: Model = {
      provider: 'xai',
      id: 'grok-1',
      name: 'Grok',
      baseUrl: 'https://api.x.ai/v1',
      reasoning: true,
      input: ['text'],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 8192,
      maxTokens: 4096,
    };
    expect(supportsXhigh(model)).toBe(false);
  });

  it('returns false for zai provider', () => {
    const model: Model = {
      provider: 'zai',
      id: 'zai-model',
      name: 'ZAI',
      baseUrl: 'https://api.z.ai/v1',
      reasoning: true,
      input: ['text'],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 8192,
      maxTokens: 4096,
    };
    expect(supportsXhigh(model)).toBe(false);
  });

  it('returns true for other providers by default', () => {
    const model: Model = {
      provider: 'openai',
      id: 'gpt-4',
      name: 'GPT-4',
      baseUrl: 'https://api.openai.com/v1',
      reasoning: true,
      input: ['text'],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 8192,
      maxTokens: 4096,
    };
    expect(supportsXhigh(model)).toBe(true);
  });
});
