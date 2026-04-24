import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { pushConfig as remotePushConfig, pullConfig as remotePullConfig } from '../src/config-remote.js';

describe('Config Remote', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('pushConfig', () => {
    it('should POST config to remote URL', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      const config = { theme: 'dark', maxRounds: 10 };
      await remotePushConfig('https://example.com/config', config);

      expect(mockFetch).toHaveBeenCalledWith('https://example.com/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
    });

    it('should throw on fetch failure', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
      global.fetch = mockFetch;

      const config = { theme: 'dark' };
      await expect(remotePushConfig('https://example.com/config', config)).rejects.toThrow('Failed to push config');
    });
  });

  describe('pullConfig', () => {
    it('should GET config from remote URL', async () => {
      const remoteConfig = { theme: 'light', maxRounds: 20 };
      const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(remoteConfig) });
      global.fetch = mockFetch;

      const result = await remotePullConfig('https://example.com/config');

      expect(mockFetch).toHaveBeenCalledWith('https://example.com/config', { method: 'GET' });
      expect(result).toEqual(remoteConfig);
    });

    it('should throw on fetch failure', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: false });
      global.fetch = mockFetch;

      await expect(remotePullConfig('https://example.com/config')).rejects.toThrow('Failed to pull config');
    });
  });
});
