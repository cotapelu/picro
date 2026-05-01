// SPDX-License-Identifier: Apache-2.0
/**
 * Model Registry - Wrapper around llm package
 * 
 * Uses @picro/llm MODELS and lookup functions
 */

import { getModel, getProviders, getModels } from "@picro/llm";
import type { Model } from "@picro/llm";

import { existsSync } from "node:fs";

/** Model config from JSON */
interface ModelConfig {
  provider: string;
  id: string;
  name?: string;
  apiKeyEnv?: string;
  apiBaseUrl?: string;
  extraHeaders?: Record<string, string>;
  reasoning?: boolean;
  vision?: boolean;
  audio?: boolean;
  imageInput?: boolean;
}

// ModelEntry is just an alias for llm's Model
export type ModelEntry = Model;

// ModelRegistry interface
export interface ModelRegistry {
  find(provider: string, modelId: string): ModelEntry | undefined;
  getAvailable(): Promise<ModelEntry[]>;
  getAll(): ModelEntry[];
  hasConfiguredAuth(model: ModelEntry): boolean;
  isUsingOAuth(model: ModelEntry): boolean;
  getApiKeyAndHeaders(model: ModelEntry): Promise<{ ok: boolean; apiKey?: string; headers?: Record<string, string>; error?: string }>;
  registerProvider(name: string, config: unknown): void;
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

/**
 * Default model registry using llm MODELS
 */
export class DefaultModelRegistry implements ModelRegistry {
  private customApiKeys: Map<string, string> = new Map();
  private customHeaders: Map<string, Record<string, string>> = new Map();
  private modelsPath?: string;

  constructor(modelsPath?: string) {
    this.modelsPath = modelsPath;
  }

  find(provider: string, modelId: string): ModelEntry | undefined {
    return getModel(provider, modelId);
  }

  async getAvailable(): Promise<ModelEntry[]> {
    const available: ModelEntry[] = [];
    
    for (const provider of getProviders()) {
      const models = getModels(provider);
      for (const model of models) {
        if (this.hasConfiguredAuth(model)) {
          available.push(model);
        }
      }
    }
    
    return available;
  }

  getAll(): ModelEntry[] {
    const all: ModelEntry[] = [];
    for (const provider of getProviders()) {
      all.push(...getModels(provider));
    }
    return all;
  }

  hasConfiguredAuth(model: ModelEntry): boolean {
    const key = this._getKey(model.provider, "*");
    if (this.customApiKeys.has(key)) return true;
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
    apiKey = this.customApiKeys.get(key);
    modelHeaders = this.customHeaders.get(key);

    if (!apiKey) {
      const envVar = PROVIDER_API_KEYS[model.provider];
      if (envVar) apiKey = process.env[envVar];
    }

    if (!apiKey) {
      return { ok: false, error: `No API key found for ${model.provider}` };
    }

    const modelKey = this._getKey(model.provider, model.id);
    const extraHeaders = this.customHeaders.get(modelKey);
    const headers = extraHeaders ? { ...modelHeaders, ...extraHeaders } : modelHeaders;

    return { ok: true, apiKey, headers };
  }

  registerProvider(name: string, config: {
    apiKey?: string;
    apiBaseUrl?: string;
    extraHeaders?: Record<string, string>;
  } = {}): void {
    if (config.apiKey) {
      this.setApiKey(name, config.apiKey);
    }
    const key = this._getKey(name, "*");
    if (config.extraHeaders) {
      const existing = this.customHeaders.get(key) ?? {};
      this.customHeaders.set(key, { ...existing, ...config.extraHeaders });
    }
    console.log(`Registered provider: ${name}`);
  }

  setApiKey(provider: string, apiKey: string, headers?: Record<string, string>): void {
    const key = this._getKey(provider, "*");
    this.customApiKeys.set(key, apiKey);
    if (headers) this.customHeaders.set(key, headers);
  }

  setModelApiKey(provider: string, modelId: string, apiKey: string, headers?: Record<string, string>): void {
    const key = this._getKey(provider, modelId);
    this.customApiKeys.set(key, apiKey);
    if (headers) this.customHeaders.set(key, headers);
  }

  private _getKey(provider: string, modelId: string): string {
    return `${provider}:${modelId}`;
  }
}

export function createModelRegistry(_modelsPath?: string): ModelRegistry {
  return new DefaultModelRegistry();
}

// Export llm functions for direct use
export { getModel, getProviders, getModels };