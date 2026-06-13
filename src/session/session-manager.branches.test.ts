// SPDX-License-Identifier: Apache-2.0
/**
 * Branch coverage tests for SessionManager error handling.
 * Targets: importSession errors, branch(), branchWithSummary(), appendLabelChange().
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SessionManager } from './session-manager.js';

describe('SessionManager branch tests', () => {
  describe('importSession', () => {
    it('throws on invalid JSON', () => {
      expect(() => SessionManager.importSession('/cwd', '/dir', 'not json')).toThrow('Invalid JSON');
    });

    it('throws when password required for encrypted session', () => {
      const json = JSON.stringify({ encrypted: true, data: 'enc' });
      expect(() => SessionManager.importSession('/cwd', '/dir', json)).toThrow('Password required for encrypted session');
    });

    it('throws on decryption failure', () => {
      const json = JSON.stringify({ encrypted: true, data: 'invalid base64???', v: 1 });
      // using a password, but decryption will produce invalid JSON
      expect(() => SessionManager.importSession('/cwd', '/dir', json, 'wrong')).toThrow('Failed to decrypt session');
    });
  });

  describe('branch()', () => {
    it('throws when parent entry not found', () => {
      const manager = SessionManager.inMemory('/cwd');
      // Simulate by not adding the parent entry
      expect(() => manager.branch('missing')).toThrow('Entry missing not found');
    });
  });

  describe('branchWithSummary()', () => {
    it('throws when branchFromId not in byId', () => {
      const manager = SessionManager.inMemory('/cwd');
      expect(() => manager.branchWithSummary('ghost', 'summary')).toThrow('Entry ghost not found');
    });
  });

  describe('appendLabelChange()', () => {
    it('throws when targetId not found', () => {
      const manager = SessionManager.inMemory('/cwd');
      // Ensure no such entry exists
      expect(() => manager.appendLabelChange('unknown', 'label')).toThrow('Entry unknown not found');
    });

    it('appends label when target exists', () => {
      const manager = SessionManager.inMemory('/cwd');
      // Create a message entry first
      manager.appendMessage({ role: 'user', content: 'hi' });
      const leafId = manager.getLeafId()!;
      // Should not throw
      const labelId = manager.appendLabelChange(leafId, 'mylabel');
      expect(labelId).toBeDefined();
      // Verify label entry has correct targetId
      const entry = manager.getEntry(labelId);
      expect(entry?.type).toBe('label');
      expect((entry as any).targetId).toBe(leafId);
    });
  });
});
