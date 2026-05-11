// SPDX-License-Identifier: Apache-2.0
/**
 * Unit tests for compaction core logic.
 */

import { describe, it, expect } from 'vitest';
import {
  findCutPoint,
  shouldCompact,
  prepareCompaction,
  DEFAULT_COMPACTION_THRESHOLDS,
} from './core';
import type { SessionEntry } from '../session/session-manager';

// Helper to create a session entry with a message that has a certain token count
function createMessageEntry(id: string, tokenCount: number, role: 'user' | 'assistant' | 'tool' = 'user'): SessionEntry {
  return {
    type: 'message',
    id,
    timestamp: new Date().toISOString(),
    parentId: null,
    message: {
      role,
      content: [{ type: 'text', text: 'x'.repeat(tokenCount * 4) }], // approx tokens
      timestamp: Date.now(),
    },
  };
}

// Helper to create a dummy compaction entry
function createCompactionEntry(id: string, summary: string, firstKeptId: string): SessionEntry {
  return {
    type: 'compaction',
    id,
    timestamp: new Date().toISOString(),
    parentId: null,
    summary,
    firstKeptEntryId: firstKeptId,
    tokensBefore: 50000,
  };
}

describe('findCutPoint', () => {
  it('should return full length if under limit', () => {
    const entries = [
      createMessageEntry('m1', 100),
      createMessageEntry('m2', 100),
    ];
    const result = findCutPoint(entries, 500);
    expect(result.cutIndex).toBe(2);
    expect(result.tokensAfter).toBe(0);
  });

  it('should find cut point when exceeding limit', () => {
    // Each entry has 1000 tokens => total 3000, limit 1500
    const entries = [
      createMessageEntry('m1', 1000),
      createMessageEntry('m2', 1000),
      createMessageEntry('m3', 1000),
    ];
    const result = findCutPoint(entries, 1500);
    expect(result.cutIndex).toBeGreaterThan(0);
    expect(result.cutIndex).toBeLessThan(3);
    expect(result.tokensBefore).toBeLessThanOrEqual(1500);
    expect(result.tokensAfter).toBeGreaterThan(0);
  });

  it('should return 0 if nothing fits', () => {
    const entries = [createMessageEntry('m1', 2000)];
    const result = findCutPoint(entries, 500);
    expect(result.cutIndex).toBe(0);
    expect(result.tokensBefore).toBe(0);
    expect(result.tokensAfter).toBeGreaterThan(0);
  });

  it('should handle empty array', () => {
    const result = findCutPoint([], 1000);
    expect(result.cutIndex).toBe(0);
    expect(result.tokensBefore).toBe(0);
    expect(result.tokensAfter).toBe(0);
  });
});

describe('shouldCompact', () => {
  it('should return false if below minTokens', () => {
    expect(shouldCompact(40000)).toBe(false);
    expect(shouldCompact(49999)).toBe(false);
  });

  it('should return true if at or above tokenThreshold', () => {
    expect(shouldCompact(100000)).toBe(true);
    expect(shouldCompact(150000)).toBe(true);
  });

  it('should respect custom thresholds', () => {
    const custom = { tokenThreshold: 80000, minTokens: 30000, maxAfterCompaction: 40000 };
    expect(shouldCompact(75000, custom)).toBe(false);
    expect(shouldCompact(85000, custom)).toBe(true);
  });
});

describe('prepareCompaction', () => {
  it('should split entries into keep and summarize groups', () => {
    // Build a list with many entries to exceed keepRecentTokens
    const entries: SessionEntry[] = [];
    for (let i = 0; i < 10; i++) {
      entries.push(createMessageEntry(`m${i}`, 1000));
    }
    const settings = { maxTokens: 5000, keepRecentTurns: 3 };
    const result = prepareCompaction(entries, settings);

    // entriesToKeep should contain at least the recent turns
    expect(result.entriesToKeep.length).toBeGreaterThanOrEqual(3);
    // entriesToSummarize should include the older ones
    expect(result.entriesToSummarize.length).toBeGreaterThan(0);
  });

  it('should include file operations tracking', () => {
    const entries: SessionEntry[] = [
      {
        type: 'message',
        id: 'm1',
        timestamp: new Date().toISOString(),
        parentId: null,
        message: {
          role: 'assistant',
          content: [
            { type: 'text', text: 'hi' },
            {
              type: 'toolCall',
              id: 'c1',
              name: 'read',
              arguments: { path: '/a.txt' },
            },
          ],
          timestamp: Date.now(),
        },
      } as SessionEntry,
    ];
    const result = prepareCompaction(entries, { maxTokens: 1000 });
    expect(result.fileOps.read.has('/a.txt')).toBe(true);
  });
});
