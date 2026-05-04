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
import type { Model } from './types';

interface ClientKey {
  modelId: string;
  apiKey: string;
  baseUrl: string;
}

/**
 * Global registry for OpenAI clients
 */
class ApiRegistry {
  private clients = new Map<string, OpenAI>();
  private stats: Record<string, { created: number; lastUsed: number }> = {};

  /**
   * Get or create an OpenAI client for a model
   */
  getOrCreate(model: Model, apiKey?: string, headers?: Record<string, string>): OpenAI {
    const key = this.makeKey(model, apiKey);

    if (this.clients.has(key)) {
      this.stats[key]!.lastUsed = Date.now();
      return this.clients.get(key)!;
    }

    // Create new client
    const finalKey = apiKey || this.inferApiKey(model) || '';
    const client = new OpenAI({
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
  getStats(): { totalClients: number; clients: Record<string, { created: number; lastUsed: number }> } {
    return {
      totalClients: this.clients.size,
      clients: { ...this.stats },
    };
  }

  /**
   * Close all clients (graceful shutdown)
   * Note: OpenAI client doesn't have explicit close, but we can clear references
   */
  async closeAll(): Promise<void> {
    for (const [key, client] of this.clients) {
      try {
        // OpenAI client doesn't need explicit cleanup
        // Just delete reference
      } catch (e) {
        console.warn(`Error closing client for ${key}:`, e);
      }
    }
    this.clients.clear();
    this.stats = {};
  }

  /**
   * Build cache key from model + apiKey
   */
  private makeKey(model: Model, apiKey?: string): string {
    const key = `${model.provider}:${model.id}:${model.baseUrl}:${apiKey ?? 'env'}`;
    return key;
  }

  /**
   * Infer API key from env (fallback)
   */
  private inferApiKey(model: Model): string | undefined {
    const envMap: Record<string, string> = {
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
    return envVar ? (process.env[envVar] as string | undefined) : undefined;
  }
}

// Global singleton
export const apiRegistry = new ApiRegistry();
