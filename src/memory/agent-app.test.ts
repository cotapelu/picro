// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentMemoryApp } from './agent-app.js';
import { MemoryStore } from './storage.js';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('AgentMemoryApp', () => {
  let testDir: string;
  let dbPath: string;
  let store: MemoryStore;
  let app: AgentMemoryApp;

  beforeEach(() => {
    testDir = join(tmpdir(), `picro-app-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    dbPath = join(testDir, 'memory.json');
    store = new MemoryStore(dbPath);
    app = new AgentMemoryApp(store, 'test-project');
  });

  afterEach(async () => {
    await app.clear();
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('initialization', () => {
    it('should initialize engine', async () => {
      await app.init();
      expect(await app.getMemoryCount()).toBe(0);
    });
  });

  describe('remember* convenience methods', () => {
    beforeEach(async () => {
      await app.init();
    });

    it('rememberFileRead should store with read_file action and filePath', async () => {
      const id = await app.rememberFileRead('/path/to/file.ts', 'summary of file');
      const mem = await app.getAll().then(m => m.find(m => m.id === id));
      expect(mem?.metadata._action).toBe('read_file');
      expect(mem?.metadata.filePath).toBe('/path/to/file.ts');
      expect(mem?.content).toContain('Read file: /path/to/file.ts');
    });

    it('rememberFileEdit should store with edit_file action', async () => {
      const id = await app.rememberFileEdit('/config.yaml', 'changed setting');
      const mem = await app.getAll().then(m => m.find(m => m.id === id));
      expect(mem?.metadata._action).toBe('edit_file');
      expect(mem?.content).toContain('Edited file: /config.yaml');
    });

    it('rememberCommand should store with execute_command action', async () => {
      const id = await app.rememberCommand('npm test', 'output here');
      const mem = await app.getAll().then(m => m.find(m => m.id === id));
      expect(mem?.metadata._action).toBe('execute_command');
      expect(mem?.content).toContain('Command: npm test');
    });

    it('rememberProjectInfo should store with project_info action', async () => {
      const id = await app.rememberProjectInfo('My project uses TypeScript');
      const mem = await app.getAll().then(m => m.find(m => m.id === id));
      expect(mem?.metadata._action).toBe('project_info');
      expect(mem?.content).toBe('[PROJECT_INFO] My project uses TypeScript');
    });

    it('rememberTaskInfo should store with task_info action and taskId', async () => {
      const id = await app.rememberTaskInfo('task-123', 'Implement feature X');
      const mem = await app.getAll().then(m => m.find(m => m.id === id));
      expect(mem?.metadata._action).toBe('task_info');
      expect(mem?.metadata.taskId).toBe('task-123');
    });
  });

  describe('recall()', () => {
    beforeEach(async () => {
      await app.init();
      await app.rememberFileRead('/a.ts', 'summary a');
      await app.rememberFileEdit('/b.ts', 'edit b');
      await app.rememberCommand('npm build', 'built');
    });

    it('should return matching memories', async () => {
      const results = await app.recall('read file');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should support recallWithScores', async () => {
      const result = await app.recallWithScores('read');
      expect(result.memories.length).greaterThan(0);
      expect(result.scores.length).toBe(result.memories.length);
      expect(result.query).toBe('read');
    });
  });

  describe('getRecentActions()', () => {
    it('should return recent memories', async () => {
      await app.init();
      await app.rememberFileRead('/a', 'a');
      await app.rememberFileRead('/b', 'b');
      await app.rememberFileRead('/c', 'c');

      const recent = app.getRecentActions(2);
      expect(recent.length).toBe(2);
      expect(recent[0].content).toContain('/b');
      expect(recent[1].content).toContain('/c');
    });
  });

  describe('getAll()', () => {
    it('should return all stored memories', async () => {
      await app.init();
      await app.remember('read_file', 'content1', {});
      await app.remember('edit_file', 'content2', {});
      const all = await app.getAll();
      expect(all.length).toBe(2);
    });
  });

  describe('getByAction()', () => {
    it('should filter by action', async () => {
      await app.init();
      await app.rememberFileRead('/a', 'a');
      await app.rememberFileEdit('/b', 'b');
      const reads = app.getByAction('read_file');
      expect(reads.length).toBe(1);
    });
  });

  describe('getByFile()', () => {
    it('should filter by file path', async () => {
      await app.init();
      await app.rememberFileRead('/a.ts', 'a');
      await app.rememberFileEdit('/b.ts', 'b');
      const aMemories = app.getByFile('/a.ts');
      expect(aMemories.length).toBe(1);
    });
  });

  describe('updateMemory()', () => {
    it('should update memory content and/or metadata', async () => {
      await app.init();
      const id = await app.remember('read_file', 'original', { key: 'val' });
      const ok = await app.updateMemory(id, 'updated', { newKey: 'newVal' });
      expect(ok).toBe(true);
      const all = await app.getAll();
      const mem = all.find(m => m.id === id);
      expect(mem?.content).toBe('updated');
      expect(mem?.metadata.key).toBe('val');
      expect(mem?.metadata.newKey).toBe('newVal');
    });

    it('should return false for non-existent memory', async () => {
      await app.init();
      const ok = await app.updateMemory('bad-id', 'content', {});
      expect(ok).toBe(false);
    });
  });

  describe('deleteMemory()', () => {
    it('should delete memory', async () => {
      await app.init();
      const id = await app.remember('read_file', 'content', {});
      let all = await app.getAll();
      expect(all.length).toBe(1);

      const ok = await app.deleteMemory(id);
      expect(ok).toBe(true);
      all = await app.getAll();
      expect(all.length).toBe(0);
    });

    it('should return false for non-existent memory', async () => {
      await app.init();
      const ok = await app.deleteMemory('bad-id');
      expect(ok).toBe(false);
    });
  });

  describe('cache and tuning', () => {
    it('should forward setCacheTTL to engine', async () => {
      app.setCacheTTL(600000);
      expect(app.getRetrieverMetrics()).toBeDefined();
    });

    it('should forward setTopK to engine', async () => {
      app.setTopK(15);
      expect(await app.getMemoryCount()).toBe(0); // no error
    });
  });

  describe('memory count', () => {
    it('getMemoryCount should return count', async () => {
      await app.init();
      expect(await app.getMemoryCount()).toBe(0);
      await app.remember('read_file', 'c1', {});
      await app.remember('read_file', 'c2', {});
      expect(await app.getMemoryCount()).toBe(2);
    });
  });

  describe('clear()', () => {
    it('should clear all memories', async () => {
      await app.init();
      await app.remember('read_file', 'c1', {});
      await app.remember('edit_file', 'c2', {});
      await app.clear();
      expect(await app.getMemoryCount()).toBe(0);
    });
  });

  describe('setProject()', () => {
    it('should change project for new memories', async () => {
      await app.init();
      app.setProject('project-b');
      await app.remember('read_file', 'content', {});
      const all = await app.getAll();
      expect(all[0].metadata._project).toBe('project-b');
    });
  });
});
