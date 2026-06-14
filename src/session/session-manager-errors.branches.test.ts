// SPDX-License-Identifier: Apache-2.0
/**
 * Branch coverage for SessionManager error/edge cases.
 * Covers:
 * - getEntry for missing id
 * - resetLeaf behavior (sets leafId to null)
 * - buildSessionContext with empty branch and with messages
 * - importSession error paths
 */

import { describe, it, expect } from 'vitest';
import { SessionManager } from './session-manager.js';

function makeManager() {
  return SessionManager.inMemory('/cwd');
}

describe('SessionManager error/edge branches', () => {
  describe('getEntry', () => {
    it('returns undefined for non-existent id', () => {
      const manager = makeManager();
      const entry = manager.getEntry('nonexistent');
      expect(entry).toBeUndefined();
    });
  });

  describe('resetLeaf', () => {
    it('sets leafId to null', () => {
      const manager = makeManager();
      manager.leafId = 'some';
      manager.resetLeaf();
      expect(manager.leafId).toBeNull();
    });
  });

  describe('buildSessionContext', () => {
    it('returns empty messages when branch has no message entries', () => {
      const manager = makeManager();
      manager.fileEntries = [{ id: 'sess', type: 'session', timestamp: '', cwd: '/cwd' } as any];
      manager.byId = new Map([['sess', manager.fileEntries[0]]]);
      manager.leafId = 'sess';
      const ctx = manager.buildSessionContext();
      expect(ctx.messages).toEqual([]);
      expect(ctx.thinkingLevel).toBe('off');
      expect(ctx.model).toBeNull();
    });

    it('collects messages from branch path', () => {
      const manager = makeManager();
      manager.fileEntries = [
        { id: 'sess', type: 'session', timestamp: '', cwd: '/cwd' } as any,
        { id: 'm1', type: 'message', parentId: 'sess', timestamp: '', message: { role: 'user', content: 'hi' } } as any,
      ];
      manager.byId = new Map([
        ['sess', manager.fileEntries[0]],
        ['m1', manager.fileEntries[1]],
      ]);
      manager.leafId = 'm1';
      const ctx = manager.buildSessionContext();
      expect(ctx.messages).toHaveLength(1);
      expect(ctx.messages[0].content).toBe('hi');
    });
  });

  describe('importSession errors', () => {
    it('throws on invalid JSON', () => {
      expect(() => SessionManager.importSession('/cwd', '/dir', 'not json')).toThrow('Invalid JSON');
    });

    it('throws when encrypted but no password', () => {
      const wrapper = JSON.stringify({ encrypted: true, data: 'enc' });
      expect(() => SessionManager.importSession('/cwd', '/dir', wrapper)).toThrow('Password required for encrypted session');
    });

    it('throws on decryption failure', () => {
      const wrapper = JSON.stringify({ encrypted: true, data: 'invalid' });
      expect(() => SessionManager.importSession('/cwd', '/dir', wrapper, 'wrong')).toThrow('Failed to decrypt session');
    });
  });
});
