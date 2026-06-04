import { describe, it, expect, beforeEach } from 'vitest';
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

describe('SettingsManager', () => {
  describe('defaults', () => {
    it('getDefaultProvider returns undefined when not set', () => {
      const mgr = createManager();
      expect(mgr.getDefaultProvider()).toBeUndefined();
    });

    it('getDefaultModel returns undefined when not set', () => {
      const mgr = createManager();
      expect(mgr.getDefaultModel()).toBeUndefined();
    });

    it('getSteeringMode defaults to one-at-a-time', () => {
      const mgr = createManager();
      expect(mgr.getSteeringMode()).toBe('one-at-a-time');
    });

    it('getTransport defaults to sse', () => {
      const mgr = createManager();
      expect(mgr.getTransport()).toBe('sse');
    });

    it('getCompactionEnabled defaults to true', () => {
      const mgr = createManager();
      expect(mgr.getCompactionEnabled()).toBe(true);
    });

    it('getCompactionReserveTokens defaults to 16384', () => {
      const mgr = createManager();
      expect(mgr.getCompactionReserveTokens()).toBe(16384);
    });
  });

  describe('global settings loading', () => {
    it('loads global settings via storage', () => {
      const storage = new InMemoryStorage();
      storage.data.set('global', JSON.stringify({ defaultProvider: 'openai', defaultModel: 'gpt-4' }));
      const mgr = createManager(storage);
      expect(mgr.getDefaultProvider()).toBe('openai');
      expect(mgr.getDefaultModel()).toBe('gpt-4');
    });

    it('gracefully handles invalid JSON in global settings', () => {
      const storage = new InMemoryStorage();
      storage.data.set('global', '{ invalid json');
      const mgr = createManager(storage);
      // Should fallback to defaults
      expect(mgr.getDefaultProvider()).toBeUndefined();
    });
  });

  describe('project settings override', () => {
    it('project settings override global', () => {
      const storage = new InMemoryStorage();
      storage.data.set('global', JSON.stringify({ defaultProvider: 'openai', defaultModel: 'gpt-4' }));
      storage.data.set('project', JSON.stringify({ defaultModel: 'gpt-4o-mini' }));
      const mgr = createManager(storage);
      expect(mgr.getDefaultProvider()).toBe('openai');
      expect(mgr.getDefaultModel()).toBe('gpt-4o-mini'); // overridden
    });
  });

  describe('setters', () => {
    it('setDefaultProvider updates and persists', () => {
      const storage = new InMemoryStorage();
      const mgr = createManager(storage);
      mgr.setDefaultProvider('anthropic');
      // Not persisted until save is called, but in-memory project settings updated immediately?
      // SettingsManager updates projectSettings in-memory and marks modified, then save enqueues write.
      // We'll call save and then check storage.
      mgr.save(); // enqueue write; wait? In tests, we need to await the writeQueue? manager.save() enqueues async; but in-memory storage writes synchronously inside withLock.
      // Since we're using InMemoryStorage with synchronous withLock, the write happens immediately.
      // Let's flush queue by awaiting manager.save? Actually save enqueues and doesn't wait. We'll wait a tick.
      // Simpler: directly inspect storage after operations, as withLock called synchronously in same turn.
      // But save() enqueues; it may happen after current microtask. However InMemoryStorage withLock is sync, but the enqueue uses promise chain. To be safe, we can await new Promise(process.nextTick) or we can directly check storage after mgr.save()? Might not have run yet.
      // Alternative: we can directly check mgr.getDefaultProvider() which reflects in-memory state.
      expect(mgr.getDefaultProvider()).toBe('anthropic');
      // To ensure persisted, we can create new manager from same storage and verify
      // We need to wait for writeQueue to flush. We'll do:
      return new Promise<void>(resolve => {
        setTimeout(() => {
          const mgr2 = createManager(storage);
          expect(mgr2.getDefaultProvider()).toBe('anthropic');
          resolve();
        }, 0);
      });
    });

    it('setDefaultModel updates and persists', async () => {
      const storage = new InMemoryStorage();
      const mgr = createManager(storage);
      mgr.setDefaultModel('claude-3-5-sonnet');
      await new Promise<void>(resolve => setTimeout(resolve, 10));
      const mgr2 = createManager(storage);
      expect(mgr2.getDefaultModel()).toBe('claude-3-5-sonnet');
    });

    it('setSteeringMode changes value', () => {
      const storage = new InMemoryStorage();
      const mgr = createManager(storage);
      mgr.setSteeringMode('all');
      expect(mgr.getSteeringMode()).toBe('all');
    });

    it('setTransport changes value', () => {
      const storage = new InMemoryStorage();
      const mgr = createManager(storage);
      mgr.setTransport('websocket');
      expect(mgr.getTransport()).toBe('websocket');
    });

    it('setCompactionEnabled changes value', () => {
      const storage = new InMemoryStorage();
      const mgr = createManager(storage);
      mgr.setCompactionEnabled(false);
      expect(mgr.getCompactionEnabled()).toBe(false);
    });

    it('setTheme changes value', () => {
      const storage = new InMemoryStorage();
      const mgr = createManager(storage);
      mgr.setTheme('light');
      expect(mgr.getTheme()).toBe('light');
    });
  });

  describe('nested settings', () => {
    it('handles compaction.reserveTokens set via markModified but no direct setter; we can test getCompactionReserveTokens after setting project file', () => {
      const storage = new InMemoryStorage();
      storage.data.set('project', JSON.stringify({ compaction: { reserveTokens: 5000 } }));
      const mgr = createManager(storage);
      expect(mgr.getCompactionReserveTokens()).toBe(5000);
    });
  });

  describe('error handling', () => {
    it('tolerates invalid JSON in project settings', () => {
      const storage = new InMemoryStorage();
      storage.data.set('project', 'not json');
      expect(() => createManager(storage)).not.toThrow();
      const mgr = createManager(storage);
      expect(mgr.getDefaultProvider()).toBeUndefined();
    });
  });
});
