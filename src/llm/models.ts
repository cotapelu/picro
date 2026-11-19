/**
 * Model definitions & lookup functions
 *
 * Re-exports MODELS from generated file and provides discovery APIs.
 * Matches pi-ai's pattern where models.ts is the central model access point.
 */

import { MODELS as GENERATED_MODELS } from './models.generated.js';
import type { Model, Usage, ModelCostTier, ModelPromptCache } from './types.js';
import { validateAllModels } from './model-schema.js';

// Run validation on module load
const validationResult = validateAllModels(GENERATED_MODELS as any);
if (!validationResult.valid) {
  console.warn('[llm/models] Model validation errors:');
  for (const err of validationResult.errors) {
    console.warn(`  ${err.field}: ${err.message}`);
  }
}
if (validationResult.warnings.length > 0) {
  console.warn('[llm/models] Model validation warnings:');
  for (const warn of validationResult.warnings) {
    console.warn(`  ${warn.field}: ${warn.message}`);
  }
}

// Prompt cache defaults for known providers
const PROMPT_CACHE_DEFAULTS: Record<string, { short: number; long: number }> = {
  anthropic: { short: 300, long: 3600 }, // 5 min / 1 hour
  openai: { short: 300, long: 3600 },
  google: { short: 300, long: 3600 },
  'google-vertex': { short: 300, long: 3600 },
};

// Apply prompt cache defaults to models that don't have them
const modelsRecord = GENERATED_MODELS as Record<string, Record<string, any>>;
for (const [provider, models] of Object.entries(modelsRecord)) {
  const defaults = PROMPT_CACHE_DEFAULTS[provider];
  if (defaults) {
    for (const model of Object.values(models)) {
      if (!model.promptCache) {
        model.promptCache = { ...defaults };
      }
      if (!model.promptCacheRetention) {
        model.promptCacheRetention = 'short';
      }
    }
  }
}

// Export the MODELS constant
export { GENERATED_MODELS as MODELS };

// Export types
export type { Model, ModelCostTier, ModelPromptCache };

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
 * Get prompt cache config for a model
 */
export function getModelPromptCacheConfig(model: Model): { short: number; long: number } | undefined {
  return model.promptCache;
}

/**
 * Get prompt cache retention default for a model
 */
export function getModelPromptCacheRetention(model: Model): "short" | "long" {
  return model.promptCacheRetention ?? "short";
}

/**
 * Calculate cost for usage with tiered pricing support
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
  let inputRate = model.cost.input;
  let outputRate = model.cost.output;
  let cacheReadRate = model.cost.cacheRead;
  let cacheWriteRate = model.cost.cacheWrite;

  // If cost tiers exist, find matching tier
  if (model.cost.tiers && model.cost.tiers.length > 0) {
    const totalInput = usage.input + usage.cacheRead + usage.cacheWrite;
    let matchedTier: { inputTokensAbove: number; input: number; output: number; cacheRead: number; cacheWrite: number } | undefined;
    for (const tier of model.cost.tiers) {
      if (totalInput >= tier.inputTokensAbove) {
        matchedTier = tier;
      } else {
        break;
      }
    }
    if (matchedTier) {
      inputRate = matchedTier.input;
      outputRate = matchedTier.output;
      cacheReadRate = matchedTier.cacheRead;
      cacheWriteRate = matchedTier.cacheWrite;
    }
  }

  const inputCost = (inputRate / 1_000_000) * usage.input;
  const outputCost = (outputRate / 1_000_000) * usage.output;
  const cacheReadCost = (cacheReadRate / 1_000_000) * usage.cacheRead;
  const cacheWriteCost = (cacheWriteRate / 1_000_000) * usage.cacheWrite;

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