#!/usr/bin/env tsx

/**
 * Generate models.generated.ts from multiple sources
 *
 * Sources:
 * - models.dev API (Anthropic, Google, OpenAI, Groq, Cerebras, xAI, zAI, Mistral, HuggingFace, OpenCode, GitHub Copilot, MiniMax, Kimi)
 * - OpenRouter API (additional models)
 * - Vercel AI Gateway API
 * - Local config: src/config/nvidia-nim.json
 *
 * Output: src/models.generated.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageRoot = join(__dirname, '..');

// ==================== Types ====================

interface ModelConfig {
  id: string;
  name: string;
  reasoning: boolean;
  input: string[];
  contextWindow: number;
  maxTokens: number;
  cost: { input: number; output: number; cacheRead?: number; cacheWrite?: number };
  compat?: Record<string, any>;
  headers?: Record<string, string>;
  releaseDate?: string;
}

interface ProviderConfig {
  provider: string;
  baseUrl: string;
  api: string;
  models: ModelConfig[];
}

// ==================== Helpers ====================

function arrayUnique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

function toNumber(value: string | number | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = parseFloat(value ?? '0');
  return Number.isFinite(parsed) ? parsed : 0;
}

// ==================== NVIDIA NIM Config ====================

function loadNvidiaConfig(): ProviderConfig | null {
  try {
    const configPath = join(packageRoot, 'src/config/nvidia-nim.json');
    const content = readFileSync(configPath, 'utf-8');
    return JSON.parse(content) as ProviderConfig;
  } catch (error) {
    console.warn('NVIDIA NIM config not found or invalid:', error instanceof Error ? error.message : error);
    return null;
  }
}

// ==================== Provider Config ====================

// Base URLs for known providers
const PROVIDER_BASE_URLS: Record<string, string> = {
  'amazon-bedrock': 'https://bedrock-runtime.us-east-1.amazonaws.com',
  'anthropic': 'https://api.anthropic.com',
  'google': 'https://generativelanguage.googleapis.com/v1beta',
  'openai': 'https://api.openai.com/v1',
  'groq': 'https://api.groq.com/openai/v1',
  'cerebras': 'https://api.cerebras.ai/v1',
  'xai': 'https://api.x.ai/v1',
  'mistral': 'https://api.mistral.ai',
  'huggingface': 'https://router.huggingface.co/v1',
  'zai-coding-plan': 'https://api.z.ai/api/coding/paas/v4',
  'kilo': 'https://api.kilo.ai/v1',
  'nvidia': 'https://integrate.api.nvidia.com/v1',
  'opencode': 'https://opencode.ai/zen',
  'opencode-go': 'https://opencode.ai/zen/go',
  'github-copilot': 'https://api.individual.githubcopilot.com',
  'minimax': 'https://api.minimax.io/anthropic',
  'minimax-cn': 'https://api.minimaxi.com/anthropic',
  'kimi-for-coding': 'https://api.kimi.com/coding',
  'fireworks-ai': 'https://api.fireworks.ai/inference/v1',
};

// API types for known providers (OpenAI-compatible = openai-completions/responses)
const PROVIDER_API_TYPES: Record<string, string> = {
  'amazon-bedrock': 'bedrock-converse-stream',
  'anthropic': 'anthropic-messages',
  'google': 'google-generative-ai',
  'openai': 'openai-responses',
  'groq': 'openai-completions',
  'cerebras': 'openai-completions',
  'xai': 'openai-completions',
  'mistral': 'mistral-conversations',
  'huggingface': 'openai-completions',
  'zai-coding-plan': 'openai-completions',
  'kilo': 'openai-completions',
  'nvidia': 'openai-completions',
  'opencode': 'anthropic-messages',
  'opencode-go': 'anthropic-messages',
  'github-copilot': 'openai-completions',
  'minimax': 'anthropic-messages',
  'minimax-cn': 'anthropic-messages',
  'kimi-for-coding': 'anthropic-messages',
  'fireworks-ai': 'anthropic-messages',
};

// Providers requiring special handling (custom transforms or filters)
const SPECIAL_PROVIDERS = new Set([
  'huggingface',
  'zai-coding-plan',
  'opencode',
  'opencode-go',
  'github-copilot',
  'minimax',
  'minimax-cn',
  'kimi-for-coding',
]);

// ==================== Fetch from External APIs ====================

async function fetchModelsDev(): Promise<ModelConfig[]> {
  const models: ModelConfig[] = [];

  try {
    console.log('Fetching from models.dev API...');
    const response = await fetch('https://models.dev/api.json');
    const data = await response.json();

    // Helper to add models
    const addModels = (providerData: any, providerName: string, api: string, baseUrl: string, transform?: (m: any) => Partial<ModelConfig> | null) => {
      if (!providerData?.models) return;
      for (const [modelId, model] of Object.entries(providerData.models)) {
        const m = model as any;
        if (m.tool_call !== true) continue;

        let config: Partial<ModelConfig> | null = null;
        if (transform) {
          config = transform(m);
        } else {
          config = {
            id: modelId,
            name: m.name || modelId,
            reasoning: m.reasoning === true,
            input: m.modalities?.input?.includes('image') ? ['text', 'image'] : ['text'],
            contextWindow: m.limit?.context || 4096,
            maxTokens: m.limit?.output || 4096,
            releaseDate: m.release_date || undefined,
            cost: {
              input: m.cost?.input || 0,
              output: m.cost?.output || 0,
              cacheRead: m.cost?.cache_read || 0,
              cacheWrite: m.cost?.cache_write || 0,
            },
          };
        }

        if (config) {
          models.push({
            ...config,
            api,
            provider: providerName,
            baseUrl,
          } as ModelConfig);
        }
      }
    };

    // Auto-fetch providers that have /v1 endpoint (OpenAI-compatible from models.dev)
    for (const [providerName, providerData] of Object.entries(data)) {
      // Skip if no models
      if (!(providerData as any)?.models) continue;

      // Skip special providers - handle separately below
      if (SPECIAL_PROVIDERS.has(providerName)) continue;

      // Get API endpoint from models.dev (skip providers with NONE)
      const apiEndpoint = (providerData as any).api;
      if (!apiEndpoint) continue;

      const baseUrl = apiEndpoint;
      const api = 'openai-completions';

      addModels(providerData, providerName, api, baseUrl);
    }

    // Process HuggingFace with custom transform
    if (data.huggingface?.models) {
      addModels(data.huggingface, 'huggingface', 'openai-completions', PROVIDER_BASE_URLS['huggingface'], (m) => {
        if (m.tool_call !== true) return null;
        return {
          id: m.id || '',
          name: m.name || '',
          reasoning: m.reasoning === true,
          input: ['text'],
          contextWindow: m.limit?.context || 4096,
          maxTokens: m.limit?.output || 4096,
          cost: { input: m.cost?.input || 0, output: m.cost?.output || 0 },
        };
      });
    }

    // Process zAI with custom transform
    if (data['zai-coding-plan']?.models) {
      addModels(data['zai-coding-plan'], 'zai', 'openai-completions', PROVIDER_BASE_URLS['zai-coding-plan'], (m) => {
        if (m.tool_call !== true) return null;
        return {
          id: m.id || '',
          name: m.name || '',
          reasoning: m.reasoning === true,
          input: ['text'],
          contextWindow: m.limit?.context || 4096,
          maxTokens: m.limit?.output || 4096,
          compat: { supportsDeveloperRole: false, thinkingFormat: 'zai' },
          cost: { input: m.cost?.input || 0, output: m.cost?.output || 0 },
        };
      });
    }

    // Process OpenCode variants
    const opencodeVariants = [
      { key: 'opencode', provider: 'opencode', baseUrl: 'https://opencode.ai/zen' },
      { key: 'opencode-go', provider: 'opencode-go', baseUrl: 'https://opencode.ai/zen/go' },
    ];
    for (const variant of opencodeVariants) {
      if (!data[variant.key]?.models) continue;
      for (const [modelId, model] of Object.entries(data[variant.key].models)) {
        const m = model as any;
        if (m.tool_call !== true) continue;
        if (m.status === 'deprecated') continue;

        models.push({
          id: modelId,
          name: m.name || modelId,
          api: 'anthropic-messages',
          provider: variant.provider,
          baseUrl: variant.baseUrl,
          reasoning: m.reasoning === true,
          input: ['text', 'image'],
          contextWindow: m.limit?.context || 4096,
          maxTokens: m.limit?.output || 4096,
          cost: { input: m.cost?.input || 0, output: m.cost?.output || 0 },
        });
      }
    }

    // GitHub Copilot with mixed API types
    if (data['github-copilot']?.models) {
      for (const [modelId, model] of Object.entries(data['github-copilot'].models)) {
        const m = model as any;
        if (m.tool_call !== true) continue;
        if (m.status === 'deprecated') continue;

        const isClaude4 = /^claude-(haiku|sonnet|opus)-4([.\-]|$)/.test(modelId);
        const needsResponses = modelId.startsWith('gpt-5') || modelId.startsWith('oswe');
        const api = isClaude4 ? 'anthropic-messages' : needsResponses ? 'openai-responses' : 'openai-completions';

        models.push({
          id: modelId,
          name: m.name || modelId,
          api,
          provider: 'github-copilot',
          baseUrl: 'https://api.individual.githubcopilot.com',
          reasoning: m.reasoning === true,
          input: ['text', 'image'],
          contextWindow: m.limit?.context || 128000,
          maxTokens: m.limit?.output || 8192,
          cost: { input: m.cost?.input || 0, output: m.cost?.output || 0 },
        });
      }
    }

    // MiniMax
    const minimaxVariants = [
      { key: 'minimax', provider: 'minimax', baseUrl: 'https://api.minimax.io/anthropic' },
      { key: 'minimax-cn', provider: 'minimax-cn', baseUrl: 'https://api.minimaxi.com/anthropic' },
    ];
    for (const { key, provider, baseUrl } of minimaxVariants) {
      if (data[key]?.models) {
        for (const [modelId, model] of Object.entries(data[key].models)) {
          const m = model as any;
          if (m.tool_call !== true) continue;
          models.push({
            id: modelId,
            name: m.name || modelId,
            api: 'anthropic-messages',
            provider,
            baseUrl,
            reasoning: m.reasoning === true,
            input: ['text', 'image'],
            contextWindow: m.limit?.context || 4096,
            maxTokens: m.limit?.output || 4096,
            cost: { input: m.cost?.input || 0, output: m.cost?.output || 0 },
          });
        }
      }
    }

    // Kimi For Coding
    if (data['kimi-for-coding']?.models) {
      for (const [modelId, model] of Object.entries(data['kimi-for-coding'].models)) {
        const m = model as any;
        if (m.tool_call !== true) continue;
        models.push({
          id: modelId,
          name: m.name || modelId,
          api: 'anthropic-messages',
          provider: 'kimi-coding',
          baseUrl: 'https://api.kimi.com/coding',
          reasoning: m.reasoning === true,
          input: ['text', 'image'],
          contextWindow: m.limit?.context || 4096,
          maxTokens: m.limit?.output || 4096,
          cost: { input: m.cost?.input || 0, output: m.cost?.output || 0 },
        });
      }
    }

    console.log(`Fetched ${models.length} models from ${Object.keys(data).length} providers in models.dev`);
  } catch (error) {
    console.error('Failed to fetch models.dev:', error);
  }

  return models;
}

async function fetchOpenRouter(): Promise<ModelConfig[]> {
  const models: ModelConfig[] = [];

  try {
    console.log('Fetching from OpenRouter API...');
    const response = await fetch('https://openrouter.ai/api/v1/models');
    const data = await response.json();

    for (const model of data.data) {
      if (!model.supported_parameters?.includes('tools')) continue;

      const input: string[] = ['text'];
      if (model.architecture?.modality?.includes('image')) {
        input.push('image');
      }

      models.push({
        id: model.id,
        name: model.name,
        api: 'openai-completions',
        provider: 'openrouter',
        baseUrl: 'https://openrouter.ai/api/v1',
        reasoning: model.supported_parameters?.includes('reasoning') || false,
        input,
        contextWindow: model.context_length || 4096,
        maxTokens: model.top_provider?.max_completion_tokens || 4096,
        cost: {
          input: parseFloat(model.pricing?.prompt || '0') * 1_000_000,
          output: parseFloat(model.pricing?.completion || '0') * 1_000_000,
          cacheRead: parseFloat(model.pricing?.input_cache_read || '0') * 1_000_000,
          cacheWrite: parseFloat(model.pricing?.input_cache_write || '0') * 1_000_000,
        },
      });
    }

    console.log(`Fetched ${models.length} models from OpenRouter`);
  } catch (error) {
    console.error('Failed to fetch OpenRouter:', error);
  }

  return models;
}

async function fetchAiGateway(): Promise<ModelConfig[]> {
  const models: ModelConfig[] = [];

  try {
    console.log('Fetching from Vercel AI Gateway...');
    const response = await fetch('https://ai-gateway.vercel.sh/v1/models');
    const data = await response.json();

    for (const model of data.data || []) {
      const tags = model.tags || [];
      if (!tags.includes('tool-use')) continue;

      const input: string[] = ['text'];
      if (tags.includes('vision')) input.push('image');

      models.push({
        id: model.id,
        name: model.name || model.id,
        api: 'anthropic-messages',
        provider: 'vercel-ai-gateway',
        baseUrl: 'https://ai-gateway.vercel.sh',
        reasoning: tags.includes('reasoning'),
        input,
        contextWindow: model.context_window || 4096,
        maxTokens: model.max_tokens || 4096,
        cost: {
          input: toNumber(model.pricing?.input) * 1_000_000,
          output: toNumber(model.pricing?.output) * 1_000_000,
          cacheRead: toNumber(model.pricing?.input_cache_read) * 1_000_000,
          cacheWrite: toNumber(model.pricing?.input_cache_write) * 1_000_000,
        },
      });
    }

    console.log(`Fetched ${models.length} models from Vercel AI Gateway`);
  } catch (error) {
    console.error('Failed to fetch Vercel AI Gateway:', error);
  }

  return models;
}

// ==================== Static Models (hardcoded) ====================

function addStaticModels(allModels: ModelConfig[]): void {
  // Codex models
  const CODEX_BASE = 'https://chatgpt.com/backend-api';
  const CODEX_CONTEXT = 272000;
  const CODEX_MAX = 128000;

  const codexModels: ModelConfig[] = [
    { id: 'gpt-5.1', name: 'GPT-5.1', api: 'openai-codex-responses', provider: 'openai-codex', baseUrl: CODEX_BASE, reasoning: true, input: ['text', 'image'], contextWindow: CODEX_CONTEXT, maxTokens: CODEX_MAX, cost: { input: 1.25, output: 10, cacheRead: 0.125, cacheWrite: 0 } },
    { id: 'gpt-5.1-codex-max', name: 'GPT-5.1 Codex Max', api: 'openai-codex-responses', provider: 'openai-codex', baseUrl: CODEX_BASE, reasoning: true, input: ['text', 'image'], contextWindow: CODEX_CONTEXT, maxTokens: CODEX_MAX, cost: { input: 1.25, output: 10, cacheRead: 0.125, cacheWrite: 0 } },
    { id: 'gpt-5.1-codex-mini', name: 'GPT-5.1 Codex Mini', api: 'openai-codex-responses', provider: 'openai-codex', baseUrl: CODEX_BASE, reasoning: true, input: ['text', 'image'], contextWindow: CODEX_CONTEXT, maxTokens: CODEX_MAX, cost: { input: 0.25, output: 2, cacheRead: 0.025, cacheWrite: 0 } },
    { id: 'gpt-5.2', name: 'GPT-5.2', api: 'openai-codex-responses', provider: 'openai-codex', baseUrl: CODEX_BASE, reasoning: true, input: ['text', 'image'], contextWindow: CODEX_CONTEXT, maxTokens: CODEX_MAX, cost: { input: 1.75, output: 14, cacheRead: 0.175, cacheWrite: 0 } },
    { id: 'gpt-5.2-codex', name: 'GPT-5.2 Codex', api: 'openai-codex-responses', provider: 'openai-codex', baseUrl: CODEX_BASE, reasoning: true, input: ['text', 'image'], contextWindow: CODEX_CONTEXT, maxTokens: CODEX_MAX, cost: { input: 1.75, output: 14, cacheRead: 0.175, cacheWrite: 0 } },
    { id: 'gpt-5.3-codex', name: 'GPT-5.3 Codex', api: 'openai-codex-responses', provider: 'openai-codex', baseUrl: CODEX_BASE, reasoning: true, input: ['text', 'image'], contextWindow: CODEX_CONTEXT, maxTokens: CODEX_MAX, cost: { input: 1.75, output: 14, cacheRead: 0.175, cacheWrite: 0 } },
    { id: 'gpt-5.4', name: 'GPT-5.4', api: 'openai-codex-responses', provider: 'openai-codex', baseUrl: CODEX_BASE, reasoning: true, input: ['text', 'image'], contextWindow: CODEX_CONTEXT, maxTokens: CODEX_MAX, cost: { input: 2.5, output: 15, cacheRead: 0.25, cacheWrite: 0 } },
    { id: 'gpt-5.4-mini', name: 'GPT-5.4 Mini', api: 'openai-codex-responses', provider: 'openai-codex', baseUrl: CODEX_BASE, reasoning: true, input: ['text', 'image'], contextWindow: CODEX_CONTEXT, maxTokens: CODEX_MAX, cost: { input: 0.75, output: 4.5, cacheRead: 0.075, cacheWrite: 0 } },
    { id: 'gpt-5.3-codex-spark', name: 'GPT-5.3 Codex Spark', api: 'openai-codex-responses', provider: 'openai-codex', baseUrl: CODEX_BASE, reasoning: true, input: ['text'], contextWindow: 128000, maxTokens: CODEX_MAX, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } },
  ];

  // Grok models
  if (!allModels.some(m => m.provider === 'xai' && m.id === 'grok-code-fast-1')) {
    codexModels.push({
      id: 'grok-code-fast-1',
      name: 'Grok Code Fast 1',
      api: 'openai-completions',
      baseUrl: 'https://api.x.ai/v1',
      provider: 'xai',
      reasoning: false,
      input: ['text'],
      cost: { input: 0.2, output: 1.5, cacheRead: 0.02, cacheWrite: 0 },
      contextWindow: 32768,
      maxTokens: 8192,
    });
  }

  // OpenRouter auto alias
  if (!allModels.some(m => m.provider === 'openrouter' && m.id === 'auto')) {
    codexModels.push({
      id: 'auto',
      name: 'Auto',
      api: 'openai-completions',
      provider: 'openrouter',
      baseUrl: 'https://openrouter.ai/api/v1',
      reasoning: true,
      input: ['text', 'image'],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 2000000,
      maxTokens: 30000,
    });
  }

  // Google Cloud Code Assist
  const GOOGLE_CLOUD_CODE_URL = 'https://cloudcode-pa.googleapis.com';
  const googleCloudModels: ModelConfig[] = [
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (Cloud Code)', api: 'google-gemini-cli', provider: 'google-gemini-cli', baseUrl: GOOGLE_CLOUD_CODE_URL, reasoning: true, input: ['text', 'image'], contextWindow: 1048576, maxTokens: 65535, cost: { input: 0, output: 0 } },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Cloud Code)', api: 'google-gemini-cli', provider: 'google-gemini-cli', baseUrl: GOOGLE_CLOUD_CODE_URL, reasoning: true, input: ['text', 'image'], contextWindow: 1048576, maxTokens: 65535, cost: { input: 0, output: 0 } },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (Cloud Code)', api: 'google-gemini-cli', provider: 'google-gemini-cli', baseUrl: GOOGLE_CLOUD_CODE_URL, reasoning: false, input: ['text', 'image'], contextWindow: 1048576, maxTokens: 8192, cost: { input: 0, output: 0 } },
    { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro Preview (Cloud Code)', api: 'google-gemini-cli', provider: 'google-gemini-cli', baseUrl: GOOGLE_CLOUD_CODE_URL, reasoning: true, input: ['text', 'image'], contextWindow: 1048576, maxTokens: 65535, cost: { input: 0, output: 0 } },
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview (Cloud Code)', api: 'google-gemini-cli', provider: 'google-gemini-cli', baseUrl: GOOGLE_CLOUD_CODE_URL, reasoning: true, input: ['text', 'image'], contextWindow: 1048576, maxTokens: 65535, cost: { input: 0, output: 0 } },
    { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview (Cloud Code)', api: 'google-gemini-cli', provider: 'google-gemini-cli', baseUrl: GOOGLE_CLOUD_CODE_URL, reasoning: true, input: ['text', 'image'], contextWindow: 1048576, maxTokens: 65535, cost: { input: 0, output: 0 } },
  ];

  // Antigravity models
  const GOOGLE_ANTIGRAVITY_URL = 'https://daily-cloudcode-pa.sandbox.googleapis.com';
  const experimentalModels: ModelConfig[] = [
    { id: 'gemini-3.1-pro-high', name: 'Gemini 3.1 Pro High (Antigravity)', api: 'google-gemini-cli', provider: 'google-antigravity', baseUrl: GOOGLE_ANTIGRAVITY_URL, reasoning: true, input: ['text', 'image'], contextWindow: 1048576, maxTokens: 65535, cost: { input: 2, output: 12, cacheRead: 0.2, cacheWrite: 2.375 } },
    { id: 'gemini-3.1-pro-low', name: 'Gemini 3.1 Pro Low (Antigravity)', api: 'google-gemini-cli', provider: 'google-antigravity', baseUrl: GOOGLE_ANTIGRAVITY_URL, reasoning: true, input: ['text', 'image'], contextWindow: 1048576, maxTokens: 65535, cost: { input: 2, output: 12, cacheRead: 0.2, cacheWrite: 2.375 } },
    { id: 'gemini-3-flash', name: 'Gemini 3 Flash (Antigravity)', api: 'google-gemini-cli', provider: 'google-antigravity', baseUrl: GOOGLE_ANTIGRAVITY_URL, reasoning: true, input: ['text', 'image'], contextWindow: 1048576, maxTokens: 65535, cost: { input: 0.5, output: 3, cacheRead: 0.5, cacheWrite: 0 } },
    { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5 (Antigravity)', api: 'google-gemini-cli', provider: 'google-antigravity', baseUrl: GOOGLE_ANTIGRAVITY_URL, reasoning: false, input: ['text', 'image'], contextWindow: 200000, maxTokens: 64000, cost: { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 } },
    { id: 'claude-sonnet-4-5-thinking', name: 'Claude Sonnet 4.5 Thinking (Antigravity)', api: 'google-gemini-cli', provider: 'google-antigravity', baseUrl: GOOGLE_ANTIGRAVITY_URL, reasoning: true, input: ['text', 'image'], contextWindow: 200000, maxTokens: 64000, cost: { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 } },
    { id: 'claude-opus-4-5-thinking', name: 'Claude Opus 4.5 Thinking (Antigravity)', api: 'google-gemini-cli', provider: 'google-antigravity', baseUrl: GOOGLE_ANTIGRAVITY_URL, reasoning: true, input: ['text', 'image'], contextWindow: 200000, maxTokens: 64000, cost: { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 } },
    { id: 'claude-opus-4-6-thinking', name: 'Claude Opus 4.6 Thinking (Antigravity)', api: 'google-gemini-cli', provider: 'google-antigravity', baseUrl: GOOGLE_ANTIGRAVITY_URL, reasoning: true, input: ['text', 'image'], contextWindow: 200000, maxTokens: 128000, cost: { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 } },
    { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6 (Antigravity)', api: 'google-gemini-cli', provider: 'google-antigravity', baseUrl: GOOGLE_ANTIGRAVITY_URL, reasoning: true, input: ['text', 'image'], contextWindow: 200000, maxTokens: 64000, cost: { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 } },
    { id: 'gpt-oss-120b-medium', name: 'GPT-OSS 120B Medium (Antigravity)', api: 'google-gemini-cli', provider: 'google-antigravity', baseUrl: GOOGLE_ANTIGRAVITY_URL, reasoning: false, input: ['text'], contextWindow: 131072, maxTokens: 32768, cost: { input: 0.09, output: 0.36, cacheRead: 0, cacheWrite: 0 } },
  ];

  // Vertex AI models
  const GOOGLE_VERTEX_TEMPLATE = 'https://{location}-aiplatform.googleapis.com';
  const vertexAIModels: ModelConfig[] = [
    { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro Preview (Vertex)', api: 'google-vertex', provider: 'google-vertex', baseUrl: GOOGLE_VERTEX_TEMPLATE, reasoning: true, input: ['text', 'image'], contextWindow: 1000000, maxTokens: 64000, cost: { input: 2, output: 12, cacheRead: 0.2, cacheWrite: 0 } },
    { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview (Vertex)', api: 'google-vertex', provider: 'google-vertex', baseUrl: GOOGLE_VERTEX_TEMPLATE, reasoning: true, input: ['text', 'image'], contextWindow: 1048576, maxTokens: 65536, cost: { input: 2, output: 12, cacheRead: 0.2, cacheWrite: 0 } },
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview (Vertex)', api: 'google-vertex', provider: 'google-vertex', baseUrl: GOOGLE_VERTEX_TEMPLATE, reasoning: true, input: ['text', 'image'], contextWindow: 1048576, maxTokens: 65536, cost: { input: 0.5, output: 3, cacheRead: 0.05, cacheWrite: 0 } },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (Vertex)', api: 'google-vertex', provider: 'google-vertex', baseUrl: GOOGLE_VERTEX_TEMPLATE, reasoning: false, input: ['text', 'image'], contextWindow: 1048576, maxTokens: 8192, cost: { input: 0.15, output: 0.6, cacheRead: 0.0375, cacheWrite: 0 } },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (Vertex)', api: 'google-vertex', provider: 'google-vertex', baseUrl: GOOGLE_VERTEX_TEMPLATE, reasoning: true, input: ['text', 'image'], contextWindow: 1048576, maxTokens: 65536, cost: { input: 1.25, output: 10, cacheRead: 0.125, cacheWrite: 0 } },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Vertex)', api: 'google-vertex', provider: 'google-vertex', baseUrl: GOOGLE_VERTEX_TEMPLATE, reasoning: true, input: ['text', 'image'], contextWindow: 1048576, maxTokens: 65536, cost: { input: 0.3, output: 2.5, cacheRead: 0.03, cacheWrite: 0 } },
  ];

  allModels.push(...codexModels, ...googleCloudModels, ...experimentalModels, ...vertexAIModels);
}

// ==================== Generate Output ====================

async function generateModels() {
  console.log('Generating models.generated.ts...\n');

  // Fetch from all sources
  const modelsDevModels = await fetchModelsDev();
  const openRouterModels = await fetchOpenRouter();
  const aiGatewayModels = await fetchAiGateway();
  const nvidiaConfig = loadNvidiaConfig();

  // Combine
  let allModels = [...modelsDevModels, ...openRouterModels, ...aiGatewayModels];

  // Add NVIDIA NIM
  if (nvidiaConfig) {
    for (const m of nvidiaConfig.models) {
      allModels.push({
        ...m,
        api: nvidiaConfig.api,
        provider: nvidiaConfig.provider,
        baseUrl: nvidiaConfig.baseUrl,
        ...(nvidiaConfig.compat && { compat: nvidiaConfig.compat }),
      } as ModelConfig);
    }
  }

  // Add static models
  addStaticModels(allModels);

  // Group by provider (filter invalid)
  const providers: Record<string, Record<string, ModelConfig>> = {};
  for (const model of allModels) {
    if (!model.provider || !model.id) continue;
    if (!model.cost) model.cost = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
    if (!providers[model.provider]) {
      providers[model.provider] = {};
    }
    if (!providers[model.provider][model.id]) {
      providers[model.provider][model.id] = model;
    }
  }

  // Generate TypeScript
  let output = `// Auto-generated by scripts/generate-models.ts
// DO NOT EDIT - Run 'npm run generate-models' to update

import type { Model } from "./types.js";

export const MODELS = {
`;

  const sortedProviders = Object.keys(providers).sort();
  for (const provider of sortedProviders) {
    output += `\t${JSON.stringify(provider)}: {\n`;
    
    // Sort models by releaseDate (newest first)
    const modelsInProvider = Object.values(providers[provider]);
    modelsInProvider.sort((a, b) => {
      const dateA = a.releaseDate || '1970-01-01';
      const dateB = b.releaseDate || '1970-01-01';
      return dateB.localeCompare(dateA); // Newest first
    });
    
    for (const m of modelsInProvider) {
      output += `\t\t"${m.id}": {\n`;
      output += `\t\t\tid: "${m.id}",\n`;
      output += `\t\t\tname: "${m.name.replace(/"/g, '\\"')}",\n`;
      output += `\t\t\tapi: "${m.api}",\n`;
      output += `\t\t\tprovider: "${m.provider}",\n`;
      output += `\t\t\tbaseUrl: "${m.baseUrl}",\n`;
      if (m.compat) {
        output += `\t\t\tcompat: ${JSON.stringify(m.compat)},\n`;
      }
      if (m.headers) {
        output += `\t\t\theaders: ${JSON.stringify(m.headers)},\n`;
      }
      output += `\t\t\treasoning: ${m.reasoning},\n`;
      output += `\t\t\tinput: [${m.input.map(i => `"${i}"`).join(', ')}],\n`;
      output += `\t\t\tcost: {\n`;
      output += `\t\t\t\tinput: ${m.cost.input},\n`;
      output += `\t\t\t\toutput: ${m.cost.output},\n`;
      output += `\t\t\t\tcacheRead: ${m.cost.cacheRead || 0},\n`;
      output += `\t\t\t\tcacheWrite: ${m.cost.cacheWrite || 0},\n`;
      output += `\t\t\t},\n`;
      output += `\t\t\tcontextWindow: ${m.contextWindow},\n`;
      output += `\t\t\tmaxTokens: ${m.maxTokens},\n`;
      if (m.releaseDate) {
        output += `\t\t\treleaseDate: "${m.releaseDate}",\n`;
      }
      output += `\t\t} satisfies Model,\n`;
    }
    output += `\t},\n`;
  }

  output += `} as const;
`;

  // Write
  const outPath = join(packageRoot, 'src/models.generated.ts');
  writeFileSync(outPath, output);
  console.log(`Generated ${outPath}`);

  // Stats
  console.log(`\nTotal models: ${allModels.length}`);
  console.log(`Providers: ${Object.keys(providers).length}`);
  for (const [p, ms] of Object.entries(providers)) {
    console.log(`  ${p}: ${Object.keys(ms).length} models`);
  }
}

generateModels().catch(console.error);
