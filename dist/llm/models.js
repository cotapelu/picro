"use strict";
/**
 * Model definitions & lookup functions
 *
 * Re-exports MODELS from generated file and provides discovery APIs.
 * Matches pi-ai's pattern where models.ts is the central model access point.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MODELS = void 0;
exports.getModel = getModel;
exports.getProviders = getProviders;
exports.getModels = getModels;
exports.calculateCost = calculateCost;
exports.supportsXhigh = supportsXhigh;
const models_generated_js_1 = require("./models.generated.js");
Object.defineProperty(exports, "MODELS", { enumerable: true, get: function () { return models_generated_js_1.MODELS; } });
// Lookup functions
function getModel(provider, modelId) {
    const all = models_generated_js_1.MODELS;
    const providerModels = all[provider];
    return providerModels?.[modelId];
}
function getProviders() {
    return Object.keys(models_generated_js_1.MODELS);
}
function getModels(provider) {
    const all = models_generated_js_1.MODELS;
    const providerModels = all[provider];
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
function calculateCost(model, usage) {
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
function supportsXhigh(model) {
    const provider = model.provider.toLowerCase();
    const baseUrl = model.baseUrl.toLowerCase();
    // Known providers without xhigh support
    if (provider === 'xai' || baseUrl.includes('api.x.ai'))
        return false;
    if (provider === 'zai' || baseUrl.includes('api.z.ai'))
        return false;
    // By default, assume support
    return true;
}
//# sourceMappingURL=models.js.map