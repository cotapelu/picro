// SPDX-License-Identifier: Apache-2.0
/**
 * Branch coverage tests for SessionManager appendMessage, getBranch, appendLabelChange, appendCompaction.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionManager } from './session-manager.js';

function makeManager() {
  const manager = SessionManager.inMemory('/cwd');
  (manager as any)._persist = vi.fn(); // stub persistence
  // Reset state for each test
  manager.fileEntries = [];
  manager.byId.clear();
  manager.labelsById.clear();
  manager.leafId = null;
  manager.sessionId = 'sess1';
  manager.persist = false;
  manager.sessionFile = undefined;
  return manager;
}

describe('SessionManager branches', () => {
  let manager: SessionManager;

  beforeEach(() => {
    manager = makeManager();
  });

  describe('appendMessage', () => {
    it('adds message entry and updates leafId and byId', () => {
      const msg: any = { role: 'user', content: 'hello' };
      manager.appendMessage(msg);
      expect(manager.leafId).toBeDefined();
      const entry = manager.byId.get(manager.leafId!);
      expect(entry).toBeDefined();
      expect(entry?.type).toBe('message');
      expect((entry as any).message.role).toBe('user');
    });

    it('does not convert toolResult role', () => {
      const msg: any = { role: 'toolResult', content: [{ type: 'text', text: 'out' }], toolCallId: 'c1' };
      manager.appendMessage(msg);
      const entry = manager.byId.get(manager.leafId!);
      expect((entry as any).message.role).toBe('toolResult');
    });

    it('calls _persist when persist enabled', () => {
      manager.persist = true;
      manager.sessionFile = '/tmp/session.jsonl';
      const msg: any = { role: 'user', content: 'hello' };
      manager.appendMessage(msg);
      expect((manager as any)._persist).toHaveBeenCalled();
    });
  });

  describe('getBranch', () => {
    it('returns empty array when leafId is null', () => {
      manager.leafId = null;
      const branch = manager.getBranch();
      expect(branch).toEqual([]);
    });

    it('returns path from specified fromId', () => {
      const e1 = { id: 'e1', type: 'message', parentId: null as any, timestamp: '', message: {} } as any;
      const e2 = { id: 'e2', type: 'message', parentId: 'e1', timestamp: '', message: {} } as any;
      const e3 = { id: 'e3', type: 'message', parentId: 'e2', timestamp: '', message: {} } as any;
      manager.fileEntries = [e1, e2, e3];
      manager.byId = new Map([['e1', e1], ['e2', e2], ['e3', e3]]);
      manager.leafId = 'e3';
      const branch = manager.getBranch('e2');
      expect(branch.map(e => e.id)).toEqual(['e1', 'e2']);
    });

    it('returns full path from leafId when fromId omitted', () => {
      const e1 = { id: 'e1', type: 'message', parentId: null as any, timestamp: '', message: {} } as any;
      const e2 = { id: 'e2', type: 'message', parentId: 'e1', timestamp: '', message: {} } as any;
      manager.fileEntries = [e1, e2];
      manager.byId = new Map([['e1', e1], ['e2', e2]]);
      manager.leafId = 'e2';
      const branch = manager.getBranch();
      expect(branch.map(e => e.id)).toEqual(['e1', 'e2']);
    });
  });

  describe('appendLabelChange', () => {
    it('creates label entry and updates maps', () => {
      const target = { id: 't1', type: 'message', parentId: null as any, timestamp: '', message: {} } as any;
      manager.fileEntries = [target];
      manager.byId.set('t1', target);
      manager.leafId = 't1';
      manager.appendLabelChange('t1', 'label-x');
      const entry = manager.fileEntries[manager.fileEntries.length - 1];
      expect(entry.type).toBe('label');
      expect(manager.labelsById.get('t1')).toBe('label-x');
    });

    it('throws if target entry not found', () => {
      expect(() => manager.appendLabelChange('missing', 'lbl')).toThrow('Entry missing not found');
    });

    it('removes previous label for same target before adding new', () => {
      const target = { id: 't1', type: 'message', parentId: null as any, timestamp: '', message: {} } as any;
      manager.fileEntries = [target];
      manager.byId.set('t1', target);
      manager.leafId = 't1';
      manager.appendLabelChange('t1', 'old');
      manager.appendLabelChange('t1', 'new');
      expect(manager.labelsById.get('t1')).toBe('new');
      const labelEntries = manager.fileEntries.filter(e => e.type === 'label' && e.targetId === 't1');
      expect(labelEntries).toHaveLength(2);
    });
  });

  describe('appendCompaction', () => {
    it('creates compaction entry with correct fields', () => {
      manager.appendCompaction('summary', 'firstId', 100, { detail: true }, false);
      const entry = manager.fileEntries[manager.fileEntries.length - 1];
      expect(entry.type).toBe('compaction');
      expect(entry.summary).toBe('summary');
      expect(entry.firstKeptEntryId).toBe('firstId');
      expect(entry.tokensBefore).toBe(100);
      expect(entry.details).toEqual({ detail: true });
    });
  });
});
