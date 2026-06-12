// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryEngine } from './engine.js';
import { MemoryStore, memoryHash } from './storage.js';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('MemoryEngine', () => {
  let testDir: string;
  let dbPath: string;
  let store: MemoryStore;
  let engine: MemoryEngine;

  beforeEach(() => {
    testDir = join(tmpdir(), `picro-engine-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    dbPath = join(testDir, 'memory.json');

    store = new MemoryStore(dbPath);
    engine = new MemoryEngine({
      store,
      project: 'test-project',
      topK: 5,
      maxMemories: 10,
      forgettingDays: 1, // shorten for tests
    });
  });

  afterEach(async () => {
    await engine.clear();
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('project management', () => {
    it('should set and get project', () => {
      engine.setProject('new-project');
      expect(engine.getProject()).toBe('new-project');
    });
  });

  describe('add()', () => {
    it('should add memory and return id', async () => {
      const id = await engine.add('content', 'read_file', { filePath: '/test' });
      expect(id).toBeDefined();
      expect(engine.getStorage().get(id)).toBeDefined();
    });

    it('should log SAVE event', async () => {
      await engine.add('content', 'read_file', {});
      const events = engine.getEventLog().getEvents();
      expect(events.some(e => e.action === 'SAVE')).toBe(true);
    });

    it('should increment saves stat', async () => {
      await engine.add('c1', 'read_file', {});
      await engine.add('c2', 'edit_file', {});
      const stats = await engine.getStats();
      expect(stats.saves).toBe(2);
    });
  });

  describe('remember()', () => {
    it('should alias add method', async () => {
      const id = await engine.remember('read_file', 'remembered content', {});
      expect(engine.getStorage().get(id)).toBeDefined();
    });
  });

  describe('recall()', () => {
    beforeEach(async () => {
      // Add test memories
      await engine.add('read file documentation', 'read_file', { filePath: '/docs/readme.md' });
      await engine.add('edit config yaml', 'edit_file', { filePath: '/config.yaml' });
      await engine.add('execute npm install', 'execute_command', { summary: 'npm install' });
    });

    it('should return matching memories with scores', async () => {
      const result = await engine.recall('read file');
      expect(result.memories.length).toBeGreaterThan(0);
      expect(result.scores.length).toBe(result.memories.length);
      expect(result.query).toBe('read file');
    });

    it('should filter by current project', async () => {
      // Add memory with different project
      const store2 = engine.getStorage();
      await store2.add('other project content', 'read_file', 'other-project', {});

      const result = await engine.recall('read file');
      expect(result.memories.every(m => m.metadata._project === 'test-project')).toBe(true);
    });

    it('should track retrievals stat and event log', async () => {
      await engine.recall('file');
      const stats = await engine.getStats();
      expect(stats.queries).toBe(1);
      const retrieveEvents = engine.getEventLog().getByAction('RETRIEVE');
      expect(retrieveEvents.length).toBeGreaterThan(0);
    });

    it('should increment access count on retrieved memories', async () => {
      const all = await engine.getAll();
      const target = all[0];
      const initialAccess = target.access_count || 0;

      await engine.recall('read file');

      const updated = engine.getStorage().get(target.id);
      expect(updated?.access_count).toBeGreaterThan(initialAccess);
    });

    it('should return empty if no matches meet threshold', async () => {
      const result = await engine.recall('zzzzznonexistent');
      expect(result.memories.length).toBe(0);
    });
  });

  describe('getAll()', () => {
    it('should return all memories', async () => {
      await engine.add('a', 'read_file', {});
      await engine.add('b', 'edit_file', {});
      const all = await engine.getAll();
      expect(all.length).toBe(2);
    });
  });

  describe('getRecent()', () => {
    it('should return recent memories', async () => {
      await engine.add('first', 'read_file', {});
      await engine.add('second', 'read_file', {});
      await engine.add('third', 'read_file', {});
      const recent = engine.getRecent(2);
      expect(recent.length).toBe(2);
      expect(recent[0].content).toBe('[READ_FILE] second');
      expect(recent[1].content).toBe('[READ_FILE] third');
    });
  });

  describe('filtering by metadata', () => {
    beforeEach(async () => {
      await engine.add('readme', 'read_file', { filePath: '/a' });
      await engine.add('config', 'edit_file', { filePath: '/b' });
    });

    it('getByAction should filter correctly', () => {
      const reads = engine.getByAction('read_file');
      expect(reads.length).toBe(1);
      expect(reads[0].content).toBe('[READ_FILE] readme');
    });

    it('getByFile should filter by filePath', () => {
      const configs = engine.getByFile('/b');
      expect(configs.length).toBe(1);
      expect(configs[0].content).toBe('[EDIT_FILE] config');
    });

    it('getByProject should filter by project', () => {
      const memories = engine.getByProject('test-project');
      expect(memories.length).toBe(2);
    });
  });

  describe('getContext()', () => {
    it('should return formatted context string', async () => {
      await engine.add('memory content', 'read_file', { summary: 'summary' });
      const ctx = engine.getContext(5);
      expect(ctx).toContain('memory content');
    });

    it('should return placeholder when empty', () => {
      const ctx = engine.getContext();
      expect(ctx).toBe('No memories yet.');
    });

    it('should truncate long content if configured', async () => {
      const long = 'x'.repeat(1000);
      await engine.add(long, 'read_file', {});
      const ctx = engine.getContext(1);
      expect(ctx).not.toContain('x'.repeat(1000));
    });
  });

  describe('count()', () => {
    it('should return memory count', async () => {
      expect(await engine.count()).toBe(0);
      await engine.add('a', 'read_file', {});
      expect(await engine.count()).toBe(1);
    });
  });

  describe('clear()', () => {
    it('should remove all memories and reset stats', async () => {
      await engine.add('a', 'read_file', {});
      await engine.add('b', 'edit_file', {});
      await engine.clear();

      expect(await engine.count()).toBe(0);
      const stats = await engine.getStats();
      expect(stats.saves).toBe(0);
      expect(stats.retrievals).toBe(0);
    });
  });

  describe('applyForgetting()', () => {
    it('should evict old and unused memories based on age/access', async () => {
      // Add memories with different access counts and dates (manually set dates)
      const storage = engine.getStorage();
      const now = Date.now();

      // Old, never accessed should be evicted
      const oldMemId = await storage.add('old content', 'read_file', 'proj', {});
      // Update created_at to be old
      const oldMem = storage.getStore().getMemory(oldMemId);
      if (oldMem) {
        oldMem.created_at = new Date(now - 1000 * 60 * 60 * 24 * 10).toISOString(); // 10 days
      }

      // New, accessed - should stay
      const newMemId = await storage.add('new content', 'read_file', 'proj', {});
      // Simulate access by updating memory (increments access_count)
      await storage.update(newMemId);

      const deletedCount = await engine.applyForgetting();
      expect(deletedCount).toBeGreaterThanOrEqual(1);

      const remaining = await engine.getAll();
      // Content includes prefix
      expect(remaining.some(m => m.content.includes('new content'))).toBe(true);
    });
  });

  describe('metrics and tuning', () => {
    it('should allow dynamic topK adjustment', () => {
      engine.setTopK(10);
      expect(engine.getTopK()).toBe(10);
    });

    it('should allow dynamic minScore adjustment', () => {
      engine.setMinScore(3);
      expect(engine.getMinScore()).toBe(3);
    });

    it('should allow dynamic cache TTL adjustment', () => {
      engine.setCacheTTL(600000);
      expect(engine.getCacheTTL()).toBe(600000);
    });
  });

  describe('getMetrics()', () => {
    it('should include extended performance metrics', async () => {
      await engine.add('test', 'read_file', {});
      await engine.recall('test');

      const metrics = await engine.getMetrics();
      expect(metrics.memoryCount).toBe(1);
      expect(metrics.saves).toBe(1);
      expect(metrics.queries).toBe(1);
      expect(metrics.avgQueryLatencyMs).toBeGreaterThanOrEqual(0);
      expect(metrics.cacheHitRate).toBeGreaterThanOrEqual(0);
    });
  });
});
