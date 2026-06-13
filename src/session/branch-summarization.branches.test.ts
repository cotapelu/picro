// SPDX-License-Identifier: Apache-2.0
/**
 * Branch coverage tests for branch-summarization module.
 * Covers extractFileOpsFromMessage, computeFileLists, formatFileOperations, collectEntriesForBranchSummary.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  extractFileOpsFromMessage,
  computeFileLists,
  formatFileOperations,
  collectEntriesForBranchSummary,
} from './branch-summarization.js';

// Minimal types for agent messages
type AgentMessage = {
  role: string;
  content: any[];
  provider?: string;
  api?: string;
  model?: string;
};
type FileOperations = {
  read: Set<string>;
  written: Set<string>;
  edited: Set<string>;
};

function createFileOps(): FileOperations {
  return { read: new Set(), written: new Set(), edited: new Set() };
}

function makeAssistantMessage(blocks: any[]): AgentMessage {
  return { role: 'assistant', content: blocks, provider: 'openai', api: 'openai', model: 'gpt-4' };
}

function makeUserMessage(blocks: any[]): AgentMessage {
  return { role: 'user', content: blocks };
}

// Simple mock SessionManager for testing collectEntriesForBranchSummary
function makeSessionManager(entries: any[] = []) {
  const byId = new Map<string, any>();
  entries.forEach(e => byId.set(e.id, e));
  return {
    getBranch: vi.fn().mockImplementation((leafId: string) => {
      const path: any[] = [];
      let curr = byId.get(leafId);
      while (curr) {
        path.unshift(curr);
        curr = byId.get(curr.parentId);
      }
      return path;
    }),
    getEntry: vi.fn().mockImplementation((id: string) => byId.get(id)),
  };
}

describe('branch-summarization branch tests', () => {
  describe('extractFileOpsFromMessage', () => {
    it('adds read for read tool', () => {
      const fileOps = createFileOps();
      const msg: AgentMessage = makeAssistantMessage([
        { type: 'toolCall', name: 'read', arguments: { path: '/a/b' } },
      ]);
      extractFileOpsFromMessage(msg, fileOps);
      expect(fileOps.read.has('/a/b')).toBe(true);
    });

    it('adds written for write tool', () => {
      const fileOps = createFileOps();
      const msg = makeAssistantMessage([
        { type: 'toolCall', name: 'write', arguments: { path: '/x/y' } },
      ]);
      extractFileOpsFromMessage(msg, fileOps);
      expect(fileOps.written.has('/x/y')).toBe(true);
    });

    it('adds edited for edit tool', () => {
      const fileOps = createFileOps();
      const msg = makeAssistantMessage([
        { type: 'toolCall', name: 'edit', arguments: { path: '/p/q' } },
      ]);
      extractFileOpsFromMessage(msg, fileOps);
      expect(fileOps.edited.has('/p/q')).toBe(true);
    });

    it('ignores non-assistant role', () => {
      const fileOps = createFileOps();
      const msg = makeUserMessage([{ type: 'text', text: 'hi' }]);
      extractFileOpsFromMessage(msg, fileOps);
      expect(fileOps.read.size + fileOps.written.size + fileOps.edited.size).toBe(0);
    });

    it('skips toolCall with missing args', () => {
      const fileOps = createFileOps();
      const msg = makeAssistantMessage([{ type: 'toolCall', name: 'read' }]); // no arguments
      extractFileOpsFromMessage(msg, fileOps);
      expect(fileOps.read.size).toBe(0);
    });

    it('skips toolCall with missing path', () => {
      const fileOps = createFileOps();
      const msg = makeAssistantMessage([{ type: 'toolCall', name: 'read', arguments: {} }]);
      extractFileOpsFromMessage(msg, fileOps);
      expect(fileOps.read.size).toBe(0);
    });
  });

  describe('computeFileLists', () => {
    it('splits read-only and modified files', () => {
      const fileOps: FileOperations = {
        read: new Set(['/a', '/b']),
        written: new Set(['/c']),
        edited: new Set(['/b', '/d']), // /b appears in both read and edited -> modified
      };
      const { readFiles, modifiedFiles } = computeFileLists(fileOps);
      expect(readFiles).toEqual(['/a']); // /b removed because also modified
      expect(modifiedFiles.sort()).toEqual(['/b', '/c', '/d']);
    });

    it('returns empty when no operations', () => {
      const fileOps: FileOperations = { read: new Set(), written: new Set(), edited: new Set() };
      const { readFiles, modifiedFiles } = computeFileLists(fileOps);
      expect(readFiles).toEqual([]);
      expect(modifiedFiles).toEqual([]);
    });
  });

  describe('formatFileOperations', () => {
    it('returns empty string when both lists empty', () => {
      const out = formatFileOperations([], []);
      expect(out).toBe('');
    });

    it('includes only read files section', () => {
      const out = formatFileOperations(['/a'], []);
      expect(out).toContain('<read-files>');
      expect(out).toContain('/a');
      expect(out).not.toContain('<modified-files>');
    });

    it('includes only modified files section', () => {
      const out = formatFileOperations([], ['/x']);
      expect(out).toContain('<modified-files>');
      expect(out).toContain('/x');
      expect(out).not.toContain('<read-files>');
    });

    it('includes both sections when both non-empty', () => {
      const out = formatFileOperations(['/r1'], ['/m1']);
      expect(out).toContain('<read-files>');
      expect(out).toContain('<modified-files>');
    });
  });

  describe('collectEntriesForBranchSummary', () => {
    const entries = [
      { id: '1', parentId: null },
      { id: '2', parentId: '1' },
      { id: '3', parentId: '2' },
      { id: '4', parentId: '2' },
    ];
    let manager: any;

    beforeEach(() => {
      manager = makeSessionManager(entries);
    });

    it('returns empty when oldLeafId null', () => {
      const result = collectEntriesForBranchSummary(manager, null, '3');
      expect(result.entries).toEqual([]);
      expect(result.commonAncestorId).toBeNull();
    });

    it('finds common ancestor when exists', () => {
      // old leaf = 4, target = 3 -> common ancestor should be 2
      const result = collectEntriesForBranchSummary(manager, '4', '3');
      // Entries from old leaf (4) up to but not including common ancestor (2)
      // Path for 4: [1,2,4]; common=2; entries should be [4] (since we reverse later)
      expect(result.entries.map(e => e.id)).toEqual(['4']);
      expect(result.commonAncestorId).toBe('2');
    });

    it('breaks if entry missing along path but commonAncestor already found', () => {
      // Simulate missing entry by removing from map in manager (we need to manipulate)
      manager.getEntry = vi.fn().mockImplementation((id: string) => {
        if (id === '2') return undefined;
        const e = entries.find(e => e.id === id);
        return e || undefined;
      });
      const result = collectEntriesForBranchSummary(manager, '4', '3');
      // 4 -> parent 2 (missing) -> break
      expect(result.entries.map(e => e.id)).toEqual(['4']);
      // commonAncestorId determined before walk, still '2'
      expect(result.commonAncestorId).toBe('2');
    });
  });
});
