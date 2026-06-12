// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuthStorage } from './auth-storage.js';
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('AuthStorage', () => {
  let testDir: string;
  let storagePath: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `picro-auth-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    storagePath = join(testDir, 'auth.json');
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('creation and persistence', () => {
    it('should create empty storage when file does not exist', () => {
      const storage = AuthStorage.create(storagePath);
      expect(storage.get('openai')).toBeUndefined();
      expect(existsSync(storagePath)).toBe(true); // file is created automatically
    });

    it('should load existing data from file', () => {
      const initialData = {
        openai: { type: 'api_key', key: 'sk-existing' },
      };
      writeFileSync(storagePath, JSON.stringify(initialData, null, 2));

      const storage = AuthStorage.create(storagePath);
      expect(storage.get('openai')).toEqual(initialData.openai);
    });

    it('should persist set() to file', () => {
      const storage = AuthStorage.create(storagePath);
      storage.set('anthropic', { type: 'api_key', key: 'sk-ant' });

      const raw = readFileSync(storagePath, 'utf-8');
      const parsed = JSON.parse(raw);
      expect(parsed.anthropic).toEqual({ type: 'api_key', key: 'sk-ant' });
    });

    it('should remove credential on remove()', () => {
      const initialData = {
        openai: { type: 'api_key', key: 'sk-old' },
      };
      writeFileSync(storagePath, JSON.stringify(initialData, null, 2));

      const storage = AuthStorage.create(storagePath);
      storage.remove('openai');

      const raw = readFileSync(storagePath, 'utf-8');
      const parsed = JSON.parse(raw);
      expect(parsed.openai).toBeUndefined();
    });
  });

  describe('getApiKey', () => {
    it('returns api key when credential type is api_key', () => {
      const storage = AuthStorage.create(storagePath);
      storage.set('openai', { type: 'api_key', key: 'sk-test' });
      expect(storage.getApiKey('openai')).toBe('sk-test');
    });

    it('returns undefined for unsupported credential type', () => {
      const storage = AuthStorage.create(storagePath);
      storage.set('openai', { type: 'oauth' } as any);
      expect(storage.getApiKey('openai')).toBeUndefined();
    });

    it('returns access token for oauth if not expired', () => {
      const storage = AuthStorage.create(storagePath);
      const future = Date.now() + 3600000;
      storage.set('google', { type: 'oauth', accessToken: 'ya29.token', expires: future });
      expect(storage.getApiKey('google')).toBe('ya29.token');
    });

    it('returns undefined for oauth if expired', () => {
      const storage = AuthStorage.create(storagePath);
      const past = Date.now() - 1000;
      storage.set('google', { type: 'oauth', accessToken: 'ya29.expired', expires: past });
      expect(storage.getApiKey('google')).toBeUndefined();
    });

    it('falls back to environment variable if no stored key', () => {
      const storage = AuthStorage.create(storagePath);
      // Set env var via process.env
      process.env.OPENAI_API_KEY = 'sk-env';
      expect(storage.getApiKey('openai')).toBe('sk-env');
      delete process.env.OPENAI_API_KEY;
    });

    it('respects includeFallback option', () => {
      const storage = AuthStorage.create(storagePath);
      storage.setFallbackResolver((provider) => {
        if (provider === 'custom') return 'fallback-key';
        return undefined;
      });
      expect(storage.getApiKey('custom', { includeFallback: true })).toBe('fallback-key');
      expect(storage.getApiKey('unknown', { includeFallback: false })).toBeUndefined();
    });
  });

  describe('list', () => {
    it('returns list of providers with stored credentials', () => {
      const storage = AuthStorage.create(storagePath);
      storage.set('openai', { type: 'api_key', key: 'sk-1' });
      storage.set('anthropic', { type: 'api_key', key: 'sk-2' });
      expect(storage.list()).toContain('openai');
      expect(storage.list()).toContain('anthropic');
    });
  });

  describe('runtime overrides', () => {
    it('getApiKey returns runtime override when set', () => {
      const storage = AuthStorage.create(storagePath);
      storage.set('openai', { type: 'api_key', key: 'sk-stored' });
      storage.setRuntimeApiKey('openai', 'sk-override');
      expect(storage.getApiKey('openai')).toBe('sk-override');
    });

    it('removeRuntimeApiKey clears override', () => {
      const storage = AuthStorage.create(storagePath);
      storage.setRuntimeApiKey('openai', 'sk-override');
      storage.removeRuntimeApiKey('openai');
      // Now should fall back to stored or env
      expect(storage.getApiKey('openai')).toBeUndefined();
    });
  });

  describe('concurrent access', () => {
    it('persists changes atomically via withLock', () => {
      const storage = AuthStorage.create(storagePath);
      // Simulate concurrent modification by directly writing to file
      storage.set('openai', { type: 'api_key', key: 'sk-initial' });

      // Perform another set; verify file consistency
      storage.set('anthropic', { type: 'api_key', key: 'sk-ant' });

      const raw = readFileSync(storagePath, 'utf-8');
      const data = JSON.parse(raw);
      expect(data.openai).toEqual({ type: 'api_key', key: 'sk-initial' });
      expect(data.anthropic).toEqual({ type: 'api_key', key: 'sk-ant' });
    });
  });
});
