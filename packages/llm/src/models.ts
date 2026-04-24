/**
 * Model definitions & lookup functions
 *
 * Re-exports MODELS from generated file and provides discovery APIs.
 * Matches pi-ai's pattern where models.ts is the central model access point.
 */

import { MODELS as GENERATED_MODELS } from './models.generated.js';
import type { Model, Usage } from './types.js';

// Export the MODELS constant
export { GENERATED_MODELS as MODELS };

// Export types
export type { Model };

// Lookup functions
export function getModel(provider: string, modelId: string): Model | undefined {
  const all = GENERATED_MODELS as any;
  const providerModels = all[provider] as Record<string, Model> | undefined;
  return providerModels?.[modelId];
}

export function getProviders(): string[] {
  return Object.keys(GENERATED_MODELS);
}

export function getModels(provider: string): Model[] {
  const all = GENERATED_MODELS as any;
  const providerModels = all[provider] as Record<string, Model> | undefined;
  return providerModels ? Object.values(providerModels) : [];
}

/**
 * Calculate cost for usage
 *
 * @param model - Model configuration with cost per million tokens
 * @param usage - Token usage breakdown
 * @returns Updated usage with cost fields filled in
 *
 * @example
 * ```typescript
 * const model = getModel('openai', 'gpt-4');
 * const usage = { input: 150, output: 500, cacheRead: 0, cacheWrite: 0, totalTokens: 650, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } };
 * calculateCost(model, usage);
 * console.log(usage.cost.total); // e.g., 0.0125
 * ```
 */
export function calculateCost(model: Model, usage: Usage): void {
  const inputCost = (model.cost.input / 1_000_000) * usage.input;
  const outputCost = (model.cost.output / 1_000_000) * usage.output;
  const cacheReadCost = (model.cost.cacheRead / 1_000_000) * usage.cacheRead;
  const cacheWriteCost = (model.cost.cacheWrite / 1_000_000) * usage.cacheWrite;

  usage.cost = {
    input: inputCost,
    output: outputCost,
    cacheRead: cacheReadCost,
    cacheWrite: cacheWriteCost,
    total: inputCost + outputCost + cacheReadCost + cacheWriteCost,
  };
}

/**
 * Check if model supports xhigh reasoning effort
 * Some providers (Grok, ZAI) don't support xhigh
 */
export function supportsXhigh(model: Model): boolean {
  const provider = model.provider.toLowerCase();
  const baseUrl = model.baseUrl.toLowerCase();

  // Known providers without xhigh support
  if (provider === 'xai' || baseUrl.includes('api.x.ai')) return false;
  if (provider === 'zai' || baseUrl.includes('api.z.ai')) return false;

  // By default, assume support
  return true;
}
