// SPDX-License-Identifier: Apache-2.0
/**
 * Model Registry - Manage models and API keys
 * 
 * Uses ModelEntry that MATCHES llm/src/types.ts Model exactly
 */

import { existsSync, readFileSync } from "node:fs";

/** Model config from JSON */
interface ModelConfig {
  provider: string;
  id: string;
  name?: string;
  apiKeyEnv?: string;
  apiBaseUrl?: string;
  extraHeaders?: Record<string, string>;
  routing?: Record<string, unknown>;
  reasoning?: boolean;
  vision?: boolean;
  audio?: boolean;
  imageInput?: boolean;
}

/** Model entry - MUST match llm/src/types.ts Model exactly */
export interface ModelEntry {
  id: string;
  name: string;
  api: string;
  provider: string;
  baseUrl: string;
  reasoning: boolean;
  input: ('text' | 'image')[];
  cost: { input: number; output: number; cacheRead: number; cacheWrite: number };
  contextWindow: number;
  maxTokens: number;
  compat?: Record<string, any>;
  headers?: Record<string, string>;
  releaseDate?: string;
}

const PROVIDER_API_KEYS: Record<string, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  google: "GOOGLE_API_KEY",
  "google-vertex": "GOOGLE_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  xai: "XAI_API_KEY",
  cohere: "COHERE_API_KEY",
  mistral: "MISTRAL_API_KEY",
  groq: "GROQ_API_KEY",
  cerebras: "CEREBRAS_API_KEY",
};

export interface ModelRegistry {
  find(provider: string, modelId: string): ModelEntry | undefined;
  getAvailable(): Promise<ModelEntry[]>;
  getAll(): ModelEntry[];
  hasConfiguredAuth(model: ModelEntry): boolean;
  isUsingOAuth(model: ModelEntry): boolean;
  getApiKeyAndHeaders(model: ModelEntry): Promise<{ ok: boolean; apiKey?: string; headers?: Record<string, string>; error?: string }>;
  registerProvider(name: string, config: unknown): void;
}

export class DefaultModelRegistry implements ModelRegistry {
  private models: ModelEntry[] = [];
  private apiKeys: Map<string, string> = new Map();
  private headers: Map<string, Record<string, string>> = new Map();
  private modelsPath?: string;

  constructor(modelsPath?: string) {
    this.modelsPath = modelsPath;
    if (modelsPath && existsSync(modelsPath)) {
      this._loadModels(modelsPath);
    }
  }

  find(provider: string, modelId: string): ModelEntry | undefined {
    return this.models.find((m) => m.provider === provider && m.id === modelId);
  }

  async getAvailable(): Promise<ModelEntry[]> {
    return this.models.filter((m) => this.hasConfiguredAuth(m));
  }

  getAll(): ModelEntry[] {
    return [...this.models];
  }

  hasConfiguredAuth(model: ModelEntry): boolean {
    const key = this._getKey(model.provider, "*");
    if (this.apiKeys.has(key)) return true;
    const envVar = PROVIDER_API_KEYS[model.provider];
    return envVar ? !!process.env[envVar] : false;
  }

  isUsingOAuth(model: ModelEntry): boolean {
    return model.provider === "google" || model.provider === "github-copilot";
  }

  async getApiKeyAndHeaders(model: ModelEntry): Promise<{ ok: boolean; apiKey?: string; headers?: Record<string, string>; error?: string }> {
    let apiKey: string | undefined;
    let modelHeaders: Record<string, string> | undefined;

    const key = this._getKey(model.provider, "*");
    apiKey = this.apiKeys.get(key);
    modelHeaders = this.headers.get(key);

    if (!apiKey) {
      const envVar = PROVIDER_API_KEYS[model.provider];
      if (envVar) apiKey = process.env[envVar];
    }

    if (!apiKey) {
      return { ok: false, error: `No API key found for ${model.provider}` };
    }

    const modelKey = this._getKey(model.provider, model.id);
    const extraHeaders = this.headers.get(modelKey);
    const headers = extraHeaders ? { ...modelHeaders, ...extraHeaders } : modelHeaders;

    return { ok: true, apiKey, headers };
  }

  registerProvider(name: string, _config: unknown): void {
    console.log(`Registering provider: ${name}`);
  }

  addModel(model: ModelEntry): void {
    this.models.push(model);
  }

  setApiKey(provider: string, apiKey: string, headers?: Record<string, string>): void {
    const key = this._getKey(provider, "*");
    this.apiKeys.set(key, apiKey);
    if (headers) this.headers.set(key, headers);
  }

  setModelApiKey(provider: string, modelId: string, apiKey: string, headers?: Record<string, string>): void {
    const key = this._getKey(provider, modelId);
    this.apiKeys.set(key, apiKey);
    if (headers) this.headers.set(key, headers);
  }

  private _getKey(provider: string, modelId: string): string {
    return `${provider}:${modelId}`;
  }

  private _loadModels(modelsPath: string): void {
    try {
      const content = readFileSync(modelsPath, "utf-8");
      const parsed = JSON.parse(content);
      const configs: ModelConfig[] = Array.isArray(parsed) ? parsed : parsed.models || [];

      for (const config of configs) {
        const model: ModelEntry = {
          id: config.id,
          name: config.name || config.id,
          provider: config.provider,
          api: config.provider,
          baseUrl: config.apiBaseUrl || "",
          reasoning: config.reasoning ?? false,
          input: config.imageInput ? ['text', 'image'] : ['text'],
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
          contextWindow: 128000,
          maxTokens: 8192,
        };
        this.models.push(model);
      }
      console.log(`Loaded ${this.models.length} models from ${modelsPath}`);
    } catch (error) {
      console.warn(`Failed to load models from ${modelsPath}:`, error);
    }
  }
}

export function createModelRegistry(modelsPath?: string): ModelRegistry {
  return new DefaultModelRegistry(modelsPath);
}