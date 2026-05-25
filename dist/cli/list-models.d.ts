/**
 * List available models, optionally filtered by search pattern.
 * Simple implementation: plain text table, no colors.
 */
import type { ModelRegistry } from "../session/model-registry.js";
/**
 * List models from registry, optionally matching a search pattern.
 * This function prints to stdout and does not throw.
 */
export declare function listModels(modelRegistry: ModelRegistry, searchPattern?: string): Promise<void>;
//# sourceMappingURL=list-models.d.ts.map