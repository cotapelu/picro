// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryStore, MemoryStorage, memoryHash, generateId } from './storage.js';
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('MemoryStore', () => {
  let testDir: string;
  let dbPath: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `picro-memory-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    dbPath = join(testDir, 'memory.json');
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('basic CRUD operations', () => {
    it('should start with empty data', async () => {
      const store = new MemoryStore(dbPath);
      await store.init();
      expect(store.getAllMemories()).toEqual([]);
      expect(store.getMemoryCount()).toBe(0);
    });

    it('should add memory and retrieve it', async () => {
      const store = new MemoryStore(dbPath);
      await store.init();

      await store.addMemory('mem1', 'content1', undefined, { hash: 'abc123', version: 1 });
      expect(store.getMemoryCount()).toBe(1);
      expect(store.getMemory('mem1')?.content).toBe('content1');
    });

    it('should overwrite existing memory with same id', async () => {
      const store = new MemoryStore(dbPath);
      await store.init();

      await store.addMemory('mem1', 'original', undefined, { hash: 'h1', version: 1 });
      await store.addMemory('mem1', 'updated', undefined, { hash: 'h2', version: 2 });

      const mem = store.getMemory('mem1');
      expect(mem?.content).toBe('updated');
      expect(mem?.metadata.version).toBe(2);
    });

    it('should update memory content and metadata', async () => {
      const store = new MemoryStore(dbPath);
      await store.init();

      await store.addMemory('mem1', 'original', undefined, { hash: 'h1', version: 1 });
      await store.updateMemory('mem1', 'new content', { newField: 'value' });

      const mem = store.getMemory('mem1');
      expect(mem?.content).toBe('new content');
      expect(mem?.metadata.newField).toBe('value');
      // Version is not auto-incremented by MemoryStore.updateMemory
      expect(mem?.metadata.version).toBe(1);
    });

    it('should not update non-existent memory', async () => {
      const store = new MemoryStore(dbPath);
      await store.init();

      await store.updateMemory('nonexistent', 'content', {});
      expect(store.getMemoryCount()).toBe(0);
    });

    it('should delete memory', async () => {
      const store = new MemoryStore(dbPath);
      await store.init();

      await store.addMemory('mem1', 'content1', undefined, {});
      await store.deleteMemory('mem1');
      expect(store.getMemoryCount()).toBe(0);
      expect(store.getMemory('mem1')).toBeUndefined();
    });

    it('should get memory by hash', async () => {
      const store = new MemoryStore(dbPath);
      await store.init();

      const hash = 'testhash123';
      await store.addMemory('mem1', 'content', undefined, { hash, version: 1 });

      const found = store.getMemoryByHash(hash);
      expect(found).toBeDefined();
      expect(found?.id).toBe('mem1');
    });

    it('should return undefined for non-existent hash', async () => {
      const store = new MemoryStore(dbPath);
      await store.init();

      const found = store.getMemoryByHash('nonexistent');
      expect(found).toBeUndefined();
    });
  });

  describe('persistence', () => {
    it('should save and load data across instances', async () => {
      // First instance: write
      const store1 = new MemoryStore(dbPath);
      await store1.init();
      await store1.addMemory('mem1', 'data1', undefined, { project: 'p1' });
      await store1.addMemory('mem2', 'data2', undefined, { project: 'p2' });

      // Second instance: read
      const store2 = new MemoryStore(dbPath);
      await store2.init();
      expect(store2.getMemoryCount()).toBe(2);
      expect(store2.getMemory('mem1')?.metadata.project).toBe('p1');
    });

    it('should handle gzipped data', async () => {
      // Manually write gzipped data to simulate existing compressed file
      const { gzipSync } = await import('zlib');
      const data = [{ id: 'mem1', content: 'test', metadata: {}, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), access_count: 0 }];
      const json = JSON.stringify(data);
      const compressed = gzipSync(json);
      await require('fs/promises').writeFile(dbPath, compressed);

      const store = new MemoryStore(dbPath);
      await store.init();
      expect(store.getMemoryCount()).toBe(1);
      expect(store.getMemory('mem1')?.content).toBe('test');
    });

    it('should convert uncompressed to compressed on save', async () => {
      const store = new MemoryStore(dbPath);
      await store.init();
      await store.addMemory('mem1', 'content', undefined, {});

      // Check file exists and is gzipped
      const buf = await require('fs/promises').readFile(dbPath);
      expect(buf[0]).toBe(0x1f); // gzip magic bytes
      expect(buf[1]).toBe(0x8b);
    });

    it('should handle corrupted file gracefully', async () => {
      await require('fs/promises').writeFile(dbPath, 'corrupted data');
      const store = new MemoryStore(dbPath);
      // init should not throw, just log warning
      await store.init();
      expect(store.getMemoryCount()).toBe(0);
    });

    it('should handle missing file gracefully', async () => {
      const store = new MemoryStore(dbPath);
      await store.init(); // no error even if file doesn't exist
      expect(store.getMemoryCount()).toBe(0);
    });
  });

  describe('access tracking', () => {
    it('should increment access count on updateMemory without content change', async () => {
      const store = new MemoryStore(dbPath);
      await store.init();

      await store.addMemory('mem1', 'content', undefined, {});
      expect(store.getMemory('mem1')?.access_count).toBe(0);

      await store.updateMemory('mem1', undefined, { touch: true });
      expect(store.getMemory('mem1')?.access_count).toBe(1);
    });
  });
});

describe('MemoryStorage', () => {
  let testDir: string;
  let dbPath: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `picro-memstorage-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    dbPath = join(testDir, 'memory.json');
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('add()', () => {
    it('should add memory with full metadata', async () => {
      const store = new MemoryStorage({ store: new MemoryStore(dbPath) });
      await (store.getStore() as any).init();

      const id = await store.add(
        'content here',
        'read_file',
        'my-project',
        { filePath: '/path/to/file', summary: 'summary' }
      );

      expect(id).toBeDefined();
      const mem = store.get(id);
      expect(mem?.content).toContain('[READ_FILE]');
      expect(mem?.metadata._action).toBe('read_file');
      expect(mem?.metadata._project).toBe('my-project');
      expect(mem?.metadata.filePath).toBe('/path/to/file');
    });

    it('should prevent duplicates via hash', async () => {
      const store = new MemoryStorage({ store: new MemoryStore(dbPath) });
      await (store.getStore() as any).init();

      const id1 = await store.add('content', 'read_file', 'proj1', {});
      const id2 = await store.add('content', 'read_file', 'proj1', {});

      expect(id1).toBe(id2); // same ID due to duplicate detection
      expect(store.count()).toBe(1);
    });

    it('should evict least accessed when exceeds maxMemories', async () => {
      const store = new MemoryStorage({
        store: new MemoryStore(dbPath),
        maxMemories: 3,
      });
      await (store.getStore() as any).init();

      // Add 4 memories
      const ids: string[] = [];
      for (let i = 0; i < 4; i++) {
        ids.push(await store.add(`content${i}`, 'read_file', 'proj', { idx: i }));
      }

      // Should have evicted one (least accessed)
      expect(store.count()).toBe(3);
      // The first one (least accessed) should be gone
      const firstMem = store.get(ids[0]);
      expect(firstMem).toBeUndefined();
    });

    it('should respect access count during eviction', async () => {
      const store = new MemoryStorage({
        store: new MemoryStore(dbPath),
        maxMemories: 2,
      });
      await (store.getStore() as any).init();

      const id1 = await store.add('a', 'read_file', 'proj', {});
      const id2 = await store.add('b', 'read_file', 'proj', {});

      // Access id1 multiple times
      await store.update(id1, undefined, { touched: true });
      await store.update(id1, undefined, { touched: true });

      // Add third - should evict id2 (less accessed)
      await store.add('c', 'read_file', 'proj', {});
      expect(store.get(id1)).toBeDefined();
      expect(store.get(id2)).toBeUndefined();
    });
  });

  describe('update()', () => {
    it('should update content and metadata while preserving version', async () => {
      const store = new MemoryStorage({ store: new MemoryStore(dbPath) });
      await (store.getStore() as any).init();

      const id = await store.add('original', 'read_file', 'proj', { key: 'val' });
      await store.update(id, 'updated', { newKey: 'newVal' });

      const mem = store.get(id);
      expect(mem?.content).toBe('updated');
      expect(mem?.metadata.key).toBe('val'); // old preserved
      expect(mem?.metadata.newKey).toBe('newVal');
      expect(mem?.metadata.version).toBe(2);
    });

    it('should not update non-existing memory', async () => {
      const store = new MemoryStorage({ store: new MemoryStore(dbPath) });
      await (store.getStore() as any).init();

      await store.update('bad-id', 'content', {});
      expect(store.count()).toBe(0);
    });
  });

  describe('getBy()', () => {
    it('should filter memories by predicate', async () => {
      const store = new MemoryStorage({ store: new MemoryStore(dbPath) });
      await (store.getStore() as any).init();

      await store.add('content1', 'read_file', 'projA', {});
      await store.add('content2', 'edit_file', 'projB', {});
      await store.add('content3', 'execute_command', 'projA', {});

      const result = store.getBy(m => m.metadata._project === 'projA');
      expect(result.length).toBe(2);
    });
  });

  describe('getRecent()', () => {
    it('should return recent memories in order (newest last)', async () => {
      const store = new MemoryStorage({ store: new MemoryStore(dbPath) });
      await (store.getStore() as any).init();

      await store.add('first', 'read_file', 'proj', {});
      await store.add('second', 'read_file', 'proj', {});
      await store.add('third', 'read_file', 'proj', {});

      const recent = store.getRecent(2);
      expect(recent.length).toBe(2);
      expect(recent[0].content).toBe('[READ_FILE] second');
      expect(recent[1].content).toBe('[READ_FILE] third');
    });
  });
});

describe('memoryHash', () => {
  it('should return consistent hash for same content+metadata', () => {
    const h1 = memoryHash('content', { action: 'read_file', filePath: '/a' });
    const h2 = memoryHash('content', { action: 'read_file', filePath: '/a' });
    expect(h1).toBe(h2);
  });

  it('should return different hashes for different content', () => {
    const h1 = memoryHash('content1', { action: 'read_file' });
    const h2 = memoryHash('content2', { action: 'read_file' });
    expect(h1).not.toBe(h2);
  });

  it('should return consistent hash with empty metadata', () => {
    const h1 = memoryHash('content', {});
    const h2 = memoryHash('content', {});
    expect(h1).toBe(h2);
  });

  it('should be 12 characters hex', () => {
    const h = memoryHash('test', { action: 'edit' });
    expect(h).toHaveLength(12);
    expect(h).toMatch(/^[a-f0-9]+$/);
  });
});

describe('generateId', () => {
  it('should generate unique ids', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateId());
    }
    expect(ids.size).toBe(100);
  });

  it('should be 8 characters hex', () => {
    const id = generateId();
    expect(id).toHaveLength(8);
    expect(id).toMatch(/^[a-f0-9]+$/);
  });
});
