// SPDX-License-Identifier: Apache-2.0
/**
 * Model Registry - Wrapper around llm package
 * Moved from agent/ to session/ because it's used by session services.
 *
 * Uses @picro/llm MODELS and lookup functions
 */
import { getModel, getProviders, getModels } from "../llm/index.js";
const PROVIDER_API_KEYS = {
    anthropic: "ANTHROPIC_API_KEY",
    openai: "OPENAI_API_KEY",
    google: "GOOGLE_API_KEY",
    "google-vertex": "GOOGLE_API_KEY",
    openrouter: "OPENROUTER_API_KEY",
    xai: "XAI_API_KEY",
    cohere: "COHERE_API_KEY",
    mistral: "MISTRAL_API_KEY",
    groq: "GROQ_API_KEY",
    cerebras: "CEREBRAS_API_KEY",
    nvidia: "NVIDIA_API_KEY",
};
/**
 * Default model registry using llm MODELS
 */
export class DefaultModelRegistry {
    customApiKeys = new Map();
    customHeaders = new Map();
    modelsPath;
    constructor(modelsPath) {
        this.modelsPath = modelsPath;
    }
    find(provider, modelId) {
        return getModel(provider, modelId);
    }
    async getAvailable() {
        const available = [];
        for (const provider of getProviders()) {
            const models = getModels(provider);
            for (const model of models) {
                if (this.hasConfiguredAuth(model)) {
                    available.push(model);
                }
            }
        }
        return available;
    }
    getAll() {
        const all = [];
        for (const provider of getProviders()) {
            all.push(...getModels(provider));
        }
        return all;
    }
    getProviders() {
        return getProviders();
    }
    hasConfiguredAuth(model) {
        const key = this._getKey(model.provider, "*");
        if (this.customApiKeys.has(key))
            return true;
        const envVar = PROVIDER_API_KEYS[model.provider];
        return envVar ? !!process.env[envVar] : false;
    }
    isUsingOAuth(model) {
        return model.provider === "google" || model.provider === "github-copilot";
    }
    async getApiKeyAndHeaders(model) {
        let apiKey;
        let modelHeaders;
        const key = this._getKey(model.provider, "*");
        apiKey = this.customApiKeys.get(key);
        modelHeaders = this.customHeaders.get(key);
        if (!apiKey) {
            const envVar = PROVIDER_API_KEYS[model.provider];
            if (envVar)
                apiKey = process.env[envVar];
        }
        if (!apiKey) {
            return { ok: false, error: `No API key found for ${model.provider}` };
        }
        const modelKey = this._getKey(model.provider, model.id);
        const extraHeaders = this.customHeaders.get(modelKey);
        const headers = extraHeaders ? { ...modelHeaders, ...extraHeaders } : modelHeaders;
        return { ok: true, apiKey, headers };
    }
    registerProvider(name, config = {}) {
        if (config.apiKey) {
            this.setApiKey(name, config.apiKey);
        }
        const key = this._getKey(name, "*");
        if (config.extraHeaders) {
            const existing = this.customHeaders.get(key) ?? {};
            this.customHeaders.set(key, { ...existing, ...config.extraHeaders });
        }
        console.log(`Registered provider: ${name}`);
    }
    setApiKey(provider, apiKey, headers) {
        const key = this._getKey(provider, "*");
        this.customApiKeys.set(key, apiKey);
        if (headers)
            this.customHeaders.set(key, headers);
    }
    setModelApiKey(provider, modelId, apiKey, headers) {
        const key = this._getKey(provider, modelId);
        this.customApiKeys.set(key, apiKey);
        if (headers)
            this.customHeaders.set(key, headers);
    }
    _getKey(provider, modelId) {
        return `${provider}:${modelId}`;
    }
}
export function createModelRegistry(_modelsPath) {
    return new DefaultModelRegistry();
}
// Export llm functions for direct use
export { getModel, getProviders, getModels };
