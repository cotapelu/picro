/**
 * Model Registry - Wrapper around llm package
 * Moved from agent/ to session/ because it's used by session services.
 *
 * Uses @picro/llm MODELS and lookup functions
 */
import { getModel, getProviders, getModels } from "../llm/index.js";
import type { Model } from "../llm/index.js";
export type ModelEntry = Model;
export interface ModelRegistry {
    find(provider: string, modelId: string): ModelEntry | undefined;
    getAvailable(): Promise<ModelEntry[]>;
    getAll(): ModelEntry[];
    hasConfiguredAuth(model: ModelEntry): boolean;
    isUsingOAuth(model: ModelEntry): boolean;
    getApiKeyAndHeaders(model: ModelEntry): Promise<{
        ok: boolean;
        apiKey?: string;
        headers?: Record<string, string>;
        error?: string;
    }>;
    registerProvider(name: string, config: unknown): void;
    getProviders(): string[];
}
/**
 * Default model registry using llm MODELS
 */
export declare class DefaultModelRegistry implements ModelRegistry {
    private customApiKeys;
    private customHeaders;
    private modelsPath?;
    constructor(modelsPath?: string);
    find(provider: string, modelId: string): ModelEntry | undefined;
    getAvailable(): Promise<ModelEntry[]>;
    getAll(): ModelEntry[];
    getProviders(): string[];
    hasConfiguredAuth(model: ModelEntry): boolean;
    isUsingOAuth(model: ModelEntry): boolean;
    getApiKeyAndHeaders(model: ModelEntry): Promise<{
        ok: boolean;
        apiKey?: string;
        headers?: Record<string, string>;
        error?: string;
    }>;
    registerProvider(name: string, config?: {
        apiKey?: string;
        apiBaseUrl?: string;
        extraHeaders?: Record<string, string>;
    }): void;
    setApiKey(provider: string, apiKey: string, headers?: Record<string, string>): void;
    setModelApiKey(provider: string, modelId: string, apiKey: string, headers?: Record<string, string>): void;
    private _getKey;
}
export declare function createModelRegistry(_modelsPath?: string): ModelRegistry;
export { getModel, getProviders, getModels };
//# sourceMappingURL=model-registry.d.ts.map