/**
 * API Client Registry
 *
 * Manages OpenAI client instances per model + apiKey combination.
 * Enables:
 * - Connection reuse (keep-alive)
 * - Graceful shutdown
 * - Client tracking for debugging
 */
import OpenAI from 'openai';
import type { Model } from './types.js';
/**
 * Global registry for OpenAI clients
 */
declare class ApiRegistry {
    private clients;
    private stats;
    /**
     * Get or create an OpenAI client for a model
     */
    getOrCreate(model: Model, apiKey?: string, headers?: Record<string, string>): OpenAI;
    /**
     * Get stats (for debugging)
     */
    getStats(): {
        totalClients: number;
        clients: Record<string, {
            created: number;
            lastUsed: number;
        }>;
    };
    /**
     * Close all clients (graceful shutdown)
     * Note: OpenAI client doesn't have explicit close, but we can clear references
     */
    closeAll(): Promise<void>;
    /**
     * Build cache key from model + apiKey
     */
    private makeKey;
    /**
     * Infer API key from env (fallback)
     */
    private inferApiKey;
}
export declare const apiRegistry: ApiRegistry;
export {};
//# sourceMappingURL=api-registry.d.ts.map