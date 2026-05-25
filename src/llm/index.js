// SPDX-License-Identifier: Apache-2.0
/**
 * @picro/llm - OpenAI-Compatible LLM Extension
 *
 * Export all types and functions needed by agent package
 */
// Models and lookup functions
export { MODELS, getModel, getProviders, getModels } from './models.js';
// Provider APIs  
export { stream, complete } from './providers/openai-compatible.js';
// Stream optimization
export { StreamBuffer, getProviderBufferConfig, createStreamBuffer, providerBufferConfigs } from './utils/stream-buffer.js';
// Simple model lookup - returns Model from MODELS
export function getModelById(modelId) {
    return getModel("any", modelId);
}
// Default export
import { MODELS, getModel, getProviders, getModels } from './models.js';
import { stream, complete } from './providers/openai-compatible.js';
export default {
    MODELS,
    getModel,
    getProviders,
    getModels,
    stream,
    complete,
    getModelById,
};
//# sourceMappingURL=index.js.map