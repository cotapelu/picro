import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { compact, prepareCompaction, CompactionPreparation } from './compaction.js';
import type { SessionEntry, AgentMessage } from './agent-types.js';
import type { Model } from '../llm/index.js';

// Mock LLM complete
vi.mock('../llm/index.js', async () => {
  const actual = await vi.importActual('../llm/index.js');
  return {
    ...actual,
    complete: vi.fn(),
  };
});

describe('Compaction Summarization', () => {
  let mockModel: Model;
  let preparation: CompactionPreparation;

  const createEntry = (id: string, type: 'message', msg: AgentMessage): SessionEntry => ({
    id,
    type,
    message: msg,
    parentId: null,
    timestamp: Date.now(),
  });

  beforeEach(() => {
    mockModel = {
      id: 'test-model',
      name: 'Test',
      api: 'openai-completions',
      provider: 'openai',
      baseUrl: '',
      reasoning: false,
      input: ['text'],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 1000,
      maxTokens: 100,
    };
    vi.clearAllMocks();
  });

  it('returns stub summary when summarize disabled', async () => {
    const entries: SessionEntry[] = [];
    for (let i = 0; i < 10; i++) {
      const longText = 'x'.repeat(200);
      entries.push(createEntry(`e${i}`, 'message', {
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: [{ type: 'text', text: longText }],
        timestamp: Date.now(),
      }));
    }
    const settings = { enabled: true, reserveTokens: 100, keepRecentTokens: 100, summarize: false };
    preparation = prepareCompaction(entries, settings)!;

    const result = await compact(preparation, mockModel, 'fake-key');
    expect(result.summary).toMatch(/Compacted \d+ messages/);
  });

  it('calls LLM when summarize enabled and returns summary', async () => {
    const { complete } = await import('../llm/index.js');
    (complete as any).mockResolvedValue({
      content: [{ type: 'text', text: 'LLM generated summary' }],
    });

    // Create many messages to ensure some are cut
    const entries: SessionEntry[] = [];
    for (let i = 0; i < 10; i++) {
      const longText = 'x'.repeat(200); // ~50 tokens each
      entries.push(createEntry(`e${i}`, 'message', {
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: [{ type: 'text', text: longText }],
        timestamp: Date.now(),
      }));
    }
    const settings = { enabled: true, reserveTokens: 100, keepRecentTokens: 100, summarize: true };
    preparation = prepareCompaction(entries, settings)!;

    const result = await compact(preparation, mockModel, 'fake-key');

    expect(complete).toHaveBeenCalledTimes(1);
    expect(result.summary).toBe('LLM generated summary');
  });

  it('falls back to stub if LLM call fails', async () => {
    const { complete } = await import('../llm/index.js');
    (complete as any).mockRejectedValueOnce(new Error('LLM down'));

    const entries: SessionEntry[] = [];
    for (let i = 0; i < 10; i++) {
      const longText = 'y'.repeat(200);
      entries.push(createEntry(`e${i}`, 'message', {
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: [{ type: 'text', text: longText }],
        timestamp: Date.now(),
      }));
    }
    const settings = { enabled: true, reserveTokens: 100, keepRecentTokens: 100, summarize: true };
    preparation = prepareCompaction(entries, settings)!;

    const result = await compact(preparation, mockModel, 'fake-key');

    expect(result.summary).toContain('Stub');
  });
});
