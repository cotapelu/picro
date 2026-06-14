import { describe, it, expect } from 'vitest';
import { supportsXhigh, calculateCost } from './models.js';
import type { Model } from './types.js';

describe('models branch coverage', () => {
  const createModel = (overrides: Partial<Model> = {}): Model => ({
    provider: 'openai',
    id: 'gpt-4',
    name: 'GPT-4',
    baseUrl: 'https://api.openai.com/v1',
    reasoning: false,
    input: ['text'],
    cost: { input: 10, output: 20, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 8192,
    maxTokens: 4096,
    ...overrides,
  });

  describe('supportsXhigh', () => {
    it('returns false for xai provider', () => {
      const model = createModel({ provider: 'xai' });
      expect(supportsXhigh(model)).toBe(false);
    });

    it('returns false for zai provider', () => {
      const model = createModel({ provider: 'zai' });
      expect(supportsXhigh(model)).toBe(false);
    });

    it('returns false when baseUrl includes api.x.ai', () => {
      const model = createModel({ baseUrl: 'https://api.x.ai/v1' });
      expect(supportsXhigh(model)).toBe(false);
    });

    it('returns false when baseUrl includes api.z.ai', () => {
      const model = createModel({ baseUrl: 'https://api.z.ai/v1' });
      expect(supportsXhigh(model)).toBe(false);
    });

    it('returns true for other providers', () => {
      const model = createModel({ provider: 'anthropic' });
      expect(supportsXhigh(model)).toBe(true);
    });
  });

  describe('calculateCost', () => {
    it('calculates costs correctly with all components', () => {
      const model = createModel({
        cost: { input: 10, output: 20, cacheRead: 5, cacheWrite: 3 },
      });
      const usage = {
        input: 1000,
        output: 2000,
        cacheRead: 500,
        cacheWrite: 100,
        totalTokens: 3600,
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } as any,
      };
      calculateCost(model, usage);
      expect(usage.cost.input).toBeCloseTo(10 / 1e6 * 1000, 10);
      expect(usage.cost.output).toBeCloseTo(20 / 1e6 * 2000, 10);
      expect(usage.cost.cacheRead).toBeCloseTo(5 / 1e6 * 500, 10);
      expect(usage.cost.cacheWrite).toBeCloseTo(3 / 1e6 * 100, 10);
      expect(usage.cost.total).toBeCloseTo(
        (10 * 1000 + 20 * 2000 + 5 * 500 + 3 * 100) / 1e6,
        10
      );
    });

    it('handles zero usage', () => {
      const model = createModel();
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
});
