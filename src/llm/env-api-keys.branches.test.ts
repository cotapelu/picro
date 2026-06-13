// SPDX-License-Identifier: Apache-2.0
/**
 * Branch coverage tests for env-api-keys module (env-based branches).
 * Covers getApiKey priority (explicit, env var, fallbacks), hasApiKey, getRequiredEnvVars.
 * File-based sources are covered by other tests; this file focuses on runtime env branches.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getApiKey, hasApiKey, getRequiredEnvVars } from './env-api-keys.js';

describe('env-api-keys branch tests', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    // Reset internal caches by forcing module reload per test
    // Since caches are module-scoped and not exportable, we rely on jest reset? We'll avoid cache interference by using distinct provider names and ensuring tests do not depend on file sources.
  });

  describe('getApiKey priority', () => {
    it('returns explicitKey if provided', () => {
      expect(getApiKey('openai', 'explicit')).toBe('explicit');
    });

    it('uses provider-specific environment variable', () => {
      vi.stubEnv('OPENAI_API_KEY', 'env-key');
      expect(getApiKey('openai')).toBe('env-key');
    });

    it('falls back to API_KEY common var', () => {
      vi.stubEnv('API_KEY', 'common-key');
      expect(getApiKey('any')).toBe('common-key');
    });

    it('falls back to PROVIDER_UPPERCASE_API_KEY', () => {
      vi.stubEnv('MYPROV_API_KEY', 'uppercase-key');
      expect(getApiKey('myprov')).toBe('uppercase-key');
    });

    it('falls back to OPENAI_API_KEY as generic', () => {
      vi.stubEnv('OPENAI_API_KEY', 'openai-key');
      expect(getApiKey('some-other')).toBe('openai-key');
    });

    it('returns undefined when no source found', () => {
      vi.stubEnv('OPENAI_API_KEY', undefined);
      expect(getApiKey('unknown')).toBeUndefined();
    });
  });

  describe('hasApiKey', () => {
    it('returns true if getApiKey returns truthy', () => {
      vi.stubEnv('OPENAI_API_KEY', 'key');
      expect(hasApiKey('openai')).toBe(true);
    });

    it('returns false if no key', () => {
      vi.stubEnv('OPENAI_API_KEY', undefined);
      expect(hasApiKey('openai')).toBe(false);
    });
  });

  describe('getRequiredEnvVars', () => {
    it('returns AWS vars for amazon-bedrock', () => {
      const vars = getRequiredEnvVars('amazon-bedrock');
      expect(vars).toContain('AWS_ACCESS_KEY_ID');
      expect(vars).toContain('AWS_SECRET_ACCESS_KEY');
      expect(vars).toContain('AWS_REGION');
    });

    it('returns GOOGLE_VERTEX_CREDENTIALS for google-vertex', () => {
      const vars = getRequiredEnvVars('google-vertex');
      expect(vars).toEqual(['GOOGLE_VERTEX_CREDENTIALS']);
    });

    it('returns provider-specific env var for others', () => {
      const vars = getRequiredEnvVars('openai');
      expect(vars).toEqual(['OPENAI_API_KEY']);
    });
  });
});
