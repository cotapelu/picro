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

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ENV_VAR_MAP: Record<string, string> = {
  // NVIDIA
  'nvidia-nim': 'NVIDIA_NIM_API_KEY',
  'nvidia': 'NVIDIA_NIM_API_KEY',
  // Kilo
  'kilo': 'KILO_API_KEY',
  // OpenRouter
  'openrouter': 'OPENROUTER_API_KEY',
  // Additional online providers (only those not already declared above)
  'deepseek': 'DEEPSEEK_API_KEY',
  'cohere': 'COHERE_API_KEY',
  'perplexity-agent': 'PERPLEXITY_API_KEY',
  'fireworks-ai': 'FIREWORKS_API_KEY',
  'togetherai': 'TOGETHER_API_KEY',
  'siliconflow': 'SILICONFLOW_API_KEY',
  'zenmux': 'ZENMUX_API_KEY',
  // OpenAI
  'openai': 'OPENAI_API_KEY',
  'openai-codex': 'OPENAI_API_KEY',
  // Anthropic
  'anthropic': 'ANTHROPIC_API_KEY',
  'opencode': 'OPENCODE_API_KEY',
  'opencode-go': 'OPENCODE_API_KEY',
  'minimax': 'MINIMAX_API_KEY',
  'minimax-cn': 'MINIMAX_API_KEY',
  'kimi-coding': 'KIMI_API_KEY',
  // Google
  'google': 'GOOGLE_API_KEY',
  'google-gemini-cli': 'GOOGLE_API_KEY',
  'google-antigravity': 'GOOGLE_API_KEY',
  'google-vertex': 'GOOGLE_VERTEX_CREDENTIALS',
  // Groq
  'groq': 'GROQ_API_KEY',
  // Cerebras
  'cerebras': 'CEREBRAS_API_KEY',
  // xAI
  'xai': 'XAI_API_KEY',
  // Mistral
  'mistral': 'MISTRAL_API_KEY',
  // HuggingFace
  'huggingface': 'HF_TOKEN',
  // ZAI
  'zai': 'ZAI_API_KEY',
  // GitHub Copilot
  'github-copilot': 'GITHUB_COPILOT_API_KEY',
  // Amazon Bedrock
  'amazon-bedrock': 'AWS_ACCESS_KEY_ID', // Also needs AWS_SECRET_ACCESS_KEY, AWS_REGION
  // Vercel AI Gateway
  'vercel-ai-gateway': 'VERCEL_AI_GATEWAY_API_KEY',
};

// Cache for file-based secrets
let secretsCache: Record<string, string> | null = null;
let authCache: Record<string, { type: string; key: string }> | null = null;

function loadSecrets(): Record<string, string> | null {
  if (secretsCache !== null) return secretsCache;
  try {
    const secrets: Record<string, string> = {};

    // 1. Load secrets.json (simple key-value)
    const secretsPath = join(process.cwd(), 'secrets.json');
    if (existsSync(secretsPath)) {
      Object.assign(secrets, JSON.parse(readFileSync(secretsPath, 'utf-8')));
    }

    // 2. Load models.json (legacy format: { providers: { "provider-name": { apiKey: "..." } } })
    const modelsPath = join(process.cwd(), 'models.json');
    if (existsSync(modelsPath)) {
      const data = JSON.parse(readFileSync(modelsPath, 'utf-8'));
      if (data.providers) {
        for (const [provider, config] of Object.entries(data.providers)) {
          const cfg = config as any;
          if (cfg.apiKey) {
            secrets[provider] = cfg.apiKey;
          }
        }
      }
    }

    if (Object.keys(secrets).length > 0) {
      secretsCache = secrets;
      return secretsCache;
    }
  } catch (e) {
    // Ignore errors
  }
  return null;
}

function loadAuth(): Record<string, { type: string; key: string }> | null {
  if (authCache !== null) return authCache;
  try {
    const path = join(process.cwd(), 'auth.json');
    if (existsSync(path)) {
      authCache = JSON.parse(readFileSync(path, 'utf-8'));
      return authCache;
    }
  } catch (e) {
    // Ignore errors
  }
  return null;
}

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
export function getApiKey(provider: string, explicitKey?: string): string | undefined {
  if (explicitKey) return explicitKey;

  // 1. Provider-specific env var
  const envVar = ENV_VAR_MAP[provider];
  if (envVar && process.env[envVar]) {
    return process.env[envVar];
  }

  // 2. secrets.json (simple key-value)
  const secrets = loadSecrets();
  if (secrets) {
    if (secrets[provider]) return secrets[provider];
    // Try with underscores instead of hyphens (e.g., nvidia_nim)
    const altKey = provider.replace(/-/g, '_');
    if (secrets[altKey]) return secrets[altKey];
  }

  // 3. Legacy auth.json (pi-ai format)
  const auth = loadAuth();
  if (auth && auth[provider]?.key) {
    return auth[provider].key;
  }

  // 4. Fallback to common names
  const fallbacks = [
    'API_KEY',
    `${provider.toUpperCase()}_API_KEY`,
    'OPENAI_API_KEY', // Many services accept OpenAI keys as proxy
  ];

  for (const key of fallbacks) {
    if (process.env[key]) {
      return process.env[key];
    }
  }

  return undefined;
}

/**
 * Check if provider has API key configured
 */
export function hasApiKey(provider: string): boolean {
  return !!getApiKey(provider);
}

/**
 * Get all required env vars for a provider (for validation)
 */
export function getRequiredEnvVars(provider: string): string[] {
  const required: Record<string, string[]> = {
    'amazon-bedrock': ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION'],
    'google-vertex': ['GOOGLE_VERTEX_CREDENTIALS'],
  };

  return required[provider] || [ENV_VAR_MAP[provider]].filter(Boolean) as string[];
}
