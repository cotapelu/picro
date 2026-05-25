"use strict";
/**
 * Register built-in providers
 *
 * This file automatically registers all available providers when imported.
 * In a full implementation, this would initialize provider-specific logic.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerBuiltinProviders = registerBuiltinProviders;
// Currently we only have openai-compatible provider
// Future: add native providers for bedrock, vertex, etc.
function registerBuiltinProviders() {
    // No-op for now - providers are stateless
    // This function exists to match pi-ai's pattern
}
//# sourceMappingURL=register-builtins.js.map