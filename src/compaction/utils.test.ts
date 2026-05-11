// SPDX-License-Identifier: Apache-2.0
/**
 * Unit tests for compaction utils.
 */

import { describe, it, expect } from 'vitest';
import {
  createFileOps,
  extractFileOpsFromMessage,
  computeFileLists,
  formatFileOperations,
  getMessageFromEntry,
  serializeTurn,
  extractTextContent,
  estimateTokens,
  calculateContextTokens,
  serializeConversation,
} from './utils';
import type { ConversationTurn } from '../agent/types';
import type { SessionEntry } from '../session/session-manager';

// Helper to create a message with tool calls
function createMessageWithToolCalls(toolCalls: Array<{ id?: string; name: string; arguments: Record<string, any> }>) {
  const enriched = toolCalls.map((tc, idx) => ({
    id: tc.id ?? `call-${idx}`,
    name: tc.name,
    arguments: tc.arguments,
  }));
  return {
    role: 'assistant',
    content: [],
    toolCalls: enriched,
    timestamp: Date.now(),
  } as any; // cast for test simplicity
}

// Helper to create a session message entry
function createSessionMessageEntry(turn: ConversationTurn): SessionEntry {
  return {
    type: 'message',
    id: 'msg-' + Math.random().toString(36).slice(2),
    timestamp: new Date().toISOString(),
    parentId: null,
    message: turn,
  } as any;
}

// Helper to create compaction entry
function createCompactionEntry(summary: string, firstKeptEntryId: string): SessionEntry {
  return {
    type: 'compaction',
    id: 'compaction-' + Math.random().toString(36).slice(2),
    timestamp: new Date().toISOString(),
    parentId: null,
    summary,
    firstKeptEntryId,
    tokensBefore: 50000,
  };
}

// Helper to create branch summary entry
function createBranchSummaryEntry(summary: string, fromId: string): SessionEntry {
  return {
    type: 'branch_summary',
    id: 'branch-' + Math.random().toString(36).slice(2),
    timestamp: new Date().toISOString(),
    parentId: null,
    summary,
    fromId,
  };
}

// Helper to create custom message entry
function createCustomMessageEntry(content: string, customType: string): SessionEntry {
  return {
    type: 'custom_message', // matches session entry type
    id: 'custom-' + Math.random().toString(36).slice(2),
    timestamp: new Date().toISOString(),
    parentId: null,
    content,
    customType,
    display: true,
  } as any; // minimal shape for test
}

describe('Compaction Utils', () => {
  describe('createFileOps', () => {
    it('should create empty FileOperations', () => {
      const ops = createFileOps();
      expect(ops.read).toBeInstanceOf(Set);
      expect(ops.edited).toBeInstanceOf(Set);
      expect(ops.read.size).toBe(0);
      expect(ops.edited.size).toBe(0);
    });
  });

  describe('extractFileOpsFromMessage', () => {
    it('should extract read operations from read tool', () => {
      const fileOps = createFileOps();
      const message = createMessageWithToolCalls([
        { name: 'read', arguments: { path: '/path/to/file.txt' } },
      ]);
      extractFileOpsFromMessage(message, fileOps);
      expect(fileOps.read.has('/path/to/file.txt')).toBe(true);
      expect(fileOps.edited.size).toBe(0);
    });

    it('should extract read operations from find tool with paths array', () => {
      const fileOps = createFileOps();
      const message = createMessageWithToolCalls([
        { name: 'find', arguments: { paths: ['/dir1', '/dir2'] } },
      ]);
      extractFileOpsFromMessage(message, fileOps);
      expect(fileOps.read.has('/dir1')).toBe(true);
      expect(fileOps.read.has('/dir2')).toBe(true);
    });

    it('should extract edit operations from edit tool', () => {
      const fileOps = createFileOps();
      const message = createMessageWithToolCalls([
        { name: 'edit', arguments: { path: '/path/to/file.txt', oldString: 'old', newString: 'new' } },
      ]);
      extractFileOpsFromMessage(message, fileOps);
      expect(fileOps.edited.has('/path/to/file.txt')).toBe(true);
      expect(fileOps.read.size).toBe(0);
    });

    it('should extract multiple operations from a message', () => {
      const fileOps = createFileOps();
      const message = createMessageWithToolCalls([
        { name: 'read', arguments: { path: '/a.txt' } },
        { name: 'write', arguments: { path: '/b.txt', content: 'hello' } },
        { name: 'grep', arguments: { path: '/c.txt', pattern: 'foo' } },
      ]);
      extractFileOpsFromMessage(message, fileOps);
      expect(fileOps.read.has('/a.txt')).toBe(true);
      expect(fileOps.read.has('/c.txt')).toBe(true);
      expect(fileOps.edited.has('/b.txt')).toBe(true);
    });

    it('should not extract if no toolCalls', () => {
      const fileOps = createFileOps();
      const message = { role: 'user', content: 'hello', timestamp: Date.now() };
      extractFileOpsFromMessage(message, fileOps);
      expect(fileOps.read.size).toBe(0);
      expect(fileOps.edited.size).toBe(0);
    });
  });

  describe('computeFileLists', () => {
    it('should compute sorted file lists', () => {
      const ops = createFileOps();
      ops.read.add('/z.txt');
      ops.read.add('/a.txt');
      ops.read.add('/m.txt');
      ops.edited.add('/b.txt');
      ops.edited.add('/a.txt');

      const { readFiles, modifiedFiles } = computeFileLists(ops);
      expect(readFiles).toEqual(['/a.txt', '/m.txt', '/z.txt']);
      expect(modifiedFiles).toEqual(['/a.txt', '/b.txt']);
    });

    it('should handle empty', () => {
      const ops = createFileOps();
      const { readFiles, modifiedFiles } = computeFileLists(ops);
      expect(readFiles).toEqual([]);
      expect(modifiedFiles).toEqual([]);
    });
  });

  describe('formatFileOperations', () => {
    it('should format file operations text', () => {
      const ops = createFileOps();
      ops.read.add('/a.txt');
      ops.read.add('/b.txt');
      ops.edited.add('/c.txt');
      const text = formatFileOperations(ops);
      expect(text).toContain('Read files (2)');
      expect(text).toContain('/a.txt');
      expect(text).toContain('/b.txt');
      expect(text).toContain('Modified files (1)');
      expect(text).toContain('/c.txt');
    });

    it('should handle no operations', () => {
      const ops = createFileOps();
      const text = formatFileOperations(ops);
      expect(text).toBe('');
    });

    it('should truncate long lists', () => {
      const ops = createFileOps();
      for (let i = 0; i < 20; i++) {
        ops.read.add(`/file${i}.txt`);
      }
      const text = formatFileOperations(ops);
      expect(text).toContain('...');
    });
  });

  describe('extractTextContent', () => {
    it('should extract text from text blocks', () => {
      const content = [
        { type: 'text', text: 'Hello' },
        { type: 'text', text: 'World' },
      ];
      expect(extractTextContent(content)).toBe('Hello World');
    });

    it('should handle thinking blocks', () => {
      const content = [
        { type: 'thinking', thinking: 'I am thinking' },
        { type: 'text', text: 'Response' },
      ];
      expect(extractTextContent(content)).toBe('[Thinking: I am thinking] Response');
    });

    it('should handle toolCall blocks', () => {
      const content = [
        { type: 'toolCall', name: 'bash', arguments: { cmd: 'ls' } },
      ];
      const result = extractTextContent(content);
      expect(result).toContain('[Tool Call: bash');
      expect(result).toContain('ls');
    });

    it('should ignore unknown types', () => {
      const content = [
        { type: 'image', data: 'abc', mimeType: 'png' } as any,
        { type: 'text', text: 'text' },
      ];
      expect(extractTextContent(content)).toBe('text');
    });
  });

  describe('serializeTurn', () => {
    it('should serialize user turn', () => {
      const turn: ConversationTurn = {
        role: 'user',
        content: [{ type: 'text', text: 'Hello' }],
        timestamp: Date.now(),
      };
      expect(serializeTurn(turn)).toBe('USER: Hello');
    });

    it('should serialize assistant turn with tool calls', () => {
      const turn: ConversationTurn = {
        role: 'assistant',
        content: [
          { type: 'text', text: 'I will run a command' },
          { type: 'toolCall', id: 'call1', name: 'bash', arguments: { cmd: 'ls' } },
        ],
        timestamp: Date.now(),
      };
      const s = serializeTurn(turn);
      expect(s).toContain('ASSISTANT:');
      expect(s).toContain('I will run a command');
      expect(s).toContain('[Tool Call:');
    });

    it('should serialize tool turn', () => {
      const turn: ConversationTurn = {
        role: 'tool',
        toolCallId: 'call1',
        toolName: 'bash',
        content: [{ type: 'text', text: 'output' }],
        isError: false,
        timestamp: Date.now(),
      };
      expect(serializeTurn(turn)).toBe('TOOL: output');
    });
  });

  describe('estimateTokens', () => {
    it('should estimate tokens by dividing length by 4', () => {
      expect(estimateTokens('')).toBe(0);
      expect(estimateTokens('abcd')).toBe(1);
      expect(estimateTokens('abcdefgh')).toBe(2);
    });
  });

  describe('calculateContextTokens', () => {
    it('should calculate tokens for message entries', () => {
      const entries: SessionEntry[] = [
        {
          type: 'message',
          id: 'm1',
          timestamp: new Date().toISOString(),
          parentId: null,
          message: { role: 'user', content: [{ type: 'text', text: 'Hello' }], timestamp: Date.now() },
        },
        {
          type: 'message',
          id: 'm2',
          timestamp: new Date().toISOString(),
          parentId: null,
          message: { role: 'assistant', content: [{ type: 'text', text: 'Hi there' }], timestamp: Date.now() },
        },
      ];
      const tokens = calculateContextTokens(entries);
      expect(tokens).toBeGreaterThan(0);
    });

    it('should include compaction summary tokens', () => {
      const entries: SessionEntry[] = [
        createCompactionEntry('This is a summary', 'kept1'),
      ];
      const tokens = calculateContextTokens(entries);
      expect(tokens).toBe(estimateTokens('This is a summary'));
    });

    it('should include branch summary tokens', () => {
      const entries: SessionEntry[] = [
        createBranchSummaryEntry('Branch summary text', 'from1'),
      ];
      const tokens = calculateContextTokens(entries);
      expect(tokens).toBe(estimateTokens('Branch summary text'));
    });

    it('should include custom message tokens', () => {
      const entries: SessionEntry[] = [
        createCustomMessageEntry('Custom content', 'mytype'),
      ];
      const tokens = calculateContextTokens(entries);
      expect(tokens).toBe(estimateTokens('Custom content'));
    });
  });

  describe('getMessageFromEntry', () => {
    it('should convert message entry to message-like', () => {
      const turn: ConversationTurn = {
        role: 'user',
        content: [{ type: 'text', text: 'Query' }],
        timestamp: Date.now(),
      };
      const entry: SessionEntry = {
        type: 'message',
        id: 'm1',
        timestamp: new Date().toISOString(),
        parentId: null,
        message: turn,
      } as any;
      const msg = getMessageFromEntry(entry);
      expect(msg).toEqual(turn);
    });

    it('should convert custom_message to user-like message', () => {
      const entry: SessionEntry = createCustomMessageEntry('Custom text', 'info');
      const msg = getMessageFromEntry(entry);
      expect(msg.role).toBe('user');
      // Content should be normalized to array of TextContent
      expect(msg.content).toEqual([{ type: 'text', text: 'Custom text' }]);
    });

    it('should convert branch_summary to user message with prefix', () => {
      const entry = createBranchSummaryEntry('Summary text', 'id1');
      const msg = getMessageFromEntry(entry);
      expect(msg.role).toBe('user');
      const text = extractTextContent(msg.content as any[]);
      expect(text).toContain('Summary text');
      expect(text).toContain('Branch');
    });

    it('should convert compaction with includeCompaction', () => {
      const entry = createCompactionEntry('Compacted', 'kept1');
      const msg = getMessageFromEntry(entry, { includeCompaction: true });
      expect(msg).toBeDefined();
      expect(msg.role).toBe('user');
    });

    it('should skip compaction if not includeCompaction', () => {
      const entry = createCompactionEntry('Compacted', 'kept1');
      const msg = getMessageFromEntry(entry, { includeCompaction: false });
      expect(msg).toBeUndefined();
    });

    it('should return undefined for unknown entry type', () => {
      const entry: SessionEntry = {
        type: 'unknown' as any,
        id: 'x',
        timestamp: new Date().toISOString(),
        parentId: null,
      } as any;
      expect(getMessageFromEntry(entry)).toBeUndefined();
    });
  });

  describe('serializeConversation', () => {
    it('should serialize list of entries to string', () => {
      const entries: SessionEntry[] = [
        {
          type: 'message',
          id: 'm1',
          timestamp: new Date().toISOString(),
          parentId: null,
          message: { role: 'user', content: [{ type: 'text', text: 'Hello' }], timestamp: Date.now() },
        },
        {
          type: 'message',
          id: 'm2',
          timestamp: new Date().toISOString(),
          parentId: null,
          message: { role: 'assistant', content: [{ type: 'text', text: 'Hi' }], timestamp: Date.now() },
        },
      ];
      const conv = serializeConversation(entries);
      expect(conv).toContain('USER: Hello');
      expect(conv).toContain('ASSISTANT: Hi');
    });

    it('should skip entries that return undefined from getMessageFromEntry', () => {
      const entries: SessionEntry[] = [
        createCompactionEntry('Summary', 'k1'), // default includeCompaction false
        createCustomMessageEntry('Custom', 'type'),
      ];
      const conv = serializeConversation(entries);
      expect(conv).toContain('Custom');
      expect(conv).not.toContain('Summary');
    });

    it('should include compaction if requested', () => {
      const entries: SessionEntry[] = [
        createCompactionEntry('Summary', 'k1'),
      ];
      const conv = serializeConversation(entries, { includeCompaction: true });
      expect(conv).toContain('Summary');
    });
  });
});
