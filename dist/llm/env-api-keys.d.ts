/**
 * Environment API Key Management
 *
 * Centralized lookup for API keys from multiple sources:
 * Priority:
 * 1. Explicitly passed key (from options)
 * 2. Environment variables (provider-specific mapped)
 * 3. secrets.json file (local storage for testing)
 * 4. Legacy auth.json file (pi-ai format)
 * 5. Fallback to common env var names
 */
/**
 * Get API key for a provider
 *
 * Priority:
 * 1. Explicitly passed key (from options)
 * 2. Provider-specific environment variable
 * 3. secrets.json file (simple format: { "provider": "key" })
 * 4. Legacy auth.json file (pi-ai format: { "provider": { "type": "api_key", "key": "..." } })
 * 5. Fallback to common env var names
 */
export declare function getApiKey(provider: string, explicitKey?: string): string | undefined;
/**
 * Check if provider has API key configured
 */
export declare function hasApiKey(provider: string): boolean;
/**
 * Get all required env vars for a provider (for validation)
 */
export declare function getRequiredEnvVars(provider: string): string[];
//# sourceMappingURL=env-api-keys.d.ts.map