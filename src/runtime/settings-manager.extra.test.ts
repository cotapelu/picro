import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SettingsManager, type SettingsStorage } from './settings-manager.js';

// In-memory storage for testing
class InMemoryStorage implements SettingsStorage {
  data = new Map<'global' | 'project', string>();
  withLock(scope: 'global' | 'project', fn: (current: string | undefined) => string | undefined): void {
    const current = this.data.get(scope);
    const result = fn(current);
    if (result !== undefined) {
      this.data.set(scope, result);
    }
  }
}

function createManager(storage?: SettingsStorage): SettingsManager {
  return SettingsManager.fromStorage(storage ?? new InMemoryStorage());
}

describe('SettingsManager (extra)', () => {
  describe('getBranchSummarySettings', () => {
    it('returns defaults when not set', () => {
      const mgr = createManager();
      const settings = mgr.getBranchSummarySettings();
      expect(settings.reserveTokens).toBe(16384);
      expect(settings.skipPrompt).toBe(false);
    });

    it('returns overridden values when set', () => {
      const storage = new InMemoryStorage();
      storage.data.set('project', JSON.stringify({ branchSummary: { reserveTokens: 8192, skipPrompt: true } }));
      const mgr = createManager(storage);
      const settings = mgr.getBranchSummarySettings();
      expect(settings.reserveTokens).toBe(8192);
      expect(settings.skipPrompt).toBe(true);
    });
  });

  describe('getRetryEnabled', () => {
    it('returns true by default', () => {
      const mgr = createManager();
      expect(mgr.getRetryEnabled()).toBe(true);
    });

    it('returns false when disabled', () => {
      const storage = new InMemoryStorage();
      storage.data.set('project', JSON.stringify({ retry: { enabled: false } }));
      const mgr = createManager(storage);
      expect(mgr.getRetryEnabled()).toBe(false);
    });
  });

  describe('getRetrySettings', () => {
    it('returns default values', () => {
      const mgr = createManager();
      const s = mgr.getRetrySettings();
      expect(s.enabled).toBe(true);
      expect(s.maxRetries).toBe(3);
      expect(s.baseDelayMs).toBe(2000);
      expect(s.maxDelayMs).toBe(60000);
    });

    it('returns overridden values', () => {
      const storage = new InMemoryStorage();
      storage.data.set('project', JSON.stringify({ retry: { maxRetries: 5, baseDelayMs: 1000, maxDelayMs: 30000 } }));
      const mgr = createManager(storage);
      const s = mgr.getRetrySettings();
      expect(s.maxRetries).toBe(5);
      expect(s.baseDelayMs).toBe(1000);
      expect(s.maxDelayMs).toBe(30000);
    });
  });

  describe('getHideThinkingBlock', () => {
    it('returns false by default', () => {
      const mgr = createManager();
      expect(mgr.getHideThinkingBlock()).toBe(false);
    });

    it('returns true when set', () => {
      const storage = new InMemoryStorage();
      storage.data.set('project', JSON.stringify({ hideThinkingBlock: true }));
      const mgr = createManager(storage);
      expect(mgr.getHideThinkingBlock()).toBe(true);
    });
  });

  describe('getQuietStartup', () => {
    it('returns false by default', () => {
      const mgr = createManager();
      expect(mgr.getQuietStartup()).toBe(false);
    });

    it('returns true when set', () => {
      const storage = new InMemoryStorage();
      storage.data.set('project', JSON.stringify({ quietStartup: true }));
      const mgr = createManager(storage);
      expect(mgr.getQuietStartup()).toBe(true);
    });
  });

  describe('getShellPath', () => {
    it('returns undefined by default', () => {
      const mgr = createManager();
      expect(mgr.getShellPath()).toBeUndefined();
    });

    it('returns set value', () => {
      const storage = new InMemoryStorage();
      storage.data.set('project', JSON.stringify({ shellPath: '/bin/bash' }));
      const mgr = createManager(storage);
      expect(mgr.getShellPath()).toBe('/bin/bash');
    });
  });

  describe('getTheme', () => {
    it('returns undefined by default', () => {
      const mgr = createManager();
      expect(mgr.getTheme()).toBeUndefined();
    });

    it('returns set theme', () => {
      const storage = new InMemoryStorage();
      storage.data.set('global', JSON.stringify({ theme: 'dark' }));
      const mgr = createManager(storage);
      expect(mgr.getTheme()).toBe('dark');
    });
  });

  describe('getSessionDir', () => {
    it('returns undefined when not set', () => {
      const mgr = createManager();
      expect(mgr.getSessionDir()).toBeUndefined();
    });

    it('returns set sessionDir', () => {
      const storage = new InMemoryStorage();
      storage.data.set('global', JSON.stringify({ sessionDir: '/custom/sessions' }));
      const mgr = createManager(storage);
      expect(mgr.getSessionDir()).toBe('/custom/sessions');
    });
  });
});
