// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect } from 'vitest';
import {
  computeSimilarity,
  findByHash,
  findBySimilarity,
  detectDuplicate,
} from './engine-dedup.js';
import { memoryHash } from './storage.js';
import type { AgentAction, MemoryEntry } from './types.js';

describe('computeSimilarity', () => {
  it('should return 1.0 for identical strings', () => {
    expect(computeSimilarity('hello world', 'hello world')).toBe(1.0);
  });

  it('should return 1 for two empty strings (identical)', () => {
    expect(computeSimilarity('', '')).toBe(1);
  });

  it('should return 0 for one empty and one non-empty', () => {
    expect(computeSimilarity('abc', '')).toBe(0);
    expect(computeSimilarity('', 'xyz')).toBe(0);
  });

  it('should return 0 for completely different strings', () => {
    expect(computeSimilarity('abc', 'xyz')).toBe(0);
  });

  it('should calculate Jaccard similarity correctly', () => {
    // "the quick brown fox" vs "the quick brown dog"
    // words: {the, quick, brown, fox} vs {the, quick, brown, dog}
    // intersection: 3, union: 5 => 0.6
    const score = computeSimilarity('the quick brown fox', 'the quick brown dog');
    expect(score).toBeCloseTo(0.6, 1);
  });

  it('should be case-insensitive', () => {
    expect(computeSimilarity('Hello World', 'hello world')).toBe(1.0);
  });

  it('should normalize punctuation and special chars', () => {
    expect(computeSimilarity('hello-world', 'hello world')).toBe(1.0);
    expect(computeSimilarity('hello/world', 'hello world')).toBe(1.0);
  });
});

describe('findByHash', () => {
  const action: AgentAction = 'read_file';
  const content = 'hello world';
  const hash = memoryHash(content, { action });

  const memories: MemoryEntry[] = [
    {
      id: '1',
      content: content,
      metadata: { hash, action },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
    },
    {
      id: '2',
      content: 'other content',
      metadata: { hash: memoryHash('other', { action: 'edit_file' }), action: 'edit_file' as AgentAction },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
    },
  ];

  it('should find memory by exact hash match', () => {
    const found = findByHash(memories, content, action, {});
    expect(found).not.toBeNull();
    expect(found?.id).toBe('1');
  });

  it('should return null when no hash match', () => {
    const found = findByHash(memories, 'nonexistent', 'read_file', {});
    expect(found).toBeNull();
  });

  it('should match using metadata.hash not top-level hash', () => {
    // The memory stores hash in metadata; this is already used above.
    // Extra test: ensure it works with only metadata.hash set.
    const mem: MemoryEntry = {
      id: '3',
      content: 'unique',
      metadata: { hash: memoryHash('unique', { action: 'read_file' }), action: 'read_file' as AgentAction },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
    };
    const found = findByHash([mem], 'unique', 'read_file', {});
    expect(found).not.toBeNull();
    expect(found?.id).toBe('3');
  });
});

describe('findBySimilarity', () => {
  const action: AgentAction = 'read_file';
  const memories: MemoryEntry[] = [
    {
      id: '1',
      content: 'hello world test',
      metadata: { action },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
    },
    {
      id: '2',
      content: 'completely unrelated content here',
      metadata: { action },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
    },
    {
      id: '3',
      content: 'hello world example',
      metadata: { action },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
    },
  ];

  it('should find similar memory based on content', () => {
    // Query is subset of memory1's content
    const threshold = 0.6;
    const found = findBySimilarity(memories, 'hello world', action, threshold);
    expect(found).not.toBeNull();
    expect(['1', '3']).toContain(found!.id);
  });

  it('should respect similarity threshold', () => {
    const found = findBySimilarity(memories, 'unrelated', action, 0.8);
    expect(found).toBeNull();
  });

  it('should only consider memories with matching action', () => {
    const memoriesMixed: MemoryEntry[] = [
      ...memories,
      {
        id: '4',
        content: 'hello world but edit action',
        metadata: { action: 'edit_file' as AgentAction },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
      },
    ];
    const found = findBySimilarity(memoriesMixed, 'hello world', 'read_file', 0.1);
    // Should only consider read_file memories, so only 1,2,3
    expect(found).not.toBeNull();
    expect(['1', '2', '3']).toContain(found!.id);
  });

  it('should return best match when multiple candidates', () => {
    // Both memory 1 and 3 are similar; the higher similarity wins.
    // Both have similarity 2/3 = 0.666..., tie broken by first found (since > bestScore not >=).
    // We'll use threshold 0.6.
    const found = findBySimilarity(memories, 'hello world', action, 0.6);
    expect(found).not.toBeNull();
    // The first encountered with highest score will be returned; both 1 and 3 have same score, but algorithm picks the first that reaches that score.
    expect(['1', '3']).toContain(found!.id);
  });
});

describe('detectDuplicate', () => {
  const action: AgentAction = 'read_file';
  // Create memory with hash
  const content1 = 'read the file';
  const hash1 = memoryHash(content1, { action });
  const memory1: MemoryEntry = {
    id: '1',
    content: content1,
    metadata: { hash: hash1, action },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1,
  };
  const memories = [memory1];

  it('should detect exact hash duplicate', () => {
    const dup = detectDuplicate(memories, content1, action, {});
    expect(dup).not.toBeNull();
    expect(dup.id).toBe('1');
  });

  it('should detect similar content when hash misses with high similarity', () => {
    // Use content that normalizes to identical words => similarity 1, but hash differs due to minor difference like extra space
    const similarContent = 'read the file '; // trailing space -> normalized same words
    // This should be similar >0.95.
    const dup = detectDuplicate(memories, similarContent, action, {}, { enabled: true, similarityThreshold: 0.9 });
    expect(dup).not.toBeNull();
    expect(dup.id).toBe('1');
  });

  it('should respect deduplication enabled flag', () => {
    const dup = detectDuplicate(memories, content1, action, {}, { enabled: false });
    expect(dup).toBeNull();
  });

  it('should respect similarityThreshold', () => {
    // Content that results in similarity ~0.5
    const diffContent = 'read that file';
    const dup = detectDuplicate(memories, diffContent, action, {}, { similarityThreshold: 0.9 });
    expect(dup).toBeNull();
  });

  it('should return null when no duplicate found', () => {
    const dup = detectDuplicate(memories, 'totally new unique content', action, {});
    expect(dup).toBeNull();
  });
});
