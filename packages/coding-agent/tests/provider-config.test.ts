import { ProviderSelector, DEFAULT_PROVIDERS, type ProviderConfig } from '../src/config/provider-config.ts';

describe('ProviderConfig', () => {
  it('should have DEFAULT_PROVIDERS array with three entries', () => {
    expect(Array.isArray(DEFAULT_PROVIDERS)).toBe(true);
    expect(DEFAULT_PROVIDERS.length).toBe(3);
  });

  it('select should return nvidia-nim config when available', () => {
    const result = ProviderSelector.select(['nvidia-nim', 'openai']);
    expect(result).toEqual({ provider: 'nvidia-nim', model: 'mistralai/mistral-small-4-119b-2603' });
  });

  it('select should return openai config when nvidia-nim not available but openai is', () => {
    const result = ProviderSelector.select(['openai', 'anthropic']);
    expect(result).toEqual({ provider: 'openai', model: 'gpt-4o' });
  });

  it('select should return anthropic config when only anthropic is available', () => {
    const result = ProviderSelector.select(['anthropic']);
    expect(result).toEqual({ provider: 'anthropic', model: 'claude-3-5-sonnet' });
  });

  it('select should return null when no known providers available', () => {
    const result = ProviderSelector.select(['some-other-provider']);
    expect(result).toBeNull();
  });
});
