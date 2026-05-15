import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the LLM module before importing compaction
vi.mock('../llm', async () => {
  const actual = await vi.importActual('../llm');
  return {
    ...actual,
    complete: vi.fn(),
  };
});

import { compact } from './compaction';
import type { CompactionPreparation } from './compaction';
import type { Model } from '../llm';
import { complete as llmComplete } from '../llm';

describe('compact (LLM summarization)', () => {
  const mockModel = {} as Model;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return LLM-generated summary', async () => {
    const userMsg = { role: 'user', content: [{ type: 'text', text: 'Hello' }], timestamp: Date.now() } as any;
    const assistantMsg = {
      role: 'assistant',
      content: [{ type: 'text', text: 'Hi' }],
      timestamp: Date.now(),
      usage: { input: 10, output: 5, totalTokens: 15, cost: { input: 0, output: 0, total: 0 } },
      stopReason: 'stop',
      api: 'test',
      provider: 'test',
      model: 'test',
    } as any;

    const prep: CompactionPreparation = {
      firstKeptEntryId: 'entry1',
      messagesToSummarize: [userMsg, assistantMsg],
      turnPrefixMessages: [],
      isSplitTurn: false,
      tokensBefore: 100,
      previousSummary: undefined,
      fileOps: { read: new Set(), written: new Set(), edited: new Set() },
      settings: { enabled: true, reserveTokens: 16384, keepRecentTokens: 20000 },
    };

    llmComplete.mockResolvedValue({ content: [{ text: 'Mock summary from LLM' }] });

    const result = await compact(prep, mockModel, 'fake-key');

    expect(result.summary).toBe('Mock summary from LLM');
    expect(llmComplete).toHaveBeenCalledWith(
      mockModel,
      expect.objectContaining({
        systemPrompt: expect.stringContaining('summarization assistant'),
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'user', content: expect.stringContaining('Hello') })
        ]),
      }),
      expect.objectContaining({ apiKey: 'fake-key' })
    );
  });

  it('should fallback to stub summary when LLM fails', async () => {
    const userMsg = { role: 'user', content: [{ type: 'text', text: 'Hello' }], timestamp: Date.now() } as any;

    const prep: CompactionPreparation = {
      firstKeptEntryId: 'entry1',
      messagesToSummarize: [userMsg],
      turnPrefixMessages: [],
      isSplitTurn: false,
      tokensBefore: 50,
      previousSummary: undefined,
      fileOps: { read: new Set(), written: new Set(), edited: new Set() },
      settings: { enabled: true, reserveTokens: 16384, keepRecentTokens: 20000 },
    };

    llmComplete.mockRejectedValue(new Error('LLM error'));

    const result = await compact(prep, {} as Model, 'key');

    expect(result.summary).toMatch(/Stub/);
    expect(result.summary).toContain('1 messages');
  });

  it('should include custom instructions in system prompt when provided', async () => {
    const prep = makePrep([{ role: 'user', content: [{ type: 'text', text: 'test' }], timestamp: Date.now() } as any]);
    const custom = 'Focus on technical details and code snippets';
    llmComplete.mockResolvedValue({ content: [{ text: 'Summary' }] });
    await compact(prep, mockModel, 'key', undefined, custom);

    const call = llmComplete.mock.calls[0];
    const context = call[1] as any;
    expect(context.systemPrompt).toContain(custom);
  });

  it('should pass reasoningEffort to LLM call when provided', async () => {
    const prep = makePrep([{ role: 'user', content: [{ type: 'text', text: 'test' }], timestamp: Date.now() } as any]);
    llmComplete.mockResolvedValue({ content: [{ text: 'Summary' }] });
    await compact(prep, mockModel, 'key', undefined, undefined, undefined, 'high');

    const call = llmComplete.mock.calls[0];
    const opts = call[2] as any;
    expect(opts.reasoningEffort).toBe('high');
  });
});

// Helper to create CompactionPreparation
function makePrep(messages: any[]): CompactionPreparation {
  return {
    firstKeptEntryId: 'entry1',
    messagesToSummarize: messages,
    turnPrefixMessages: [],
    isSplitTurn: false,
    tokensBefore: 50,
    previousSummary: undefined,
    fileOps: { read: new Set(), written: new Set(), edited: new Set() },
    settings: { enabled: true, reserveTokens: 16384, keepRecentTokens: 20000 },
  };
}
