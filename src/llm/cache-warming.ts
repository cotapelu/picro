/**
 * Cache Warming
 * 
 * Background cache warming for prompt caching to reduce latency and cost on first requests.
 * Reference: pi-ai cache-warming.ts
 * Self-implemented, no code copying.
 */

import type { Model } from './types.js';

export interface CacheWarmingStatus {
  status: "idle" | "warming" | "warmed" | "error";
  model: string;
  tokensWarmed: number;
  cost: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
}

export interface CacheWarmingOptions {
  concurrency?: number;
  onProgress?: (status: CacheWarmingStatus) => void;
  onComplete?: (status: CacheWarmingStatus) => void;
  onError?: (error: Error, modelId: string) => void;
}

interface WarmRequest {
  model: Model;
  systemPrompt: string;
  signal?: AbortSignal;
}

export class CacheWarmer {
  private statuses = new Map<string, CacheWarmingStatus>();
  private abortController?: AbortController;
  private concurrency = 2;

  constructor(options: CacheWarmingOptions = {}) {
    this.concurrency = options.concurrency ?? 2;
    this.onProgress = options.onProgress;
    this.onComplete = options.onComplete;
    this.onError = options.onError;
  }

  private onProgress?: (status: CacheWarmingStatus) => void;
  private onComplete?: (status: CacheWarmingStatus) => void;
  private onError?: (error: Error, modelId: string) => void;

  private emitProgress(status: CacheWarmingStatus) {
    this.statuses.set(status.model, status);
    this.onProgress?.(status);
  }

  private emitComplete(status: CacheWarmingStatus) {
    this.statuses.set(status.model, status);
    this.onComplete?.(status);
  }

  private emitError(error: Error, modelId: string) {
    const status: CacheWarmingStatus = {
      status: "error",
      model: modelId,
      tokensWarmed: 0,
      cost: 0,
      startedAt: Date.now(),
      completedAt: Date.now(),
      error: error.message,
    };
    this.statuses.set(modelId, status);
    this.onError?.(error, modelId);
  }

  /**
   * Warm cache for a single model
   */
  async warm(model: Model, systemPrompt: string, signal?: AbortSignal): Promise<void> {
    const modelId = `${model.provider}/${model.id}`;
    
    const status: CacheWarmingStatus = {
      status: "warming",
      model: modelId,
      tokensWarmed: 0,
      cost: 0,
      startedAt: Date.now(),
    };
    this.emitProgress(status);

    try {
      // Create a minimal request to warm the cache
      // This sends a request with the system prompt and cache control headers
      const response = await this.sendWarmRequest(model, systemPrompt, signal);
      
      if (response.usage) {
        status.tokensWarmed = response.usage.totalTokens ?? 0;
        status.cost = response.usage.cost?.total ?? 0;
      }
      
      status.status = "warmed";
      status.completedAt = Date.now();
      this.emitProgress(status);
      this.emitComplete(status);
    } catch (error) {
      const isAbort = error instanceof DOMException && error.name === "AbortError"
        || error instanceof Error && error.name === "AbortError";
      if (isAbort) {
        status.status = "idle";
        status.completedAt = Date.now();
        this.emitProgress(status);
        return;
      }
      this.emitError(error instanceof Error ? error : new Error(String(error)), modelId);
      throw error;
    }
  }

  /**
   * Send a warm request to the provider
   * This is a minimal request that triggers prompt caching
   */
  private async sendWarmRequest(model: Model, systemPrompt: string, signal?: AbortSignal): Promise<{ usage?: { totalTokens?: number; cost?: { total?: number } } }> {
    // This is a placeholder - in a real implementation, this would call the provider API
    // with a minimal request that includes cache_control headers
    // For now, we simulate a successful response
    
    // Check for abort before delay
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    
    // Simulate network delay with abort check
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(resolve, 100);
      if (signal) {
        signal.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new DOMException("Aborted", "AbortError"));
        }, { once: true });
      }
    });
    
    // Check for abort
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    
    return {
      usage: {
        totalTokens: 100, // Estimated tokens for warming
        cost: { total: 0.001 } // Estimated cost
      }
    };
  }

  /**
   * Warm multiple models with concurrency control
   */
  async warmAll(models: Model[], systemPrompt: string, options: { concurrency?: number; signal?: AbortSignal } = {}): Promise<void> {
    const concurrency = options.concurrency ?? this.concurrency;
    const signal = options.signal;
    
    const queue = [...models];
    const running = new Set<Promise<void>>();
    
    const runNext = async (): Promise<void> => {
      if (queue.length === 0) return;
      if (signal?.aborted) return;
      
      const model = queue.shift()!;
      const promise = this.warm(model, systemPrompt, signal).then(() => {
        running.delete(promise);
        return runNext();
      }).catch(() => {
        running.delete(promise);
        return runNext();
      });
      
      running.add(promise);
      
      if (running.size >= concurrency) {
        await Promise.race(running);
      }
      
      return runNext();
    };
    
    await Promise.all([
      ...Array.from({ length: Math.min(concurrency, queue.length) }, () => runNext()),
      Promise.all(running)
    ]);
  }

  /**
   * Get warming status for a model
   */
  getStatus(modelId: string): CacheWarmingStatus | undefined {
    return this.statuses.get(modelId);
  }

  /**
   * Get all warming statuses
   */
  getAllStatuses(): CacheWarmingStatus[] {
    return Array.from(this.statuses.values());
  }

  /**
   * Cancel warming for a specific model or all models
   */
  cancel(modelId?: string): void {
    if (modelId) {
      const status = this.statuses.get(modelId);
      if (status && status.status === "warming") {
        status.status = "idle";
        status.completedAt = Date.now();
      }
    } else {
      for (const status of this.statuses.values()) {
        if (status.status === "warming") {
          status.status = "idle";
          status.completedAt = Date.now();
        }
      }
    }
  }

  /**
   * Warm on idle - call this when the agent becomes idle
   */
  async warmOnIdle(models: Model[], systemPrompt: string, idleTimeoutMs: number = 30000): Promise<void> {
    // This would be called from the agent loop when idle
    // For now, we just warm all models
    await this.warmAll(models, systemPrompt, { concurrency: this.concurrency });
  }
}

export function createCacheWarmer(options?: CacheWarmingOptions): CacheWarmer {
  return new CacheWarmer(options);
}