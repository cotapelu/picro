import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthStorage } from './auth-storage';

describe('AuthStorage', () => {
  describe('inMemory backend', () => {
    let storage: AuthStorage;

    beforeEach(() => {
      storage = AuthStorage.inMemory({});
    });

    describe('basic CRUD', () => {
      it('sets and gets an API key', () => {
        storage.set('openai', { type: 'api_key', key: 'sk-123' } as any);
        expect(storage.get('openai')).toEqual({ type: 'api_key', key: 'sk-123' });
        expect(storage.has('openai')).toBe(true);
        expect(storage.list()).toContain('openai');
      });

      it('removes a provider', () => {
        storage.set('openai', { type: 'api_key', key: 'sk-123' } as any);
        storage.remove('openai');
        expect(storage.get('openai')).toBeUndefined();
        expect(storage.has('openai')).toBe(false);
      });

      it('list returns all provider keys', () => {
        storage.set('openai', { type: 'api_key', key: 'key1' } as any);
        storage.set('anthropic', { type: 'api_key', key: 'key2' } as any);
        const keys = storage.list();
        expect(keys).toHaveLength(2);
        expect(keys).toContain('openai');
        expect(keys).toContain('anthropic');
      });

      it('has returns true for existing provider', () => {
        storage.set('openai', { type: 'api_key', key: 'key' } as any);
        expect(storage.has('openai')).toBe(true);
      });

      it('has returns false for missing provider', () => {
        expect(storage.has('unknown')).toBe(false);
      });
    });

    describe('getApiKey', () => {
      it('returns API key for stored api_key credential', () => {
        storage.set('openai', { type: 'api_key', key: 'my-key' } as any);
        expect(storage.getApiKey('openai')).toBe('my-key');
      });

      it('returns undefined for stored oauth credential when expired', () => {
        const now = Date.now();
        const cred = {
          type: 'oauth' as const,
          accessToken: 'token',
          refreshToken: 'refresh',
          expires: now - 1000, // expired
        };
        storage.set('google', cred);
        expect(storage.getApiKey('google')).toBeUndefined();
      });

      it('returns accessToken for stored oauth credential when not expired', () => {
        const now = Date.now();
        const cred = {
          type: 'oauth' as const,
          accessToken: 'valid-token',
          refreshToken: 'refresh',
          expires: now + 3600000,
        };
        storage.set('google', cred);
        expect(storage.getApiKey('google')).toBe('valid-token');
      });
    });

    describe('runtime overrides', () => {
      it('getApiKey returns runtime override', () => {
        storage.setRuntimeApiKey('openai', 'runtime-key');
        expect(storage.getApiKey('openai')).toBe('runtime-key');
      });

      it('runtime override takes precedence over stored key', () => {
        storage.set('openai', { type: 'api_key', key: 'stored-key' } as any);
        storage.setRuntimeApiKey('openai', 'runtime-key');
        expect(storage.getApiKey('openai')).toBe('runtime-key');
      });

      it('removeRuntimeApiKey clears override', () => {
        storage.setRuntimeApiKey('openai', 'runtime-key');
        storage.removeRuntimeApiKey('openai');
        expect(storage.getApiKey('openai')).toBeUndefined();
      });
    });

    describe('environment variable fallback', () => {
      const originalOpenAI = process.env.OPENAI_API_KEY;

      beforeEach(() => {
        delete process.env.OPENAI_API_KEY;
        storage = AuthStorage.inMemory({});
      });

      afterEach(() => {
        if (originalOpenAI !== undefined) {
          process.env.OPENAI_API_KEY = originalOpenAI;
        } else {
          delete process.env.OPENAI_API_KEY;
        }
      });

      it('falls back to OPENAI_API_KEY for openai', () => {
        process.env.OPENAI_API_KEY = 'env-key';
        expect(storage.getApiKey('openai')).toBe('env-key');
      });

      it('falls back to generic provider env var', () => {
        process.env.MYPROVIDER_API_KEY = 'generic-key';
        expect(storage.getApiKey('myprovider')).toBe('generic-key');
      });
    });

    describe('fallback resolver', () => {
      it('uses fallback resolver when provided', () => {
        storage.setFallbackResolver((provider) => `fallback-${provider}`);
        expect(storage.getApiKey('custom')).toBe('fallback-custom');
      });

      it('fallback resolver is ignored if stored key exists', () => {
        storage.set('custom', { type: 'api_key', key: 'stored' } as any);
        storage.setFallbackResolver((provider) => `fallback-${provider}`);
        expect(storage.getApiKey('custom')).toBe('stored');
      });

      it('includeFallback option can disable fallback', () => {
        storage.setFallbackResolver((provider) => `fallback-${provider}`);
        expect(storage.getApiKey('custom', { includeFallback: false })).toBeUndefined();
      });
    });

    describe('hasAuth', () => {
      it('returns true if stored credential exists', () => {
        storage.set('openai', { type: 'api_key', key: 'key' } as any);
        expect(storage.hasAuth('openai')).toBe(true);
      });

      it('returns true if runtime override exists', () => {
        storage.setRuntimeApiKey('openai', 'key');
        expect(storage.hasAuth('openai')).toBe(true);
      });

      it('returns true if env var exists', () => {
        process.env.OPENAI_API_KEY = 'env-key';
        expect(storage.hasAuth('openai')).toBe(true);
        delete process.env.OPENAI_API_KEY;
      });

      it('returns false if none', () => {
        expect(storage.hasAuth('unknown')).toBe(false);
      });
    });

    describe('getAuthStatus', () => {
      it('reports stored source', () => {
        storage.set('openai', { type: 'api_key', key: 'key' } as any);
        expect(storage.getAuthStatus('openai')).toEqual({ configured: true, source: 'stored' });
      });

      it('reports runtime source', () => {
        storage.setRuntimeApiKey('openai', 'key');
        expect(storage.getAuthStatus('openai')).toEqual({ configured: false, source: 'runtime', label: '--api-key' });
      });

      it('reports environment source', () => {
        process.env.OPENAI_API_KEY = 'env-key';
        expect(storage.getAuthStatus('openai')).toEqual({ configured: false, source: 'environment', label: 'env-key' });
        delete process.env.OPENAI_API_KEY;
      });

      it('reports fallback source', () => {
        storage.setFallbackResolver(() => 'custom');
        expect(storage.getAuthStatus('test')).toEqual({ configured: false, source: 'fallback', label: 'custom provider config' });
      });

      it('reports unconfigured when nothing', () => {
        expect(storage.getAuthStatus('openai')).toEqual({ configured: false });
      });
    });

    describe('getAll', () => {
      it('returns a copy of data', () => {
        storage.set('openai', { type: 'api_key', key: 'key' } as any);
        const all = storage.getAll();
        expect(all).toEqual({ openai: { type: 'api_key', key: 'key' } });
        // Mutating returned object should not affect internal state
        all.openai = { type: 'api_key', key: 'hacked' } as any;
        expect(storage.getAll().openai).toEqual({ type: 'api_key', key: 'key' });
      });
    });

    describe('drainErrors', () => {
      it('returns and clears error list', () => {
        const errors = storage.drainErrors();
        expect(errors).toEqual([]);
        expect(storage.drainErrors()).toEqual([]);
      });
    });

    describe('reload', () => {
      it('reloads data from storage without error', () => {
        storage.set('openai', { type: 'api_key', key: 'key' } as any);
        storage.reload();
        expect(storage.get('openai')).toEqual({ type: 'api_key', key: 'key' });
      });
    });
  });
});
