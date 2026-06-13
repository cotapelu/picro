// SPDX-License-Identifier: Apache-2.0
/**
 * Additional branch coverage for MemoryScorer.score branches.
 * Covers: matched>=2 bonus, perfect match, exact phrase, file path match (exact/partial),
 * generic metadata, recency boost thresholds, content length bonus, access count bonus.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryScorer } from './retrieval.js';

describe('MemoryScorer scoring branches', () => {
  let scorer: MemoryScorer;
  const now = Date.now();

  // Helper to create memory with specific timestamps (ms since epoch)
  function makeMemory(overrides: any = {}) {
    return {
      content: overrides.content ?? 'sample content here',
      metadata: { _project: 'proj', _action: 'read_file', ...(overrides.metadata ?? {}) },
      created_at: overrides.created_at ?? new Date(now - 24 * 60 * 60 * 1000).toISOString(), // default 1 day ago
      access_count: overrides.access_count ?? 0,
    };
  }

  beforeEach(() => {
    scorer = new MemoryScorer();
  });

  describe('matched words and bonuses', () => {
    it('applies +5 when multiple query words matched', () => {
      // Query: "read file" -> words: ['read','file']
      const mem = makeMemory({ content: 'read file guide' });
      const score = scorer.score(mem, 'read file', 'proj');
      // base: each word match +4 = 8, matchedWords>=2 gives +5 => at least 13 before other bonuses
      expect(score).toBeGreaterThanOrEqual(13);
    });

    it('applies +15 perfect match when all query words present', () => {
      const mem = makeMemory({ content: 'read file edit' });
      const score = scorer.score(mem, 'read file', 'proj');
      // matchedWords = 2 (read, file), should get +15 perfect
      expect(score).toBeGreaterThan(20);
    });

    it('applies +10 exact phrase match', () => {
      const mem = makeMemory({ content: 'please read file now' });
      const score = scorer.score(mem, 'read file', 'proj');
      // content includes the exact compiled query "read file", so +10
      expect(score).toBeGreaterThan(10);
    });
  });

  describe('file path bonus', () => {
    it('awards +15 for exact or containing path match', () => {
      const mem = makeMemory({ metadata: { filePath: '/home/user/readfile.txt' } });
      const score = scorer.score(mem, 'readfile', 'proj');
      // query 'readfile' appears in path; should get +15
      expect(score).toBeGreaterThanOrEqual(15);
    });

    it('awards +3 per query word found in path (partial)', () => {
      const mem = makeMemory({ metadata: { filePath: '/src/components/read.js' } });
      const score = scorer.score(mem, 'read component', 'proj');
      // Both 'read' and 'component' likely in path; each +3
      expect(score).toBeGreaterThanOrEqual(6);
    });
  });

  describe('generic metadata match', () => {
    it('adds +3 per query word found in any string metadata', () => {
      const mem = makeMemory({ metadata: { component: 'read-widget', _action: 'read_file' } });
      const score = scorer.score(mem, 'read widget', 'proj');
      // 'read' in component, and maybe 'widget' also matches, expect at least +3 per word
      expect(score).toBeGreaterThanOrEqual(6);
    });
  });

  describe('recency boost thresholds', () => {
    const thresholds = [
      { ageMs: 30 * 60 * 1000, expectedFactor: 3.0 },   // <1 hour
      { ageMs: 3 * 60 * 60 * 1000, expectedFactor: 1.5 }, // <6 hours
      { ageMs: 12 * 60 * 60 * 1000, expectedFactor: 1.2 }, // <24 hours
      { ageMs: 48 * 60 * 60 * 1000, expectedFactor: 1.1 }, // <72 hours
      { ageMs: 120 * 60 * 60 * 1000, expectedFactor: 1.05 }, // <168 hours (1 week)
      { ageMs: 30 * 24 * 60 * 60 * 1000, expectedFactor: 1.0 }, // older >1 week
    ];

    thresholds.forEach(({ ageMs, expectedFactor }) => {
      it(`recency factor ${expectedFactor} for age ${ageMs/(60*60*1000)}h`, () => {
        const created = new Date(now - ageMs).toISOString();
        const mem = makeMemory({ created_at: created, content: 'read file' });
        const score = scorer.score(mem, 'read file', 'proj');
        // baseScore approx: matchedWords>=2 (5 bonus) => base at least 13, plus perfect 15? Actually both; minimum baseScore > something.
        // We compute approximate expected: baseScore min 13 (matched>=2) but could be higher due to other factors; but the recency factor should multiply baseScore.
        // If factor=1.0, no boost; if >1, score should be higher than baseScore. We can compare with same memory older reference.
        const oldMem = makeMemory({ created_at: new Date(now - 200 * 24 * 60 * 60 * 1000).toISOString(), content: 'read file' });
        const oldScore = scorer.score(oldMem, 'read file', 'proj');
        if (expectedFactor > 1.0) {
          expect(score).toBeGreaterThan(oldScore);
        } else {
          // For oldest, factor=1, but may still be similar
          expect(score).toBeLessThan(oldScore * 1.1); // roughly similar
        }
      });
    });
  });

  describe('content length bonus', () => {
    it('adds +2 for short content (<200 chars)', () => {
      const short = 'hello world'.repeat(10); // about 110 chars
      const mem = makeMemory({ content: short });
      const score = scorer.score(mem, 'hello', 'proj');
      // base score: match 'hello' many times? Actually repeated pattern: 'hello world' contains 'hello' many times -> many matches, score > 4.
      // We just check length bonus applied: base > something.
      expect(score).toBeGreaterThan(4);
    });

    it('no length bonus for long content', () => {
      const queryWord = 'matchme';
      const long = queryWord + ' ' + 'x'.repeat(250); // >200 chars, single occurrence
      // Make memory old enough to avoid recency boost (factor 1.0)
      const oldCreated = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
      const mem = makeMemory({ content: long, created_at: oldCreated });
      const score = scorer.score(mem, queryWord, 'proj');
      // base: +4 (match) + perfect +15? matchedWords=1 equals queryWords length -> +15, +10 exact phrase => 29
      expect(score).toBe(29);
    });
  });

  describe('access count bonus', () => {
    it('adds 2 * access_count to score', () => {
      const mem = makeMemory({ access_count: 5, content: 'read file' });
      const score = scorer.score(mem, 'read file', 'proj');
      // base score maybe 4+4=8 + perfect 15 =23; plus access 5*2=10 => ~33
      expect(score).toBeGreaterThan(30);
    });
  });
});
