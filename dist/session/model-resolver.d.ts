/**
 * Model Resolver - Resolve model patterns to actual Model objects
 * Moved from agent/ to session/ because it's used by session services.
 *
 * Uses @picro/llm functions
 */
import type { ModelEntry, ModelRegistry } from "./model-registry.js";
export declare const defaultModelPerProvider: Record<string, string>;
export interface ScopedModel {
    model: ModelEntry;
    thinkingLevel?: string;
}
export interface ParsedModelResult {
    model: ModelEntry | undefined;
    thinkingLevel?: string;
    warning: string | undefined;
}
export interface ResolveCliModelResult {
    model: ModelEntry | undefined;
    thinkingLevel?: string;
    warning: string | undefined;
    error: string | undefined;
}
export interface InitialModelResult {
    model: ModelEntry | undefined;
    thinkingLevel: string;
    fallbackMessage: string | undefined;
}
export declare function parseModelPattern(pattern: string, models: ModelEntry[], options?: {
    allowInvalidThinkingLevelFallback?: boolean;
}): ParsedModelResult;
export declare function resolveModelScope(scope: string | undefined, model: ModelEntry, registry: ModelRegistry): ScopedModel | undefined;
export declare function resolveCliModel(options: {
    initialModel?: string;
    modelScope?: string;
    registry: ModelRegistry;
}, signal?: AbortSignal): Promise<ResolveCliModelResult>;
export declare function findInitialModel(options: {
    defaultModel?: string;
    configModel?: string;
    initialModel?: string;
    registry: ModelRegistry;
}, signal?: AbortSignal): InitialModelResult;
export declare function restoreModelFromSession(sessionModel: string | undefined, registry: ModelRegistry, signal?: AbortSignal): Promise<ModelEntry | undefined>;
//# sourceMappingURL=model-resolver.d.ts.map