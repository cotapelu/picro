/**
 * Register built-in providers
 *
 * This file automatically registers all available providers when imported.
 * In a full implementation, this would initialize provider-specific logic.
 */

// Currently we only have openai-compatible provider
// Future: add native providers for bedrock, vertex, etc.

export function registerBuiltinProviders() {
  // No-op for now - providers are stateless
  // This function exists to match pi-ai's pattern
}
