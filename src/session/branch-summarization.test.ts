// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect } from 'vitest';
import {
  createFileOps,
  extractFileOpsFromMessage,
  computeFileLists,
  formatFileOperations,
  estimateTokens,
  getMessageFromEntry,
  prepareBranchEntries,
} from './branch-summarization.js';
import type { AgentMessage, SessionEntry } from './agent-types.js';

describe('branch-summarization', () => {
  describe('createFileOps', () => {
    it('returns FileOperations with empty Sets', () => {
      const ops = createFileOps();
      expect(ops.read).toBeInstanceOf(Set);
      expect(ops.written).toBeInstanceOf(Set);
      expect(ops.edited).toBeInstanceOf(Set);
      expect(ops.read.size).toBe(0);
      expect(ops.written.size).toBe(0);
      expect(ops.edited.size).toBe(0);
    });
  });

  describe('extractFileOpsFromMessage', () => {
    it('populates fileOps from toolCall blocks', () => {
      const fileOps = createFileOps();
      const message: any = {
        role: 'assistant',
        content: [
          { type: 'toolCall', name: 'read', arguments: { path: '/a.txt' } },
          { type: 'toolCall', name: 'write', arguments: { path: '/b.txt' } },
          { type: 'toolCall', name: 'edit', arguments: { path: '/c.txt' } },
        ],
      };
      extractFileOpsFromMessage(message, fileOps);
      expect(fileOps.read.has('/a.txt')).toBe(true);
      expect(fileOps.written.has('/b.txt')).toBe(true);
      expect(fileOps.edited.has('/c.txt')).toBe(true);
    });

    it('ignores non-assistant messages', () => {
      const fileOps = createFileOps();
      const message: any = {
        role: 'user',
        content: [
          { type: 'toolCall', name: 'read', arguments: { path: '/x.txt' } },
        ],
      };
      extractFileOpsFromMessage(message, fileOps);
      expect(fileOps.read.size).toBe(0);
    });

    it('handles empty content', () => {
      const fileOps = createFileOps();
      const message: any = { role: 'assistant', content: [] };
      extractFileOpsFromMessage(message, fileOps);
      expect(fileOps.read.size).toBe(0);
      expect(fileOps.written.size).toBe(0);
      expect(fileOps.edited.size).toBe(0);
    });
  });

  describe('computeFileLists', () => {
    it('computes arrays from Sets', () => {
      const ops = createFileOps();
      ops.read.add('r1');
      ops.read.add('r2');
      ops.written.add('w1');
      const result = computeFileLists(ops);
      expect(result.readFiles).toEqual(expect.arrayContaining(['r1', 'r2']));
      expect(result.modifiedFiles).toEqual(['w1']);
    });
  });

  describe('formatFileOperations', () => {
    it('formats read and modified files', () => {
      const formatted = formatFileOperations(['a.txt', 'b.txt'], ['c.txt']);
      expect(formatted).toContain('<read-files>');
      expect(formatted).toContain('a.txt');
      expect(formatted).toContain('b.txt');
      expect(formatted).toContain('<modified-files>');
      expect(formatted).toContain('c.txt');
    });

    it('handles empty arrays', () => {
      const formatted = formatFileOperations([], []);
      expect(formatted).toBe('');
    });
  });

  describe('estimateTokens', () => {
    it('returns token count (stub implementation)', () => {
      const message: any = { content: 'Hello world' };
      const tokens = estimateTokens(message);
      // Stub returns 0 for any message
      expect(tokens).toBe(0);
    });

    it('returns 0 for empty content', () => {
      const message: any = { content: '' };
      const tokens = estimateTokens(message);
      expect(tokens).toBe(0);
    });
  });

  describe('getMessageFromEntry', () => {
    it('extracts message from entry', () => {
      const entry: SessionEntry = {
        id: 'e1',
        type: 'message',
        message: { role: 'assistant', content: 'Hi' },
        timestamp: Date.now(),
      };
      const msg = getMessageFromEntry(entry);
      expect(msg).toEqual({ role: 'assistant', content: 'Hi' });
    });

    it('returns undefined for non-message entry', () => {
      const entry: SessionEntry = {
        id: 'e2',
        type: 'branch_summary',
        timestamp: Date.now(),
      } as any;
      const msg = getMessageFromEntry(entry);
      expect(msg).toBeUndefined();
    });
  });

  // prepareBranchEntries might be complex; test simple case
  describe('prepareBranchEntries', () => {
    it('collects messages in reverse order', () => {
      const entries: SessionEntry[] = [
        {
          id: '1',
          type: 'message',
          message: { role: 'user', content: 'Hello' },
          timestamp: Date.now(),
        },
        {
          id: '2',
          type: 'message',
          message: { role: 'assistant', content: 'Hi there' },
          timestamp: Date.now(),
        },
      ];
      const result = prepareBranchEntries(entries, 0);
      expect(result.messages).toHaveLength(2);
      // Entries reversed: first in array becomes oldest, so after walking from newest to oldest, order should be [user, assistant]
      expect(result.messages[0].role).toBe('user');
      expect(result.messages[1].role).toBe('assistant');
      expect(result.totalTokens).toBe(0); // estimateTokens stub returns 0
    });

    it('handles empty entries', () => {
      const result = prepareBranchEntries([], 0);
      expect(result.messages).toEqual([]);
      expect(result.totalTokens).toBe(0);
    });
  });
});
