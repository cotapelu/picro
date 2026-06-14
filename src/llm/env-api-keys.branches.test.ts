import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock fs with both named and default exports
vi.mock('fs', () => {
  const existsSync = vi.fn();
  const readFileSync = vi.fn();
  const mocks = { existsSync, readFileSync };
  return {
    ...mocks,
    default: mocks,
  };
});

import * as fs from 'fs';
import * as os from 'os';
import * as envApiKeys from './env-api-keys.js';

function resetCaches() {
  (envApiKeys as any).secretsCache = null;
  (envApiKeys as any).authCache = null;
}

describe('env-api-keys branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCaches();
    // Set default implementations for fs mocks
    fs.existsSync.mockReturnValue(false);
    fs.readFileSync.mockImplementation(() => { throw new Error('unexpected read'); });
    // Clear common env vars
    delete process.env.OPENAI_API_KEY;
    delete process.env.NVIDIA_NIM_API_KEY;
    delete process.env.API_KEY;
    delete process.env.GROQ_API_KEY;
    delete process.env.XAI_API_KEY;
    delete process.env.KILO_API_KEY;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getApiKey', () => {
    it('returns explicitKey if provided', () => {
      expect((envApiKeys as any).getApiKey('openai', 'sk-explicit')).toBe('sk-explicit');
    });

    it('returns provider-specific env var when set', () => {
      process.env.OPENAI_API_KEY = 'sk-openai';
      expect((envApiKeys as any).getApiKey('openai')).toBe('sk-openai');
    });

    it('returns fallback API_KEY env var', () => {
      process.env.API_KEY = 'sk-apikey';
      expect((envApiKeys as any).getApiKey('unknown')).toBe('sk-apikey');
    });

    it('returns provider uppercase API_KEY fallback', () => {
      process.env.GROQ_API_KEY = 'sk-groq';
      expect((envApiKeys as any).getApiKey('groq')).toBe('sk-groq');
    });

    it('returns OPENAI_API_KEY as universal fallback', () => {
      process.env.OPENAI_API_KEY = 'sk-openai-proxy';
      expect((envApiKeys as any).getApiKey('any-provider')).toBe('sk-openai-proxy');
    });

    it('reads from secrets.json', () => {
      // secrets.json exists, models.json does not (default)
      fs.existsSync.mockReturnValueOnce(true); // secrets exists
      fs.readFileSync.mockReturnValueOnce('{"myprovider":"secret123"}');
      (envApiKeys as any).secretsCache = null; // reset
      expect((envApiKeys as any).getApiKey('myprovider')).toBe('secret123');
    });

    it('prefers explicitKey over all other sources', () => {
      process.env.OPENAI_API_KEY = 'env-key';
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('{"openai":"secrets-key"}');
      expect((envApiKeys as any).getApiKey('openai', 'explicit-key')).toBe('explicit-key');
    });

    it('returns undefined if no source found', () => {
      // No env, no files -> undefined
      fs.existsSync.mockReturnValue(false);
      expect((envApiKeys as any).getApiKey('unknown')).toBeUndefined();
    });
  });

  describe('hasApiKey', () => {
    it('returns true when getApiKey returns a value', () => {
      process.env.OPENAI_API_KEY = 'key';
      expect(envApiKeys.hasApiKey('openai')).toBe(true);
    });

    it('returns false when no key', () => {
      delete process.env.OPENAI_API_KEY;
      expect(envApiKeys.hasApiKey('openai')).toBe(false);
    });
  });

  describe('getRequiredEnvVars', () => {
    it('returns AWS vars for amazon-bedrock', () => {
      expect(envApiKeys.getRequiredEnvVars('amazon-bedrock')).toEqual([
        'AWS_ACCESS_KEY_ID',
        'AWS_SECRET_ACCESS_KEY',
        'AWS_REGION',
      ]);
    });

    it('returns GOOGLE_VERTEX_CREDENTIALS for google-vertex', () => {
      expect(envApiKeys.getRequiredEnvVars('google-vertex')).toEqual(['GOOGLE_VERTEX_CREDENTIALS']);
    });

    it('returns mapped env var for other providers', () => {
      expect(envApiKeys.getRequiredEnvVars('openai')).toEqual(['OPENAI_API_KEY']);
      expect(envApiKeys.getRequiredEnvVars('xai')).toEqual(['XAI_API_KEY']);
    });

    it('returns empty array if no mapping', () => {
      expect(envApiKeys.getRequiredEnvVars('unknown')).toEqual([]);
    });
  });
});
