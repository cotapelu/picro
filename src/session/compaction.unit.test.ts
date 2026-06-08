import { describe, it, expect } from 'vitest';
import {
  estimateTokens,
  estimateContextTokens,
  findCutPoint,
  shouldCompact,
  getAssistantUsage,
  estimateContextUsage,
  createFileOps,
  extractFileOpsFromMessage,
  computeFileLists,
  formatFileOperations,
  prepareCompaction,
  compactSession,
  compact,
} from './compaction.js';
import type { AgentMessage, AssistantMessage } from './agent-types.js';
import * as llm from '../llm/index.js';

describe('Compaction unit', () => {
  describe('estimateTokens', () => {
    it('handles user message with string content', () => {
      const msg: AgentMessage = { role: 'user', content: 'Hello world' };
      expect(estimateTokens(msg)).toBe(3); // ~11/4
    });

    it('handles user message with array content', () => {
      const msg: AgentMessage = {
        role: 'user',
        content: [{ type: 'text', text: 'Line1\nLine2' }],
      };
      expect(estimateTokens(msg)).toBe(3); // ~13/4
    });

    it('handles assistant message with text, thinking, and toolCall', () => {
      const msg: AgentMessage = {
        role: 'assistant',
        content: [
          { type: 'text', text: 'Answer' },
          { type: 'thinking', thinking: 'Thought process' },
          { type: 'toolCall', name: 'read', arguments: { path: '/a' } },
        ],
      };
      // 'Answer' (6) + 'Thought process' (14) + 'read' + JSON(arguments) ≈ (6+14+4+~10)/4
      expect(estimateTokens(msg)).toBeGreaterThan(0);
    });

    it('handles tool message', () => {
      const msg: AgentMessage = { role: 'tool', content: 'Result' };
      expect(estimateTokens(msg)).toBe(2); // ~6/4 => 2
    });

    it('handles bashExecution', () => {
      const msg: any = { role: 'bashExecution', command: 'ls', output: 'file' };
      expect(estimateTokens(msg)).toBeGreaterThan(0);
    });

    it('handles branchSummary', () => {
      const msg: any = { role: 'branchSummary', summary: 'Summary text' };
      expect(estimateTokens(msg)).toBeGreaterThan(0);
    });

    it('returns 0 for unknown roles', () => {
      const msg: AgentMessage = { role: 'unknown' as any, content: '' };
      expect(estimateTokens(msg)).toBe(0);
    });
  });

  describe('estimateContextTokens', () => {
    it('sums token estimates across messages', () => {
      const msgs: AgentMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: [{ type: 'text', text: 'Hi' }] },
      ];
      const total = estimateContextTokens(msgs);
      expect(total).toBeGreaterThan(0);
    });

    it('returns 0 for empty array', () => {
      expect(estimateContextTokens([])).toBe(0);
    });
  });

  describe('findCutPoint', () => {
    it('returns firstKeptIndex=0 when all tokens fit', () => {
      const msgs: AgentMessage[] = [{ role: 'user', content: 'Hi' }];
      const result = findCutPoint(msgs, 1000);
      expect(result.firstKeptIndex).toBe(0);
      expect(result.isSplitTurn).toBe(false);
    });

    it('finds cut point when tokens exceed threshold', () => {
      const msgs: AgentMessage[] = [
        { role: 'user', content: 'x'.repeat(100) },
        { role: 'assistant', content: [{ type: 'text', text: 'y'.repeat(100) }] },
      ];
      const result = findCutPoint(msgs, 50); // threshold triggers cut
      expect(result.firstKeptIndex).toBeGreaterThanOrEqual(0);
      expect(typeof result.isSplitTurn).toBe('boolean');
    });

    it('handles empty messages', () => {
      const result = findCutPoint([], 100);
      expect(result.firstKeptIndex).toBe(0);
      expect(result.isSplitTurn).toBe(false);
    });
  });

  describe('shouldCompact', () => {
    it('returns false when disabled', () => {
      const settings = { enabled: false, reserveTokens: 1000, keepRecentTokens: 2000 };
      expect(shouldCompact(1500, 2000, settings)).toBe(false);
    });

    it('returns true when tokens exceed window minus reserve', () => {
      const settings = { enabled: true, reserveTokens: 1000, keepRecentTokens: 2000 };
      // threshold = contextWindow - reserveTokens = 1000
      // 1900 > 1000 → should compact
      expect(shouldCompact(1900, 2000, settings)).toBe(true);
      expect(shouldCompact(2000, 2000, settings)).toBe(true);
    });

    it('returns false when tokens within safe zone', () => {
      const settings = { enabled: true, reserveTokens: 1000, keepRecentTokens: 2000 };
      // 900 <= 1000 → should NOT compact
      expect(shouldCompact(900, 2000, settings)).toBe(false);
    });
  });

  describe('getAssistantUsage', () => {
    it('returns usage for assistant with usage', () => {
      const msg: AssistantMessage = {
        role: 'assistant',
        content: [{ type: 'text', text: 'OK' }],
        usage: { total: 100 },
      };
      expect(getAssistantUsage(msg)).toEqual({ total: 100 });
    });

    it('returns undefined for non-assistant', () => {
      const msg: AgentMessage = { role: 'user', content: 'Hi' };
      expect(getAssistantUsage(msg)).toBeUndefined();
    });

    it('returns undefined when assistant message has no usage', () => {
      const msg: AgentMessage = { role: 'assistant', content: [{ type: 'text', text: 'OK' }] };
      expect(getAssistantUsage(msg as AssistantMessage)).toBeUndefined();
    });

    it('returns undefined for aborted assistant', () => {
      const msg: AssistantMessage = {
        role: 'assistant',
        content: [{ type: 'text', text: 'OK' }],
        stopReason: 'aborted',
        usage: { total: 100 },
      };
      expect(getAssistantUsage(msg)).toBeUndefined();
    });

    it('returns undefined for error assistant', () => {
      const msg: AssistantMessage = {
        role: 'assistant',
        content: [{ type: 'text', text: 'OK' }],
        stopReason: 'error',
        usage: { total: 100 },
      };
      expect(getAssistantUsage(msg)).toBeUndefined();
    });
  });

  describe('estimateContextUsage', () => {
    it('uses last usage token count when available', () => {
      const msgs: AgentMessage[] = [
        { role: 'user', content: 'Hi' },
        {
          role: 'assistant',
          content: [{ type: 'text', text: 'Hello' }],
          usage: { total: 200 },
        } as AssistantMessage,
        { role: 'user', content: 'Bye' },
      ];
      const result = estimateContextUsage(msgs);
      expect(result.tokens).toBeGreaterThan(200); // usage + trailing
      expect(result.usageTokens).toBe(200);
      expect(result.trailingTokens).toBeGreaterThan(0);
      expect(result.lastUsageIndex).toBe(1);
    });

    it('falls back to full estimation when no usage', () => {
      const msgs: AgentMessage[] = [
        { role: 'user', content: 'Hi' },
        { role: 'assistant', content: [{ type: 'text', text: 'Hello' }] },
      ];
      const result = estimateContextUsage(msgs);
      expect(result.usageTokens).toBe(0);
      expect(result.tokens).toBeGreaterThan(0);
      expect(result.lastUsageIndex).toBeNull();
    });

    it('handles empty array', () => {
      const result = estimateContextUsage([]);
      expect(result.tokens).toBe(0);
      expect(result.usageTokens).toBe(0);
      expect(result.trailingTokens).toBe(0);
      expect(result.lastUsageIndex).toBeNull();
    });
  });

  describe('createFileOps', () => {
    it('creates FileOperations with empty sets', () => {
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
    it('extracts read, written, edited from toolCalls', () => {
      const ops = createFileOps();
      const msg: AgentMessage = {
        role: 'assistant',
        content: [
          { type: 'toolCall', name: 'read', arguments: { path: '/a' } },
          { type: 'toolCall', name: 'write', arguments: { path: '/b' } },
          { type: 'toolCall', name: 'edit', arguments: { path: '/c' } },
        ],
      };
      extractFileOpsFromMessage(msg, ops);
      expect(ops.read.has('/a')).toBe(true);
      expect(ops.written.has('/b')).toBe(true);
      expect(ops.edited.has('/c')).toBe(true);
    });

    it('skips non-assistant messages', () => {
      const ops = createFileOps();
      const msg: AgentMessage = { role: 'user', content: 'Hi' };
      extractFileOpsFromMessage(msg, ops);
      expect(ops.read.size).toBe(0);
    });

    it('ignores toolCalls without path', () => {
      const ops = createFileOps();
      const msg: AgentMessage = {
        role: 'assistant',
        content: [{ type: 'toolCall', name: 'read', arguments: {} }],
      };
      extractFileOpsFromMessage(msg, ops);
      expect(ops.read.size).toBe(0);
    });
  });

  describe('computeFileLists', () => {
    it('separates read-only and modified files', () => {
      const ops = {
        read: new Set(['/a', '/b']),
        written: new Set(['/b', '/c']),
        edited: new Set(['/b', '/d']),
      } as any;
      const result = computeFileLists(ops);
      // modified = written+edited = /b, /c, /d
      // readOnly = read - modified = /a
      expect(result.modifiedFiles.sort()).toEqual(['/b', '/c', '/d']);
      expect(result.readFiles).toEqual(['/a']);
    });

    it('returns empty arrays when no operations', () => {
      const ops = { read: new Set(), written: new Set(), edited: new Set() } as any;
      const result = computeFileLists(ops);
      expect(result.readFiles).toEqual([]);
      expect(result.modifiedFiles).toEqual([]);
    });
  });

  describe('formatFileOperations', () => {
    it('formats read and modified sections with tags', () => {
      const read = ['/a', '/b'];
      const modified = ['/c'];
      const text = formatFileOperations(read, modified);
      expect(text).toContain('<read-files>');
      expect(text).toContain('</read-files>');
      expect(text).toContain('<modified-files>');
      expect(text).toContain('</modified-files>');
      expect(text).toContain('/a');
      expect(text).toContain('/c');
    });

    it('returns empty string when no files', () => {
      expect(formatFileOperations([], [])).toBe('');
    });
  });

  describe('prepareCompaction', () => {
    it('returns null when no valid messages', () => {
      const entries = [{ id: 'e1', type: 'branch_summary', summary: 'x' } as any];
      const settings = { enabled: true, reserveTokens: 1000, keepRecentTokens: 2000 };
      expect(prepareCompaction(entries, settings)).toBeNull();
    });

    it('keeps all entries when keepRecentTokens large', () => {
      const longContent = 'x'.repeat(400);
      const entries = [
        { id: 'e0', type: 'message', message: { role: 'user', content: longContent } } as any,
        { id: 'e1', type: 'message', message: { role: 'user', content: longContent } } as any,
      ];
      const settings = { enabled: true, reserveTokens: 1000, keepRecentTokens: 10000 };
      const prep = prepareCompaction(entries, settings);
      expect(prep).not.toBeNull();
      expect(prep!.firstKeptEntryId).toBe('e0');
      expect(prep!.messagesToSummarize).toHaveLength(0);
      expect(prep!.isSplitTurn).toBe(false);
    });

    it('identifies correct cut point and summarization set', () => {
      const longContent = 'x'.repeat(400); // 100 tokens
      const shortAssistant = { role: 'assistant', content: [{ type: 'toolCall', name: 'write', arguments: { path: '/tmp' } }] } as any;
      const entries = [
        { id: 'e0', type: 'message', message: { role: 'user', content: longContent } } as any,
        { id: 'e1', type: 'compaction', details: { readFiles: [], modifiedFiles: [] } } as any,
        { id: 'e2', type: 'message', message: shortAssistant } as any,
        { id: 'e3', type: 'message', message: shortAssistant } as any,
        { id: 'e4', type: 'message', message: { role: 'user', content: longContent } } as any,
      ];
      const settings = { enabled: true, reserveTokens: 1000, keepRecentTokens: 107 };
      const prep = prepareCompaction(entries, settings);
      expect(prep).not.toBeNull();
      expect(prep!.firstKeptEntryId).toBe('e2');
      expect(prep!.messagesToSummarize).toHaveLength(1);
      expect(prep!.messagesToSummarize[0]).toBe(entries[0].message);
      expect(prep!.isSplitTurn).toBe(true);
    });

    it('captures previous summary from nearest prior compaction entry', () => {
      const longContent = 'x'.repeat(400);
      const entries = [
        { id: 'e0', type: 'message', message: { role: 'user', content: longContent } } as any,
        { id: 'e1', type: 'compaction', summary: 'Prev summary', details: { readFiles: [], modifiedFiles: [] } } as any,
        { id: 'e2', type: 'message', message: { role: 'user', content: longContent } } as any,
        { id: 'e3', type: 'message', message: { role: 'user', content: longContent } } as any,
      ];
      const settings = { enabled: true, reserveTokens: 1000, keepRecentTokens: 150 };
      const prep = prepareCompaction(entries, settings);
      expect(prep).not.toBeNull();
      expect(prep!.firstKeptEntryId).toBe('e2');
      expect(prep!.previousSummary).toBe('Prev summary');
    });

    it('aggregates file operations from messages and prior compaction entries', () => {
      const longContent = 'x'.repeat(400);
      const msgRead = { role: 'assistant', content: [{ type: 'toolCall', name: 'read', arguments: { path: '/a' } }] } as any;
      const msgWrite = { role: 'assistant', content: [{ type: 'toolCall', name: 'write', arguments: { path: '/b' } }] } as any;
      const msgEdit = { role: 'assistant', content: [{ type: 'toolCall', name: 'edit', arguments: { path: '/c' } }] } as any;
      const entries = [
        { id: 'e0', type: 'message', message: msgRead } as any,
        { id: 'e1', type: 'compaction', summary: 'C', details: { readFiles: ['/c'], modifiedFiles: ['/d'] } } as any,
        { id: 'e2', type: 'message', message: msgWrite } as any,
        { id: 'e3', type: 'message', message: msgEdit } as any,
        { id: 'e4', type: 'message', message: { role: 'user', content: longContent } } as any,
      ];
      const settings = { enabled: true, reserveTokens: 1000, keepRecentTokens: 100 };
      const prep = prepareCompaction(entries, settings);
      expect(prep).not.toBeNull();
      expect(prep!.firstKeptEntryId).toBe('e4');
      const ops = prep!.fileOps;
      expect(ops.read.has('/a')).toBe(true);
      expect(ops.read.has('/c')).toBe(true);
      expect(ops.written.has('/b')).toBe(true);
      expect(ops.edited.has('/c')).toBe(true);
      expect(ops.written.has('/d')).toBe(true);
      expect(ops.edited.has('/d')).toBe(true);
    });
  });

  describe('compactSession', () => {
    it('returns original messages when context under threshold', async () => {
      const msgs: AgentMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: [{ type: 'text', text: 'Hi' }] },
      ];
      const settings = { enabled: true, reserveTokens: 1000, keepRecentTokens: 2000 };
      const result = await compactSession(msgs, settings);
      expect(result.keptMessages).toBe(msgs);
      expect(result.discardedMessages).toEqual([]);
      expect(result.summary).toBe('');
    });

    it('handles empty messages', async () => {
      const result = await compactSession([], { enabled: true, reserveTokens: 1000, keepRecentTokens: 2000 });
      expect(result.keptMessages).toEqual([]);
      expect(result.discardedMessages).toEqual([]);
      expect(result.summary).toBe('');
    });
  });

  describe('compact (LLM summarization)', () => {
    const model = { name: 'test-model' } as any;
    const apiKey = 'test-key';

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('calls LLM with correct prompt and returns summary', async () => {
      const spy = vi.spyOn(llm, 'complete').mockResolvedValue({ content: 'LLM Summary' });

      const prep = {
        firstKeptEntryId: 'entry-1',
        messagesToSummarize: [
          { role: 'user', content: [{ type: 'text', text: 'Hello' }] },
          { role: 'assistant', content: [{ type: 'text', text: 'Hi' }] },
        ],
        turnPrefixMessages: [],
        isSplitTurn: false,
        tokensBefore: 500,
        previousSummary: undefined,
        fileOps: (() => {
          const ops = createFileOps();
          ops.read.add('/a');
          ops.written.add('/b');
          ops.edited.add('/c');
          return ops;
        })(),
        settings: { enabled: true, reserveTokens: 1000, keepRecentTokens: 2000 } as any,
      };

      const result = await compact(prep, model, apiKey);

      expect(spy).toHaveBeenCalledTimes(1);
      const [, context] = spy.mock.calls[0];
      // System prompt should contain file ops
      expect(context.systemPrompt).toContain('/a');
      expect(context.systemPrompt).toContain('/b');
      expect(context.systemPrompt).toContain('/c');
      // User prompt contains serialized conversation
      const userMsgContent = context.messages[0].content;
      expect(userMsgContent).toContain('Hello');
      expect(userMsgContent).toContain('Hi');
      // Result fields
      expect(result.summary).toBe('LLM Summary');
      expect(result.firstKeptEntryId).toBe('entry-1');
      expect(result.tokensBefore).toBe(500);
      expect(result.details?.readFiles).toEqual(['/a']);
      expect(result.details?.modifiedFiles).toEqual(['/b', '/c']);
    });

    it('falls back to stub summary when LLM throws', async () => {
      vi.spyOn(llm, 'complete').mockRejectedValue(new Error('LLM error'));

      const prep = {
        firstKeptEntryId: 'entry-2',
        messagesToSummarize: [{ role: 'user', content: [{ type: 'text', text: 'Test' }] }],
        turnPrefixMessages: [],
        isSplitTurn: false,
        tokensBefore: 100,
        previousSummary: undefined,
        fileOps: createFileOps(),
        settings: { enabled: true, reserveTokens: 1000, keepRecentTokens: 2000 } as any,
      };

      const result = await compact(prep, {}, '');
      expect(result.summary).toBe('[Stub] Summarized 1 messages');
    });

    it('returns [No messages to summarize] when no messages', async () => {
      vi.spyOn(llm, 'complete').mockRejectedValue(new Error('LLM error'));

      const prep = {
        firstKeptEntryId: 'entry-3',
        messagesToSummarize: [],
        turnPrefixMessages: [],
        isSplitTurn: false,
        tokensBefore: 0,
        previousSummary: undefined,
        fileOps: createFileOps(),
        settings: { enabled: true, reserveTokens: 1000, keepRecentTokens: 2000 } as any,
      };

      const result = await compact(prep, {}, '');
      expect(result.summary).toBe('[No messages to summarize]');
    });
  });

  // NOTE: serializeConversation is internal; tested indirectly via other functions
});
