/**
 * Provider Configuration
 */

export interface ProviderConfig {
  provider: 'nvidia-nim' | 'openai' | 'anthropic';
  model: string;
}

export const DEFAULT_PROVIDERS: ProviderConfig[] = [
  { provider: 'nvidia-nim', model: 'mistralai/mistral-small-4-119b-2603' },
  { provider: 'openai', model: 'gpt-4o' },
  { provider: 'anthropic', model: 'claude-3-5-sonnet' },
];

export class ProviderSelector {
  static select(availableProviders: string[]): ProviderConfig | null {
    const priority = ['nvidia-nim', 'openai', 'anthropic'];
    for (const provider of priority) {
      if (availableProviders.includes(provider)) {
        const config = DEFAULT_PROVIDERS.find(p => p.provider === provider);
        if (config) return config;
      }
    }
    return null;
  }
}
