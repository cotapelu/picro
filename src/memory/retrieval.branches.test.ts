// SPDX-License-Identifier: Apache-2.0
/**
 * Branch coverage tests for retrieval module.
 * Focus: MemoryScorer edge cases, MemoryRetriever filters.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryScorer, MemoryRetriever } from './retrieval.js';

describe('MemoryScorer - edge cases', () => {
  let scorer: MemoryScorer;
  const baseMemory = {
    content: 'edit file and modify configuration',
    metadata: { _action: 'edit_file', _project: 'test' },
    created_at: new Date().toISOString(),
    access_count: 0,
  };

  beforeEach(() => {
    scorer = new MemoryScorer();
  });

  it('returns 0 for empty query', () => {
    const score = scorer.score(baseMemory, '', 'test');
    expect(score).toBe(0);
  });

  it('returns 0 when query contains no matching words', () => {
    const score = scorer.score(baseMemory, 'nonexistent', 'test');
    expect(score).toBe(0);
  });

  it('returns 0 when query has only stop words (after ignoring digits)', () => {
    // The scorer removes digits; query with only digits becomes empty words
    const score = scorer.score(baseMemory, '123 456', 'test');
    expect(score).toBe(0);
  });

  it('applies action bonus when expected action matches memory meta', () => {
    const mem = { ...baseMemory, metadata: { _action: 'read_file', _project: 'test' } };
    const score = scorer.score(mem, 'read file', 'test');
    expect(score).toBeGreaterThan(0);
  });

  it('penalizes when memory project differs from current project', () => {
    const memOther = { ...baseMemory, metadata: { _action: 'edit_file', _project: 'other' } };
    const scoreOther = scorer.score(memOther, 'edit file', 'test');
    const memSame = { ...memOther, metadata: { ...memOther.metadata, _project: 'test' } };
    const scoreSame = scorer.score(memSame, 'edit file', 'test');
    expect(scoreOther).toBeLessThan(scoreSame);
  });
});

describe('MemoryRetriever - retrieve branches', () => {
  const retriever = new MemoryRetriever();
  const now = new Date().toISOString();

  // All memories share same project to isolate other filters
  const memories = [
    { content: 'first', metadata: { _project: 'common' } as any, created_at: now, access_count: 0 },
    { content: 'second', metadata: { _project: 'common' } as any, created_at: now, access_count: 0 },
    { content: 'third', metadata: { _project: 'common' } as any, created_at: now, access_count: 0 },
  ];

  it('filters by project when option provided', () => {
    // Provide currentProject that is different from filtered project to ensure filter is used
    const results = retriever.retrieve(memories, { project: 'common' }, 'other');
    expect(results).toHaveLength(3);
  });

  it('filters by project to currentProject when option omitted', () => {
    // Default filter uses currentProject; all memories have 'common' so all pass
    const results = retriever.retrieve(memories, {}, 'common');
    expect(results).toHaveLength(3);
    // If currentProject differs, result empty
    const none = retriever.retrieve(memories, {}, 'other');
    expect(none).toHaveLength(0);
  });

  it('filters by action', () => {
    const withAction = memories.map(m => ({ ...m, metadata: { ...m.metadata, _action: 'read_file' as const } })) as any;
    const results = retriever.retrieve(withAction, { action: 'read_file' }, 'common');
    expect(results).toHaveLength(3);
  });

  it('filters by file path', () => {
    const withFile = memories.map(m => ({ ...m, metadata: { ...m.metadata, filePath: '/a/b' } })) as any;
    const results = retriever.retrieve(withFile, { filePath: '/a/b' }, 'common');
    expect(results).toHaveLength(3);
  });

  it('filters by task id', () => {
    const withTask = memories.map(m => ({ ...m, metadata: { ...m.metadata, taskId: 't1' } })) as any;
    const results = retriever.retrieve(withTask, { taskId: 't1' }, 'common');
    expect(results).toHaveLength(3);
  });

  it('respects limit option', () => {
    const results = retriever.retrieve(memories, { limit: 2 }, 'common');
    expect(results).toHaveLength(2);
  });

  it('handles empty memories array', () => {
    const results = retriever.retrieve([], {}, 'common');
    expect(results).toEqual([]);
  });
});
