// SPDX-License-Identifier: Apache-2.0
/**
 * Branch coverage tests for AuthStorage class.
 * Covers has(), hasAuth(), getApiKey(), getAuthStatus(), parseStorageData, reload, set, remove.
 * Uses a mock backend; does not test filesystem directly.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthStorage } from './auth-storage.js';

function createMockBackend(initialData = '{}') {
  let data = initialData;
  return {
    withLock: vi.fn().mockImplementation((fn: any) => {
      const { result, next } = fn(data);
      if (next !== undefined) {
        data = next;
      }
      return result;
    }),
  };
}

describe('AuthStorage branch tests', () => {
  let storage: AuthStorage;
  let mockBackend: any;
  const provider = 'openai';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    mockBackend = createMockBackend('{}');
    storage = new AuthStorage(mockBackend);
    // Reset private fields
    (storage as any).data = {};
    (storage as any).runtimeOverrides = new Map<string, string>();
    (storage as any).fallbackResolver = undefined;
  });

  describe('has()', () => {
    it('returns true when provider exists in data', () => {
      (storage as any).data[provider] = { type: 'api_key', key: 'x' } as any;
      expect(storage.has(provider)).toBe(true);
    });

    it('returns false when provider not in data', () => {
      expect(storage.has('unknown')).toBe(false);
    });
  });

  describe('hasAuth()', () => {
    it('true for runtime override', () => {
      (storage as any).runtimeOverrides.set(provider, 'key');
      expect(storage.hasAuth(provider)).toBe(true);
    });

    it('true for stored api_key', () => {
      (storage as any).data = { [provider]: { type: 'api_key', key: 'stored' } as any };
      expect(storage.hasAuth(provider)).toBe(true);
    });

    it('true for oauth credential (hasAuth only checks presence)', () => {
      const past = Date.now() - 1000;
      (storage as any).data = { [provider]: { type: 'oauth', accessToken: 't', expires: past } as any };
      expect(storage.hasAuth(provider)).toBe(true);
    });

    it('true for oauth not expired', () => {
      const future = Date.now() + 10000;
      (storage as any).data = { [provider]: { type: 'oauth', accessToken: 't', expires: future } as any };
      expect(storage.hasAuth(provider)).toBe(true);
    });

    it('true when environment variable present', () => {
      vi.stubEnv('OPENAI_API_KEY', 'env-key');
      expect(storage.hasAuth(provider)).toBe(true);
      vi.unstubAllEnvs();
    });

    it('true when fallbackResolver returns value', () => {
      (storage as any).fallbackResolver = (p: string) => (p === provider ? 'fallback-key' : undefined);
      expect(storage.hasAuth(provider)).toBe(true);
    });

    it('false when no source', () => {
      expect(storage.hasAuth('unknown')).toBe(false);
    });
  });

  describe('getApiKey()', () => {
    it('returns runtime override', () => {
      (storage as any).runtimeOverrides.set(provider, 'run-key');
      expect(storage.getApiKey(provider)).toBe('run-key');
    });

    it('returns stored api_key', () => {
      (storage as any).data = { [provider]: { type: 'api_key', key: 'stored' } as any };
      expect(storage.getApiKey(provider)).toBe('stored');
    });

    it('returns oauth token if not expired', () => {
      const future = Date.now() + 10000;
      (storage as any).data = { [provider]: { type: 'oauth', accessToken: 'tok', expires: future } as any };
      expect(storage.getApiKey(provider)).toBe('tok');
    });

    it('returns undefined for oauth if expired', () => {
      const past = Date.now() - 1000;
      (storage as any).data = { [provider]: { type: 'oauth', accessToken: 'tok', expires: past } as any };
      expect(storage.getApiKey(provider)).toBeUndefined();
    });

    it('falls back to environment variable', () => {
      vi.stubEnv('OPENAI_API_KEY', 'env-key');
      expect(storage.getApiKey(provider)).toBe('env-key');
      vi.unstubAllEnvs();
    });

    it('uses fallbackResolver when includeFallback true', () => {
      (storage as any).fallbackResolver = (p: string) => (p === provider ? 'fallback-key' : undefined);
      expect(storage.getApiKey(provider, { includeFallback: true })).toBe('fallback-key');
    });

    it('does not use fallbackResolver when includeFallback false', () => {
      (storage as any).fallbackResolver = vi.fn(() => 'fallback-key');
      expect(storage.getApiKey(provider, { includeFallback: false })).toBeUndefined();
      expect((storage as any).fallbackResolver).not.toHaveBeenCalled();
    });
  });

  describe('getAuthStatus()', () => {
    it('reports stored', () => {
      (storage as any).data = { [provider]: { type: 'api_key', key: 'x' } as any };
      expect(storage.getAuthStatus(provider)).toEqual({ configured: true, source: 'stored' });
    });

    it('reports runtime override', () => {
      (storage as any).runtimeOverrides.set(provider, 'x');
      expect(storage.getAuthStatus(provider)).toEqual({ configured: false, source: 'runtime', label: '--api-key' });
    });

    it('reports environment source', () => {
      vi.stubEnv('OPENAI_API_KEY', 'env-key');
      expect(storage.getAuthStatus(provider)).toEqual({ configured: false, source: 'environment', label: 'env-key' });
      vi.unstubAllEnvs();
    });

    it('reports fallback source', () => {
      (storage as any).fallbackResolver = (p: string) => (p === provider ? 'fb' : undefined);
      expect(storage.getAuthStatus(provider)).toEqual({ configured: false, source: 'fallback', label: 'custom provider config' });
    });

    it('reports unconfigured', () => {
      expect(storage.getAuthStatus('unknown')).toEqual({ configured: false });
    });
  });

  describe('parseStorageData', () => {
    it('parses valid JSON', () => {
      const parsed = (storage as any).parseStorageData('{"openai":{"type":"api_key","key":"x"}}');
      expect(parsed).toEqual({ openai: { type: 'api_key', key: 'x' } });
    });

    it('returns empty on invalid JSON', () => {
      const parsed = (storage as any).parseStorageData('invalid');
      expect(parsed).toEqual({});
    });
  });

  describe('reload()', () => {
    it('loads data from backend and clears loadError', () => {
      const mock = createMockBackend('{"anthropic":{"type":"api_key","key":"a"}}');
      const s = new AuthStorage(mock);
      s.reload();
      expect((s as any).data).toEqual({ anthropic: { type: 'api_key', key: 'a' } });
      expect((s as any).loadError).toBeNull();
    });
  });

  describe('set() and remove()', () => {
    it('set updates data and calls backend', () => {
      const mock = createMockBackend('{}');
      const s = new AuthStorage(mock);
      s.set(provider, { type: 'api_key', key: 'new' } as any);
      expect((s as any).data[provider]).toEqual({ type: 'api_key', key: 'new' });
      expect(mock.withLock).toHaveBeenCalled();
    });

    it('remove deletes provider data and calls backend', () => {
      const mock = createMockBackend('{}');
      const s = new AuthStorage(mock);
      (s as any).data[provider] = { type: 'api_key', key: 'old' } as any;
      s.remove(provider);
      expect((s as any).data[provider]).toBeUndefined();
    });
  });
});
