import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryStore, MemoryStorage, memoryHash, generateId } from '../src/storage';
import { AgentMemoryApp } from '../src/agent-app';
import * as fs from 'fs';
import * as os from 'os';

describe('MemoryStore', () => {
  let store: MemoryStore;
  let tempDbPath: string;

  beforeEach(() => {
    // Create a temporary database file
    tempDbPath = `${os.tmpdir()}/test-memory-${Date.now()}.json`;
    store = new MemoryStore(tempDbPath);
  });

  afterEach(() => {
    // Clean up temporary file
    if (fs.existsSync(tempDbPath)) {
      fs.unlinkSync(tempDbPath);
    }
  });

  it('should create a new memory store', () => {
    expect(store).toBeDefined();
  });

  it('should add memory', async () => {
    await store.addMemory('test-id', 'test-content', undefined, { key: 'value' });
    const result = store.getMemory('test-id');
    expect(result).toBeDefined();
    expect(result?.content).toBe('test-content');
  });

  it('should get memory', async () => {
    await store.addMemory('key1', 'value1');
    const result = store.getMemory('key1');
    expect(result?.content).toBe('value1');
  });

  it('should return undefined for non-existent key', () => {
    const result = store.getMemory('non-existent');
    expect(result).toBeUndefined();
  });

  it('should clear all memory', async () => {
    await store.addMemory('key1', 'value1');
    await store.addMemory('key2', 'value2');
    await store.clear();
    const result1 = store.getMemory('key1');
    const result2 = store.getMemory('key2');
    expect(result1).toBeUndefined();
    expect(result2).toBeUndefined();
  });

  it('should get memory count', async () => {
    await store.addMemory('key1', 'value1');
    await store.addMemory('key2', 'value2');
    const count = store.getMemoryCount();
    expect(count).toBe(2);
  });

  it('should delete specific memory', async () => {
    await store.addMemory('key1', 'value1');
    await store.addMemory('key2', 'value2');
    await store.deleteMemory('key1');
    const result1 = store.getMemory('key1');
    const result2 = store.getMemory('key2');
    expect(result1).toBeUndefined();
    expect(result2).toBeDefined();
  });

  it('should update existing memory', async () => {
    await store.addMemory('key1', 'value1');
    await store.updateMemory('key1', 'value2', { updated: true });
    const result = store.getMemory('key1');
    expect(result?.content).toBe('value2');
    expect(result?.metadata?.updated).toBe(true);
  });

  it('should get all memories', () => {
    store.addMemory('key1', 'value1');
    store.addMemory('key2', 'value2');
    const all = store.getAllMemories();
    expect(all.length).toBe(2);
  });

  it('should update memory access count', async () => {
    await store.addMemory('key1', 'value1');
    await store.updateMemory('key1');
    const result = store.getMemory('key1');
    expect(result?.access_count).toBe(1);
  });
});

describe('MemoryStorage', () => {
  let storage: MemoryStorage;
  let tempDbPath: string;

  beforeEach(() => {
    tempDbPath = `${os.tmpdir()}/test-storage-${Date.now()}.json`;
    const store = new MemoryStore(tempDbPath);
    storage = new MemoryStorage({ store, maxMemories: 10 });
  });

  afterEach(() => {
    if (fs.existsSync(tempDbPath)) {
      fs.unlinkSync(tempDbPath);
    }
  });

  it('should create a new memory storage', () => {
    expect(storage).toBeDefined();
  });

  it('should add memory with action and project', async () => {
    const id = await storage.add('test content', 'read_file', 'test-project');
    expect(id).toBeDefined();
    const mem = storage.get(id);
    expect(mem?.content).toContain('test content');
  });

  it('should get memory by id', async () => {
    const id = await storage.add('value1', 'edit_file', 'project1');
    const result = storage.get(id);
    expect(result).toBeDefined();
    expect(result?.content).toContain('value1');
  });

  it('should delete memory', async () => {
    const id = await storage.add('value1', 'read_file', 'project1');
    await storage.delete(id);
    const result = storage.get(id);
    expect(result).toBeUndefined();
  });

  it('should count memories', async () => {
    await storage.add('value1', 'read_file', 'project1');
    await storage.add('value2', 'edit_file', 'project1');
    const count = storage.count();
    expect(count).toBe(2);
  });

  it('should clear all memories', async () => {
    await storage.add('value1', 'read_file', 'project1');
    await storage.add('value2', 'edit_file', 'project1');
    await storage.clear();
    const count = storage.count();
    expect(count).toBe(0);
  });

  it('should get all memories', async () => {
    await storage.add('value1', 'read_file', 'project1');
    await storage.add('value2', 'edit_file', 'project1');
    const all = storage.getAll();
    expect(all.length).toBe(2);
  });

  it('should get recent memories', async () => {
    await storage.add('value1', 'read_file', 'project1');
    await storage.add('value2', 'edit_file', 'project1');
    await storage.add('value3', 'read_file', 'project1');
    const recent = storage.getRecent(2);
    expect(recent.length).toBe(2);
  });

  it('should filter memories by predicate', async () => {
    await storage.add('value1', 'read_file', 'project1');
    await storage.add('value2', 'edit_file', 'project1');
    const all = storage.getAll();
    const filtered = all.filter((mem) => 
      mem.content?.includes('value1')
    );
    expect(filtered.length).toBe(1);
  });

  it('should update memory', async () => {
    const id = await storage.add('value1', 'read_file', 'project1');
    await storage.update(id, 'updated content', { newKey: 'newValue' });
    const mem = storage.get(id);
    expect(mem?.content).toContain('updated content');
    expect(mem?.metadata?.newKey).toBe('newValue');
  });

  it('should enforce max memories limit', async () => {
    // Add more memories than maxMemories (10)
    for (let i = 0; i < 15; i++) {
      await storage.add(`value${i}`, 'read_file', 'project1');
    }
    const count = storage.count();
    expect(count).toBeLessThanOrEqual(10);
  });
});

describe('AgentMemoryApp', () => {
  let memoryApp: AgentMemoryApp;
  let tempDbPath: string;

  beforeEach(async () => {
    tempDbPath = `${os.tmpdir()}/test-agent-memory-${Date.now()}.json`;
    const store = new MemoryStore(tempDbPath);
    memoryApp = new AgentMemoryApp(store, 'test-project');
    await memoryApp.init();
  });

  afterEach(() => {
    if (fs.existsSync(tempDbPath)) {
      fs.unlinkSync(tempDbPath);
    }
  });

  it('should create a new memory app', () => {
    expect(memoryApp).toBeDefined();
  });

  it('should remember file read', async () => {
    const id = await memoryApp.rememberFileRead('/path/to/file.txt', 'file content summary');
    expect(id).toBeDefined();
    const count = await memoryApp.getMemoryCount();
    expect(count).toBeGreaterThan(0);
  });

  it('should remember file edit', async () => {
    const id = await memoryApp.rememberFileEdit('/path/to/file.txt', 'fixed bug');
    expect(id).toBeDefined();
  });

  it('should remember command', async () => {
    const id = await memoryApp.rememberCommand('npm install', 'installed packages');
    expect(id).toBeDefined();
  });

  it('should remember project info', async () => {
    const id = await memoryApp.rememberProjectInfo('Project uses Express and MongoDB');
    expect(id).toBeDefined();
  });

  it('should remember task info', async () => {
    const id = await memoryApp.rememberTaskInfo('task-123', 'Task completed successfully');
    expect(id).toBeDefined();
  });

  it('should recall memories by query', async () => {
    await memoryApp.rememberFileRead('/path/to/file.txt', 'important data');
    await memoryApp.rememberFileEdit('/path/to/file.txt', 'fixed critical bug');
    const results = await memoryApp.recall('file');
    expect(results.length).toBeGreaterThan(0);
  });

  it('should get context', () => {
    memoryApp.rememberFileRead('/path/to/file.txt', 'file content');
    const context = memoryApp.getContext();
    expect(context).toBeDefined();
    expect(context.length).toBeGreaterThan(0);
  });

  it('should get recent actions', async () => {
    await memoryApp.rememberFileRead('/path/to/file1.txt', 'content1');
    await memoryApp.rememberFileEdit('/path/to/file2.txt', 'content2');
    const recent = memoryApp.getRecentActions(2);
    expect(recent.length).toBeGreaterThan(0);
  });

  it('should clear all memory', async () => {
    await memoryApp.rememberFileRead('/path/to/file.txt', 'content');
    await memoryApp.clear();
    const count = await memoryApp.getMemoryCount();
    expect(count).toBe(0);
  });

  it('should get memory count', async () => {
    await memoryApp.rememberFileRead('/path/to/file1.txt', 'content1');
    await memoryApp.rememberFileEdit('/path/to/file2.txt', 'content2');
    const count = await memoryApp.getMemoryCount();
    expect(count).toBe(2);
  });

  it('should get memories by action', async () => {
    await memoryApp.rememberFileRead('/path/to/file1.txt', 'content1');
    await memoryApp.rememberFileRead('/path/to/file2.txt', 'content2');
    await memoryApp.rememberFileEdit('/path/to/file3.txt', 'content3');
    const readFiles = memoryApp.getByAction('read_file');
    expect(readFiles.length).toBe(2);
  });

  it('should get memories by file', async () => {
    await memoryApp.rememberFileRead('/path/to/file.txt', 'content1');
    await memoryApp.rememberFileEdit('/path/to/file.txt', 'content2');
    const fileMemories = memoryApp.getByFile('/path/to/file.txt');
    expect(fileMemories.length).toBe(2);
  });

  it('should get stats', async () => {
    await memoryApp.rememberFileRead('/path/to/file1.txt', 'content1');
    await memoryApp.rememberFileEdit('/path/to/file2.txt', 'content2');
    const stats = await memoryApp.getStats();
    expect(stats).toBeDefined();
    expect(Object.keys(stats).length).toBeGreaterThan(0);
  });

  it('should set project', () => {
    memoryApp.setProject('new-project');
    // Should not throw
    expect(true).toBe(true);
  });

  it('should handle empty recall results', async () => {
    const results = await memoryApp.recall('non-existent-query');
    expect(Array.isArray(results)).toBe(true);
  });

  it('should deduplicate identical memories', async () => {
    const id1 = await memoryApp.remember('read_file', 'some content', { filePath: '/a' });
    const id2 = await memoryApp.remember('read_file', 'some content', { filePath: '/a' });
    expect(id1).toBe(id2);
    expect(await memoryApp.getMemoryCount()).toBe(1);
  });
});

describe('Utility Functions', () => {
  it('should generate memory hash', () => {
    const hash1 = memoryHash('test content', { key: 'value' });
    const hash2 = memoryHash('test content', { key: 'value' });
    const hash3 = memoryHash('different content', { key: 'value' });
    
    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
  });

  it('should generate unique IDs', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
    expect(id1.length).toBeGreaterThan(0);
  });
});
