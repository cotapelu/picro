"use strict";
/**
 * API Client Registry
 *
 * Manages OpenAI client instances per model + apiKey combination.
 * Enables:
 * - Connection reuse (keep-alive)
 * - Graceful shutdown
 * - Client tracking for debugging
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiRegistry = void 0;
const openai_1 = __importDefault(require("openai"));
/**
 * Global registry for OpenAI clients
 */
class ApiRegistry {
    clients = new Map();
    stats = {};
    /**
     * Get or create an OpenAI client for a model
     */
    getOrCreate(model, apiKey, headers) {
        const key = this.makeKey(model, apiKey);
        if (this.clients.has(key)) {
            this.stats[key].lastUsed = Date.now();
            return this.clients.get(key);
        }
        // Create new client
        const finalKey = apiKey || this.inferApiKey(model) || '';
        const client = new openai_1.default({
            apiKey: finalKey,
            baseURL: model.baseUrl,
            dangerouslyAllowBrowser: true,
            defaultHeaders: { ...model.headers, ...headers },
        });
        this.clients.set(key, client);
        this.stats[key] = { created: Date.now(), lastUsed: Date.now() };
        return client;
    }
    /**
     * Get stats (for debugging)
     */
    getStats() {
        return {
            totalClients: this.clients.size,
            clients: { ...this.stats },
        };
    }
    /**
     * Close all clients (graceful shutdown)
     * Note: OpenAI client doesn't have explicit close, but we can clear references
     */
    async closeAll() {
        for (const [key, client] of this.clients) {
            try {
                // OpenAI client doesn't need explicit cleanup
                // Just delete reference
            }
            catch (e) {
                console.warn(`Error closing client for ${key}:`, e);
            }
        }
        this.clients.clear();
        this.stats = {};
    }
    /**
     * Build cache key from model + apiKey
     */
    makeKey(model, apiKey) {
        const key = `${model.provider}:${model.id}:${model.baseUrl}:${apiKey ?? 'env'}`;
        return key;
    }
    /**
     * Infer API key from env (fallback)
     */
    inferApiKey(model) {
        const envMap = {
            'nvidia-nim': 'NVIDIA_NIM_API_KEY',
            'openai': 'OPENAI_API_KEY',
            'groq': 'GROQ_API_KEY',
            'xai': 'XAI_API_KEY',
            'cerebras': 'CEREBRAS_API_KEY',
            'zai': 'ZAI_API_KEY',
            'opencode': 'OPENCODE_API_KEY',
            'huggingface': 'HF_TOKEN',
        };
        const envVar = envMap[model.provider];
        return envVar ? process.env[envVar] : undefined;
    }
}
// Global singleton
exports.apiRegistry = new ApiRegistry();
//# sourceMappingURL=api-registry.js.map