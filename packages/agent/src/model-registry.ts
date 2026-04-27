// SPDX-License-Identifier: Apache-2.0
/**
 * Model Registry - Manage models and API keys
 *
 * This is a stub implementation - full implementation coming in Phase C
 */

import type { Model, Api } from "@mariozechner/pi-ai";

/**
 * Model registry interface
 */
export interface ModelRegistry {
  /** Find a model by provider and model ID */
  find(provider: string, modelId: string): Model<Api> | undefined;

  /** Get all available models (with configured auth) */
  getAvailable(): Promise<Model<Api>[]>;

  /** Get all models (including without auth) */
  getAll(): Model<Api>[];

  /** Check if a model has configured authentication */
  hasConfiguredAuth(model: Model<any>): boolean;

  /** Check if a model uses OAuth */
  isUsingOAuth(model: Model<any>): boolean;

  /** Get API key and headers for a model */
  getApiKeyAndHeaders(
    model: Model<any>
  ): Promise<{ ok: boolean; apiKey?: string; headers?: Record<string, string>; error?: string }>;

  /** Register a provider */
  registerProvider(name: string, config: any): void;
}

/**
 * Default model registry implementation
 */
export class DefaultModelRegistry implements ModelRegistry {
  private models: Model<Api>[] = [];
  private apiKeys: Map<string, string> = new Map();
  private headers: Map<string, Record<string, string>> = new Map();

  constructor(authStorage?: any, modelsPath?: string) {
    // Stub - full implementation in Phase C
    // Load models from modelsPath if provided
  }

  find(provider: string, modelId: string): Model<Api> | undefined {
    return this.models.find(
      (m) => m.provider === provider && m.id === modelId
    );
  }

  async getAvailable(): Promise<Model<Api>[]> {
    // Return models that have API keys configured
    return this.models.filter((m) => this.hasConfiguredAuth(m));
  }

  getAll(): Model<Api>[] {
    return [...this.models];
  }

  hasConfiguredAuth(model: Model<any>): boolean {
    const key = this._getKey(model.provider, model.id);
    return this.apiKeys.has(key);
  }

  isUsingOAuth(model: Model<any>): boolean {
    // Stub - would check if provider uses OAuth
    return false;
  }

  async getApiKeyAndHeaders(
    model: Model<any>
  ): Promise<{ ok: boolean; apiKey?: string; headers?: Record<string, string>; error?: string }> {
    const key = this._getKey(model.provider, model.id);
    const apiKey = this.apiKeys.get(key);

    if (!apiKey) {
      return {
        ok: false,
        error: `No API key found for ${model.provider}`,
      };
    }

    return {
      ok: true,
      apiKey,
      headers: this.headers.get(key),
    };
  }

  registerProvider(name: string, config: any): void {
    // Stub - would register provider configuration
  }

  /**
   * Add a model to the registry
   */
  addModel(model: Model<Api>): void {
    this.models.push(model);
  }

  /**
   * Set API key for a provider
   */
  setApiKey(provider: string, apiKey: string, headers?: Record<string, string>): void {
    const key = this._getKey(provider, "*");
    this.apiKeys.set(key, apiKey);
    if (headers) {
      this.headers.set(key, headers);
    }
  }

  private _getKey(provider: string, modelId: string): string {
    return `${provider}:${modelId}`;
  }
}

/**
 * Create a model registry
 */
export function createModelRegistry(
  authStorage?: any,
  modelsPath?: string
): ModelRegistry {
  return new DefaultModelRegistry(authStorage, modelsPath);
}