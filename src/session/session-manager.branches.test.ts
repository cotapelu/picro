// SPDX-License-Identifier: Apache-2.0
/**
 * Branch coverage tests for SessionManager error handling.
 * Focus: branch, getEntry, resetLeaf, appendLabelChange, importSession.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SessionManager } from './session-manager.js';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdirSync, rmSync } from 'fs';

describe('SessionManager branch tests', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), 'sm-err-' + Math.random().toString(36).slice(2));
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    try { if (rmSync) rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
  });

  describe('branch()', () => {
    it('throws when parent entry not found', () => {
      const manager = SessionManager.inMemory(tempDir);
      expect(() => manager.branch('non-existent')).toThrow('Entry non-existent not found');
    });

    it('sets leaf to an existing entry without throwing', () => {
      const manager = SessionManager.inMemory(tempDir);
      manager.appendMessage({ role: 'user', content: 'test' } as any);
      const existingLeaf = manager.getLeafId()!;
      // Calling branch with a valid existing ID should succeed
      expect(() => manager.branch(existingLeaf)).not.toThrow();
      // Leaf should remain the same
      expect(manager.getLeafId()).toBe(existingLeaf);
    });
  });

  describe('getEntry()', () => {
    it('returns undefined for unknown entry id', () => {
      const manager = SessionManager.inMemory(tempDir);
      expect(manager.getEntry('unknown')).toBeUndefined();
    });
  });

  describe('resetLeaf()', () => {
    it('clears leafId without error', () => {
      const manager = SessionManager.inMemory(tempDir);
      manager.appendMessage({ role: 'user', content: 'test' });
      const leafId = manager.getLeafId();
      expect(leafId).toBeDefined();
      manager.resetLeaf();
      expect(manager.getLeafId()).toBeNull();
    });
  });

  describe('appendLabelChange()', () => {
    it('throws when targetId not found', () => {
      const manager = SessionManager.inMemory(tempDir);
      expect(() => manager.appendLabelChange('unknown', 'label')).toThrow('Entry unknown not found');
    });

    it('appends label when target exists', () => {
      const manager = SessionManager.inMemory(tempDir);
      manager.appendMessage({ role: 'user', content: 'hi' });
      const leafId = manager.getLeafId()!;
      const labelId = manager.appendLabelChange(leafId, 'mylabel');
      expect(labelId).toBeDefined();
      const entry = manager.getEntry(labelId);
      expect(entry?.type).toBe('label');
      // @ts-ignore
      expect(entry.targetId).toBe(leafId);
    });
  });

  describe('importSession()', () => {
    it('throws on invalid JSON', () => {
      expect(() => SessionManager.importSession('/cwd', '/dir', 'not json')).toThrow('Invalid JSON');
    });

    it('throws when password required for encrypted session', () => {
      const json = JSON.stringify({ encrypted: true, data: 'enc' });
      expect(() => SessionManager.importSession('/cwd', '/dir', json)).toThrow('Password required for encrypted session');
    });

    it('throws on decryption failure', () => {
      const json = JSON.stringify({ encrypted: true, data: 'invalid base64???', v: 1 });
      expect(() => SessionManager.importSession('/cwd', '/dir', json, 'wrong')).toThrow('Failed to decrypt session');
    });
  });

  describe('branchWithSummary()', () => {
    it('creates branch summary from root (null branchFromId)', () => {
      const manager = SessionManager.inMemory(tempDir);
      const summaryId = manager.branchWithSummary(null, 'First summary');
      const entry = manager.getEntry(summaryId);
      expect(entry?.type).toBe('branch_summary');
      // @ts-ignore
      expect(entry.summary).toBe('First summary');
      expect(entry?.parentId).toBeNull();
      expect(manager.getLeafId()).toBe(summaryId);
    });

    it('throws when branchFromId not found', () => {
      const manager = SessionManager.inMemory(tempDir);
      expect(() => manager.branchWithSummary('missing', 'summary')).toThrow('Entry missing not found');
    });

    it('creates branch summary from existing entry', () => {
      const manager = SessionManager.inMemory(tempDir);
      manager.appendMessage({ role: 'user', content: 'base' } as any);
      const parentId = manager.getLeafId()!;
      const summaryId = manager.branchWithSummary(parentId, 'Child summary');
      const entry = manager.getEntry(summaryId);
      expect(entry?.type).toBe('branch_summary');
      // @ts-ignore
      expect(entry.summary).toBe('Child summary');
      expect(entry?.parentId).toBe(parentId);
      expect(manager.getLeafId()).toBe(summaryId);
    });
  });
});
