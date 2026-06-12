// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryScorer, MemoryRetriever } from './retrieval.js';

describe('MemoryScorer', () => {
  let scorer: MemoryScorer;

  beforeEach(() => {
    scorer = new MemoryScorer();
  });

  describe('keyword matching', () => {
    it('should score exact keyword matches', () => {
      const memory = {
        content: 'read this file for documentation',
        metadata: { _action: 'read_file', _project: 'test' },
        created_at: new Date().toISOString(),
        access_count: 0,
      };
      const score = scorer.score(memory, 'read file', 'test');
      expect(score).toBeGreaterThan(0);
    });

    it('should score higher for multiple query word matches', () => {
      const memory = {
        content: 'edit the file and modify the configuration',
        metadata: { _action: 'edit_file', _project: 'test' },
        created_at: new Date().toISOString(),
        access_count: 0,
      };
      const score = scorer.score(memory, 'edit file', 'test');
      const singleWordScore = scorer.score(memory, 'edit', 'test');
      expect(score).toBeGreaterThan(singleWordScore);
    });

    it('should apply synonym matching', () => {
      const memory = {
        content: 'view the file contents',
        metadata: { _project: 'test' },
        created_at: new Date().toISOString(),
        access_count: 0,
      };
      // "view" is synonym of "read"
      const score = scorer.score(memory, 'read file', 'test');
      expect(score).toBeGreaterThan(0);
    });

    it('should return 0 for no query word matches', () => {
      const memory = {
        content: 'completely unrelated content here',
        metadata: { _project: 'test' },
        created_at: new Date().toISOString(),
        access_count: 0,
      };
      const score = scorer.score(memory, 'nonexistent keyphrase', 'test');
      expect(score).toBe(0);
    });
  });

  describe('exact phrase bonus', () => {
    it('should boost exact phrase match', () => {
      const memory = {
        content: 'I need to edit this file right now',
        metadata: { _project: 'test' },
        created_at: new Date().toISOString(),
        access_count: 0,
      };
      const score1 = scorer.score(memory, 'edit file', 'test');
      // Add exact phrase
      memory.content = 'edit file operations are important';
      const score2 = scorer.score(memory, 'edit file', 'test');
      expect(score2).toBeGreaterThan(score1);
    });
  });

  describe('file path matching', () => {
    it('should boost file path match', () => {
      const memory = {
        content: 'some content',
        metadata: { filePath: '/home/user/project/src/file.ts', _project: 'test' },
        created_at: new Date().toISOString(),
        access_count: 0,
      };
      const score = scorer.score(memory, 'file.ts', 'test');
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('project filtering', () => {
    it('should return 0 for different project', () => {
      const memory = {
        content: 'read file content',
        metadata: { _project: 'other-project' },
        created_at: new Date().toISOString(),
        access_count: 0,
      };
      const score = scorer.score(memory, 'read file', 'test-project');
      expect(score).toBe(0);
    });
  });

  describe('action type mismatch penalty', () => {
    it('should penalize when action does not match expected action from query', () => {
      const memory = {
        content: 'edit the configuration file',
        metadata: { _action: 'execute_command', _project: 'test' },
        created_at: new Date().toISOString(),
        access_count: 0,
      };
      // Query "edit" suggests edit_file action, but memory is read_file
      const score = scorer.score(memory, 'edit file', 'test');
      // Penalty brings score to 0 (function returns 0 for non-positive)
      expect(score).toBe(0);
    });
  });

  describe('recency boost', () => {
    it('should boost very recent memories (<1 hour)', () => {
      const now = Date.now();
      const recent = new Date(now - 30 * 60 * 1000).toISOString(); // 30 min ago
      const older = new Date(now - 24 * 60 * 60 * 1000).toISOString(); // 1 day ago

      const memoryRecent = {
        content: 'test content',
        metadata: { _project: 'test' },
        created_at: recent,
        access_count: 0,
      };
      const memoryOlder = {
        content: 'test content',
        metadata: { _project: 'test' },
        created_at: older,
        access_count: 0,
      };

      const scoreRecent = scorer.score(memoryRecent, 'test content', 'test');
      const scoreOlder = scorer.score(memoryOlder, 'test content', 'test');
      expect(scoreRecent).toBeGreaterThan(scoreOlder);
    });
  });

  describe('content length bonus', () => {
    it('should add bonus for short content (<200 chars)', () => {
      const short = {
        content: 'short',
        metadata: { _project: 'test' },
        created_at: new Date().toISOString(),
        access_count: 0,
      };
      const long = {
        content: 'x'.repeat(500),
        metadata: { _project: 'test' },
        created_at: new Date().toISOString(),
        access_count: 0,
      };
      const shortScore = scorer.score(short, 'short', 'test');
      const longScore = scorer.score(long, 'x'.repeat(500), 'test');
      // Both should get base scoring; short gets extra +2
      expect(shortScore).toBeGreaterThanOrEqual(longScore);
    });
  });

  describe('access count bonus', () => {
    it('should boost frequently accessed memories', () => {
      const memLow = {
        content: 'content',
        metadata: { _project: 'test' },
        created_at: new Date().toISOString(),
        access_count: 0,
      };
      const memHigh = {
        content: 'content',
        metadata: { _project: 'test' },
        created_at: new Date().toISOString(),
        access_count: 10,
      };

      const scoreLow = scorer.score(memLow, 'content', 'test');
      const scoreHigh = scorer.score(memHigh, 'content', 'test');
      expect(scoreHigh).toBeGreaterThan(scoreLow);
    });
  });
});

describe('MemoryRetriever', () => {
  let retriever: MemoryRetriever;
  let memories: any[];

  beforeEach(() => {
    retriever = new MemoryRetriever();
    memories = [
      {
        id: 'm1',
        content: 'read file documentation guide',
        metadata: { _action: 'read_file', _project: 'proj1', filePath: '/docs/readme.md' },
        created_at: new Date().toISOString(),
        access_count: 1,
      },
      {
        id: 'm2',
        content: 'edit configuration settings',
        metadata: { _action: 'edit_file', _project: 'proj1', filePath: '/config.yaml' },
        created_at: new Date().toISOString(),
        access_count: 2,
      },
      {
        id: 'm3',
        content: 'run npm install command',
        metadata: { _action: 'execute_command', _project: 'proj1' },
        created_at: new Date().toISOString(),
        access_count: 0,
      },
      {
        id: 'm4',
        content: 'file operations in proj2',
        metadata: { _project: 'proj2' },
        created_at: new Date().toISOString(),
        access_count: 0,
      },
    ];
  });

  describe('search()', () => {
    it('should return top matching memories', () => {
      const results = retriever.search(memories, 'read file', 'proj1', 5);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].memory.id).toBe('m1'); // best match
    });

    it('should respect limit parameter', () => {
      const results = retriever.search(memories, 'file', 'proj1', 2);
      expect(results.length).lessThanOrEqual(2);
    });

    it('should return empty array for empty query', () => {
      const results = retriever.search(memories, '', 'proj1', 5);
      expect(results).toEqual([]);
    });

    it('should return empty array for non-matching query', () => {
      const results = retriever.search(memories, 'xyz123nonexistent', 'proj1', 5);
      expect(results).toEqual([]);
    });

    it('should filter by project', () => {
      const results = retriever.search(memories, 'file', 'proj2', 5);
      expect(results.every(r => r.memory.metadata._project === 'proj2')).toBe(true);
    });
  });

  describe('caching', () => {
    it('should cache identical queries', () => {
      const query = 'read file';
      const project = 'proj1';
      const limit = 5;
      const cacheKey = `${query}:${project}:${limit}`;

      const results1 = retriever.search(memories, query, project, limit);
      const metrics1 = retriever.getMetrics();
      expect(metrics1.cacheMisses).toBe(1);
      expect(metrics1.cacheHits).toBe(0);

      const results2 = retriever.search(memories, query, project, limit);
      const metrics2 = retriever.getMetrics();
      expect(metrics2.cacheHits).toBe(1);
      expect(results2).toEqual(results1);
    });

    it('should not cache different queries', () => {
      retriever.search(memories, 'read file', 'proj1', 5);
      retriever.search(memories, 'edit config', 'proj1', 5);
      const metrics = retriever.getMetrics();
      expect(metrics.cacheMisses).toBe(2);
      expect(metrics.cacheHits).toBe(0);
    });

    it('should respect cache TTL', async () => {
      retriever.setCacheTTL(0); // expire immediately
      retriever.search(memories, 'read file', 'proj1', 5);
      retriever.search(memories, 'read file', 'proj1', 5);
      const metrics = retriever.getMetrics();
      expect(metrics.cacheMisses).toBe(2);
      expect(metrics.cacheHits).toBe(0);
    });

    it('should invalidate cache', () => {
      retriever.search(memories, 'read file', 'proj1', 5);
      retriever.invalidateCache();
      retriever.search(memories, 'read file', 'proj1', 5);
      const metrics = retriever.getMetrics();
      expect(metrics.cacheMisses).toBe(2);
      expect(metrics.cacheHits).toBe(0);
    });
  });

  describe('fuzzySearch()', () => {
    it('should find partial matches', () => {
      const results = retriever.fuzzySearch(memories, 'inst', 'proj1', 3);
      // 'inst' matches 'install' in m3 content
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].memory.id).toBe('m3');
    });

    it('should respect limit', () => {
      const results = retriever.fuzzySearch(memories, 'file', 'proj1', 1);
      expect(results.length).lessThanOrEqual(1);
    });

    it('should filter by project', () => {
      const results = retriever.fuzzySearch(memories, 'something', 'proj2', 3);
      expect(results.every(r => r.memory.metadata._project === 'proj2')).toBe(true);
    });
  });

  describe('filterBy* helpers', () => {
    it('filterByAction should filter correctly', () => {
      const readFiles = retriever.filterByAction(memories, 'read_file');
      expect(readFiles.length).toBe(1);
      expect(readFiles[0].id).toBe('m1');
    });

    it('filterByFile should filter by filePath', () => {
      const yamlFiles = retriever.filterByFile(memories, 'config.yaml');
      expect(yamlFiles.length).toBe(1);
      expect(yamlFiles[0].id).toBe('m2');
    });

    it('filterByProject should filter by project', () => {
      const proj2 = retriever.filterByProject(memories, 'proj2');
      expect(proj2.length).toBe(1);
      expect(proj2[0].id).toBe('m4');
    });
  });

  describe('retrieve()', () => {
    it('should apply all filters and return sorted by recency', () => {
      const results = retriever.retrieve(memories, { action: 'execute_command', limit: 5 }, 'proj1');
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('m3');
    });

    it('should default to current project if no project filter', () => {
      const results = retriever.retrieve(memories, {}, 'proj2');
      expect(results.every(r => r.metadata._project === 'proj2')).toBe(true);
    });

    it('should support filePath filter', () => {
      const results = retriever.retrieve(memories, { filePath: 'readme.md' }, 'proj1');
      expect(results.length).toBe(1);
      expect(results[0].metadata.filePath).toContain('readme.md');
    });
  });

  describe('integration with BM25', () => {
    it('should combine scorer and BM25 scores', () => {
      // Add many documents to make BM25 meaningful
      const manyMemories = Array.from({ length: 50 }, (_, i) => ({
        id: `m${i}`,
        content: `document ${i} with various content and keywords`,
        metadata: { _project: 'proj1' },
        created_at: new Date().toISOString(),
        access_count: 0,
      }));
      // Add a best matching doc at specific position
      manyMemories[25] = {
        id: 'target',
        content: 'read file documentation guide and instructions',
        metadata: { _action: 'read_file', _project: 'proj1' },
        created_at: new Date().toISOString(),
        access_count: 0,
      };

      const results = retriever.search(manyMemories, 'read file documentation', 'proj1', 5);
      expect(results.length).toBeGreaterThan(0);
      // Should combine scores reasonably - target likely at or near top
      expect(results[0].memory.id).toBe('target');
    });
  });
});
