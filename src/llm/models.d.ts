/**
 * Model definitions & lookup functions
 *
 * Re-exports MODELS from generated file and provides discovery APIs.
 * Matches pi-ai's pattern where models.ts is the central model access point.
 */
import { MODELS as GENERATED_MODELS } from './models.generated.js';
import type { Model, Usage } from './types.js';
export { GENERATED_MODELS as MODELS };
export type { Model };
export declare function getModel(provider: string, modelId: string): Model | undefined;
export declare function getProviders(): string[];
export declare function getModels(provider: string): Model[];
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
export declare function calculateCost(model: Model, usage: Usage): void;
/**
 * Check if model supports xhigh reasoning effort
 * Some providers (Grok, ZAI) don't support xhigh
 */
export declare function supportsXhigh(model: Model): boolean;
//# sourceMappingURL=models.d.ts.map