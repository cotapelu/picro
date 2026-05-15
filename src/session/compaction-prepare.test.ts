import { describe, it, expect } from 'vitest';
import { prepareCompaction } from './compaction';
import type { SessionEntry } from '../session/session-manager';

function createMessageEntry(id: string, role: 'user' | 'assistant', text: string): SessionEntry {
  return {
    type: 'message',
    id,
    timestamp: new Date().toISOString(),
    parentId: null,
    message: {
      role,
      content: [{ type: 'text', text }],
      timestamp: Date.now(),
    } as any,
  };
}

function createCompactionEntry(id: string, details: { readFiles: string[]; modifiedFiles: string[] }): SessionEntry {
  return {
    type: 'compaction',
    id,
    timestamp: new Date().toISOString(),
    parentId: null,
    summary: 'summary',
    firstKeptEntryId: 'ignored',
    tokensBefore: 100,
    details,
  };
}

describe('prepareCompaction (file ops inheritance)', () => {
  it('should aggregate fileOps from previous compaction entries', () => {
    const entries: SessionEntry[] = [
      createMessageEntry('m1', 'assistant', 'Read file a.txt'),
      createCompactionEntry('c1', { readFiles: ['/b.txt'], modifiedFiles: ['/c.txt'] }),
      createMessageEntry('m2', 'user', 'Hello'),
      createMessageEntry('m3', 'assistant', 'World'),
    ];

    // Use very small keepRecentTokens to force cut point near the end so that the compaction entry is before the cut
    const settings = { enabled: true, reserveTokens: 16384, keepRecentTokens: 1 };
    const result = prepareCompaction(entries, settings);

    // The compaction entry at index 1 should be before the kept entry, so its file ops should be inherited
    expect(result.fileOps.read.has('/b.txt')).toBe(true);
    expect(result.fileOps.written.has('/c.txt')).toBe(true);
    expect(result.fileOps.edited.has('/c.txt')).toBe(true);
  });
});
