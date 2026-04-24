import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HistoryStore } from '../src/history-store.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('HistoryStore', () => {
  let tempPath: string;
  let store: HistoryStore;

  beforeEach(() => {
    // Create a temporary directory within test directory
    tempPath = path.join(__dirname, '.test-history.json');
    // Clean up if exists
    try { fs.unlinkSync(tempPath); } catch {}
    store = new HistoryStore(tempPath);
  });

  it('should load empty when file does not exist', async () => {
    const history = await store.load();
    expect(history).toEqual([]);
  });

  it('should save and load history', async () => {
    await store.save(['cmd1', 'cmd2', 'cmd3']);
    const loaded = await store.load();
    expect(loaded).toEqual(['cmd1', 'cmd2', 'cmd3']);
  });

  it('should trim history to last 1000 entries', async () => {
    const many = Array.from({ length: 1500 }, (_, i) => `cmd${i}`);
    await store.save(many);
    const loaded = await store.load();
    expect(loaded.length).toBe(1000);
    expect(loaded[0]).toBe('cmd500'); // first 500 trimmed
    expect(loaded[999]).toBe('cmd1499');
  });

  afterEach(() => {
    try { fs.unlinkSync(tempPath); } catch {}
  });
});
