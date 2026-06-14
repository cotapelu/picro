// SPDX-License-Identifier: Apache-2.0
/**
 * Branch coverage tests for FileMutationQueue.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FileMutationQueue } from './file-mutation-queue.js';
import { mkdir, rm, writeFile, readFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('FileMutationQueue branch coverage', () => {
  let queue: FileMutationQueue;
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `picro-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    queue = new FileMutationQueue(testDir);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('queueEdit', () => {
    it('queues mutation when oldText found', async () => {
      const file = join(testDir, 'a.txt');
      await writeFile(file, 'Hello World');

      await queue.queueEdit({
        path: 'a.txt',
        oldText: 'Hello',
        newText: 'Hi',
      });

      const mutations = (queue as any).mutations;
      expect(mutations.length).toBe(1);
      expect(mutations[0].oldContent).toBe('Hello World');
      expect(mutations[0].newContent).toBe('Hi World');
    });

    it('throws when oldText not found', async () => {
      const file = join(testDir, 'b.txt');
      await writeFile(file, 'Content');

      await expect(
        queue.queueEdit({
          path: 'b.txt',
          oldText: 'Missing',
          newText: 'New',
        })
      ).rejects.toThrow('Could not find text to replace');

      const mutations = (queue as any).mutations;
      expect(mutations.length).toBe(0);
    });

    it('handles empty oldText (insert at beginning)', async () => {
      const file = join(testDir, 'c.txt');
      await writeFile(file, 'Existing');

      await queue.queueEdit({
        path: 'c.txt',
        oldText: '',
        newText: 'Prefix-',
      });

      const mutations = (queue as any).mutations;
      expect(mutations.length).toBe(1);
      expect(mutations[0].newContent).toContain('Prefix-Existing');
    });

    it('preserves original content including CRLF', async () => {
      const file = join(testDir, 'd.txt');
      await writeFile(file, 'Line1\r\nLine2');

      await queue.queueEdit({
        path: 'd.txt',
        oldText: 'Line1',
        newText: 'One',
      });

      const mutations = (queue as any).mutations;
      expect(mutations[0].oldContent).toBe('Line1\r\nLine2');
      expect(mutations[0].newContent).toContain('One\n');
    });
  });

  describe('applyAll', () => {
    it('returns zero for empty queue', async () => {
      const result = await queue.applyAll();
      expect(result).toEqual({ applied: 0, files: [] });
    });

    it('applies all mutations and clears queue', async () => {
      const file = join(testDir, 'apply.txt');
      await writeFile(file, 'A B C');

      await queue.queueEdit({ path: 'apply.txt', oldText: 'A', newText: 'X' });
      await queue.queueEdit({ path: 'apply.txt', oldText: 'B', newText: 'Y' });
      await queue.queueEdit({ path: 'apply.txt', oldText: 'C', newText: 'Z' });

      const result = await queue.applyAll();

      expect(result.applied).toBe(3);
      expect(result.files).toContain('apply.txt');
      expect((queue as any).mutations.length).toBe(0);
      expect((queue as any).snapshots.length).toBe(0);
    });

  });

  describe('rollback', () => {
    it('restores existing file from snapshot', async () => {
      const file = join(testDir, 'restore.txt');
      await writeFile(file, 'before');

      const q = new FileMutationQueue(testDir);
      // Manually set snapshot (simulating state after queueEdit before apply)
      (q as any).snapshots.push({
        path: file,
        content: 'before',
        mtimeMs: Date.now(),
      });
      // Simulate file was changed
      await writeFile(file, 'after');

      const result = await (q as any).rollback();

      expect(result.rolledBack).toBe(1);
      expect(await readFile(file, 'utf-8')).toBe('before');
    });

    it('deletes created file on rollback when mtimeMs is 0', async () => {
      const file = join(testDir, 'created.txt');
      const q = new FileMutationQueue(testDir);
      (q as any).snapshots.push({ path: file, content: '', mtimeMs: 0 });
      await writeFile(file, 'new content');

      await (q as any).rollback();

      try {
        await readFile(file, 'utf-8');
        expect(false).toBe(true); // should not exist
      } catch (e: any) {
        if (e.code !== 'ENOENT') throw e;
      }
    });

    it('clears mutations and snapshots after rollback', async () => {
      const file = join(testDir, 'clear.txt');
      await writeFile(file, 'orig');
      const q = new FileMutationQueue(testDir);
      (q as any).snapshots.push({ path: file, content: 'orig', mtimeMs: Date.now() });
      await (q as any).rollback();
      expect((q as any).mutations.length).toBe(0);
      expect((q as any).snapshots.length).toBe(0);
    });
  });

  describe('rollback', () => {
    it('restores existing file from snapshot', async () => {
      const file = join(testDir, 'restore.txt');
      await writeFile(file, 'before');

      const q = new FileMutationQueue(testDir);
      (q as any).snapshots.push({
        path: file,
        content: 'before',
        mtimeMs: Date.now(),
      });
      await writeFile(file, 'after');

      const result = await (q as any).rollback();

      expect(result.rolledBack).toBe(1);
      expect(await readFile(file, 'utf-8')).toBe('before');
    });

    it('deletes created file on rollback when mtimeMs is 0', async () => {
      const file = join(testDir, 'created.txt');
      const q = new FileMutationQueue(testDir);
      (q as any).snapshots.push({ path: file, content: '', mtimeMs: 0 });
      await writeFile(file, 'new content');

      await (q as any).rollback();

      try {
        await readFile(file, 'utf-8');
        expect(false).toBe(true);
      } catch (e: any) {
        if (e.code !== 'ENOENT') throw e;
      }
    });

    it('clears mutations and snapshots after rollback', async () => {
      const file = join(testDir, 'clear.txt');
      await writeFile(file, 'orig');
      const q = new FileMutationQueue(testDir);
      (q as any).snapshots.push({ path: file, content: 'orig', mtimeMs: Date.now() });
      await (q as any).rollback();
      expect((q as any).mutations.length).toBe(0);
      expect((q as any).snapshots.length).toBe(0);
    });
  });

  describe('clear', () => {
    it('empties mutations and snapshots', () => {
      queue.clear();
      expect((queue as any).mutations.length).toBe(0);
      expect((queue as any).snapshots.length).toBe(0);
    });
  });

  describe('preview', () => {
    it('returns list of changes without applying', async () => {
      const file = join(testDir, 'prev.txt');
      await writeFile(file, 'Old Text');

      await queue.queueEdit({ path: 'prev.txt', oldText: 'Old', newText: 'New' });

      const changes = queue.preview();
      expect(changes.length).toBe(1);
      expect(changes[0].oldContent).toBe('Old Text');
      expect(changes[0].newContent).toBe('New Text');
    });
  });

  describe('edge cases', () => {
    it('handles multiple files edited', async () => {
      const f1 = join(testDir, '1.txt');
      const f2 = join(testDir, '2.txt');
      await writeFile(f1, '1');
      await writeFile(f2, '2');

      await queue.queueEdit({ path: '1.txt', oldText: '1', newText: 'A' });
      await queue.queueEdit({ path: '2.txt', oldText: '2', newText: 'B' });

      const result = await queue.applyAll();
      expect(result.applied).toBe(2);

      expect(await readFile(f1, 'utf-8')).toBe('A');
      expect(await readFile(f2, 'utf-8')).toBe('B');
    });

    it('queue length reflects pending mutations', async () => {
      const f1 = join(testDir, 'x.txt');
      const f2 = join(testDir, 'y.txt');
      await writeFile(f1, 'x');
      await writeFile(f2, 'y');

      expect(queue.length).toBe(0);
      await queue.queueEdit({ path: 'x.txt', oldText: 'x', newText: 'y' });
      expect(queue.length).toBe(1);
      await queue.queueEdit({ path: 'y.txt', oldText: 'y', newText: 'z' });
      expect(queue.length).toBe(2);
    });
  });
});
