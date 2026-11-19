/**
 * Model Catalog Auto-Refresh
 * 
 * Auto-refreshing model catalog with ETag/Last-Modified caching.
 * Reference: pi-ai model-catalog.ts, models-store.ts, remote-catalog-provider.ts
 * Self-implemented, no code copying.
 */

import { MODELS as GENERATED_MODELS } from './models.generated.js';
import type { Model } from './types.js';

export interface ModelCatalogEntry {
  provider: string;
  modelId: string;
  model: Model;
  source: 'local' | 'remote';
  fetchedAt: number;
}

export interface RemoteCatalogConfig {
  provider: string;
  url: string;
  etag?: string;
  lastModified?: string;
}

export interface ModelsStoreEntry {
  models: Record<string, Model>;
  etag?: string;
  lastModified?: string;
  fetchedAt: number;
}

export interface ModelCatalogOptions {
  refreshIntervalMs?: number; // Default 24h
  concurrency?: number;
  onUpdate?: (provider: string, added: number, updated: number) => void;
  onError?: (provider: string, error: Error) => void;
}

interface CatalogState {
  localModels: Record<string, Record<string, Model>>;
  remoteCatalogs: Map<string, ModelsStoreEntry>;
  refreshTimer?: ReturnType<typeof setInterval>;
  isRefreshing: boolean;
}

const DEFAULT_REFRESH_INTERVAL = 24 * 60 * 60 * 1000; // 24h
const DEFAULT_CONCURRENCY = 3;

export class ModelCatalog {
  private state: CatalogState;
  private options: Required<ModelCatalogOptions>;

  constructor(options: ModelCatalogOptions = {}) {
    this.options = {
      refreshIntervalMs: options.refreshIntervalMs ?? DEFAULT_REFRESH_INTERVAL,
      concurrency: options.concurrency ?? DEFAULT_CONCURRENCY,
      onUpdate: options.onUpdate ?? (() => {}),
      onError: options.onError ?? ((provider, error) => {
        console.warn(`[model-catalog] ${provider}: ${error.message}`);
      }),
    };

    this.state = {
      localModels: { ...GENERATED_MODELS } as Record<string, Record<string, Model>>,
      remoteCatalogs: new Map(),
      isRefreshing: false,
    };
  }

  /**
   * Initialize catalog - load local models and start refresh timer
   */
  async initialize(): Promise<void> {
    await this.refreshAll();
    this.startRefreshTimer();
  }

  /**
   * Start periodic refresh timer
   */
  private startRefreshTimer(): void {
    if (this.state.refreshTimer) {
      clearInterval(this.state.refreshTimer);
    }
    this.state.refreshTimer = setInterval(() => {
      this.refreshAll().catch(err => {
        console.error('[model-catalog] Scheduled refresh failed:', err);
      });
    }, this.options.refreshIntervalMs);
  }

  /**
   * Stop refresh timer
   */
  stop(): void {
    if (this.state.refreshTimer) {
      clearInterval(this.state.refreshTimer);
      this.state.refreshTimer = undefined;
    }
  }

  /**
   * Refresh all remote catalogs
   */
  async refreshAll(): Promise<void> {
    if (this.state.isRefreshing) return;
    this.state.isRefreshing = true;

    try {
      const providers = Object.keys(this.state.localModels);
      await this.refreshProviders(providers);
    } finally {
      this.state.isRefreshing = false;
    }
  }

  /**
   * Refresh specific providers
   */
  async refreshProviders(providers: string[]): Promise<void> {
    await this.runWithConcurrency(providers, provider => this.refreshProvider(provider), this.options.concurrency);
  }

  /**
   * Refresh a single provider's catalog
   */
  private async refreshProvider(provider: string): Promise<void> {
    try {
      const catalogUrl = this.getCatalogUrl(provider);
      if (!catalogUrl) return;

      const existing = this.state.remoteCatalogs.get(provider);
      const headers: Record<string, string> = {};
      
      if (existing?.etag) {
        headers['If-None-Match'] = existing.etag;
      }
      if (existing?.lastModified) {
        headers['If-Modified-Since'] = existing.lastModified;
      }

      const response = await fetch(catalogUrl, { headers, signal: AbortSignal.timeout(30000) });
      
      if (response.status === 304) {
        // Not modified, update fetchedAt
        if (existing) {
          existing.fetchedAt = Date.now();
        }
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as Record<string, Model>;
      const models = this.normalizeModels(provider, data);
      
      // Merge with local models (local overrides)
      const merged = { ...this.state.localModels[provider], ...models };
      this.state.localModels[provider] = merged;

      // Update remote catalog entry
      this.state.remoteCatalogs.set(provider, {
        models,
        etag: response.headers.get('etag') ?? undefined,
        lastModified: response.headers.get('last-modified') ?? undefined,
        fetchedAt: Date.now(),
      });

      const added = Object.keys(models).filter(k => !this.state.localModels[provider]?.[k]).length;
      const updated = Object.keys(models).filter(k => this.state.localModels[provider]?.[k] && JSON.stringify(this.state.localModels[provider][k]) !== JSON.stringify(models[k])).length;
      
      this.options.onUpdate(provider, added, updated);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      this.options.onError(provider, error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get catalog URL for provider
   */
  private getCatalogUrl(provider: string): string | undefined {
    // In a real implementation, this would map providers to their catalog URLs
    // For now, return undefined to skip remote fetching
    const catalogUrls: Record<string, string> = {
      // Example URLs (would be configured):
      // 'openai': 'https://api.openai.com/v1/models',
      // 'anthropic': 'https://api.anthropic.com/v1/models',
    };
    return catalogUrls[provider];
  }

  /**
   * Normalize provider model data
   */
  private normalizeModels(provider: string, data: Record<string, any>): Record<string, Model> {
    const models: Record<string, Model> = {};
    for (const [id, model] of Object.entries(data)) {
      // Normalize to our Model interface
      models[id] = {
        id: model.id ?? id,
        name: model.name ?? id,
        api: model.api ?? 'openai',
        provider,
        baseUrl: model.baseUrl ?? '',
        reasoning: model.reasoning ?? false,
        input: model.input ?? ['text'],
        cost: model.cost ?? { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: model.contextWindow ?? 0,
        maxTokens: model.maxTokens ?? 0,
        ...model,
      } as any;
    }
    return models;
  }

  /**
   * Get all models (local + remote merged)
   */
  getModels(provider: string): Model[] {
    return Object.values(this.state.localModels[provider] ?? {});
  }

  /**
   * Get single model
   */
  getModel(provider: string, modelId: string): Model | undefined {
    return this.state.localModels[provider]?.[modelId];
  }

  /**
   * Get all providers
   */
  getProviders(): string[] {
    return Object.keys(this.state.localModels);
  }

  /**
   * Get catalog status
   */
  getStatus(): { providers: string[]; lastRefresh: Record<string, number>; isRefreshing: boolean } {
    const lastRefresh: Record<string, number> = {};
    for (const [provider, entry] of this.state.remoteCatalogs) {
      lastRefresh[provider] = entry.fetchedAt;
    }
    return {
      providers: this.getProviders(),
      lastRefresh,
      isRefreshing: this.state.isRefreshing,
    };
  }

  private async runWithConcurrency<T>(items: T[], fn: (item: T) => Promise<void>, concurrency: number): Promise<void> {
    const queue = [...items];
    let running = 0;

    const runNext = async (): Promise<void> => {
      if (queue.length === 0) return;
      const item = queue.shift()!;
      try {
        await fn(item);
      } finally {
        await this.runWithConcurrency(queue, fn, concurrency);
      }
    };

    const promises = Array.from({ length: Math.min(concurrency, items.length) }, () => runNext());
    await Promise.all(promises);
  }
}

export function createModelCatalog(options?: ModelCatalogOptions): ModelCatalog {
  return new ModelCatalog(options);
}