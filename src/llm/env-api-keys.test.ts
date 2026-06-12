// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getApiKey } from './env-api-keys.js';

describe('env-api-keys', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns API key from corresponding env var', () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-openai-test');
    expect(getApiKey('openai')).toBe('sk-openai-test');
  });

  it('returns API key for anthropic from ANTHROPIC_API_KEY', () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test');
    expect(getApiKey('anthropic')).toBe('sk-ant-test');
  });

  it('returns undefined if no env var for provider', () => {
    vi.stubEnv('SOME_OTHER_KEY', 'abc');
    expect(getApiKey('unknown')).toBeUndefined();
  });

  it('checks google env var GOOGLE_API_KEY', () => {
    vi.stubEnv('GOOGLE_API_KEY', 'google-key');
    expect(getApiKey('google')).toBe('google-key');
  });
});
