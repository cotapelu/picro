// SPDX-License-Identifier: Apache-2.0
/**
 * Unit tests for file tools (read, write, edit, ls) with path confinement.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { createReadToolDefinition } from './read';
import { createWriteToolDefinition } from './write';
import { createEditToolDefinition } from './edit';
import { createLsToolDefinition, type LsEntry } from './ls';

// Helper to create a temporary test directory structure
function setupTestEnv() {
  const testCwd = join(tmpdir(), `picro-test-${Date.now()}`);
  mkdirSync(testCwd, { recursive: true });

  // Create some test files
  const subDir = join(testCwd, 'subdir');
  mkdirSync(subDir, { recursive: true });

  writeFileSync(join(testCwd, 'file1.txt'), 'Hello World');
  writeFileSync(join(testCwd, 'file2.txt'), 'Line 1\nLine 2\nLine 3');
  writeFileSync(join(subDir, 'nested.txt'), 'Nested content');

  return testCwd;
}

function cleanupTestEnv(testCwd: string) {
  try {
    rmSync(testCwd, { recursive: true, force: true });
  } catch {
    // ignore cleanup errors
  }
}

describe('Read Tool', () => {
  let testCwd: string;

  beforeEach(() => {
    testCwd = setupTestEnv();
  });

  afterEach(() => {
    cleanupTestEnv(testCwd);
  });

  it('should read a simple file', async () => {
    const readTool = createReadToolDefinition(testCwd);
    const result = await readTool.execute({ path: 'file1.txt' });

    expect(result.content).toBe('Hello World');
    expect(result.path).toBe('file1.txt');
    expect(result.size).toBe(11);
    expect(result.lineCount).toBe(1);
  });

  it('should read file with offset and maxLines', async () => {
    const readTool = createReadToolDefinition(testCwd);
    const result = await readTool.execute({ path: 'file2.txt', offset: 1, maxLines: 2 });

    expect(result.content).toBe('Line 2\nLine 3');
    expect(result.lineCount).toBe(2);
  });

  it('should handle file not found', async () => {
    const readTool = createReadToolDefinition(testCwd);
    await expect(readTool.execute({ path: 'nonexistent.txt' })).rejects.toThrow('File not found');
  });

  it('should resolve relative path within cwd', async () => {
    const readTool = createReadToolDefinition(testCwd);
    const result = await readTool.execute({ path: 'subdir/nested.txt' });
    expect(result.content).toBe('Nested content');
  });

  it('should reject path traversal outside cwd', async () => {
    const readTool = createReadToolDefinition(testCwd);
    // Attempt to read outside cwd using ../
    await expect(readTool.execute({ path: '../../../etc/passwd' })).rejects.toThrow('Access denied');
  });

  it('should reject absolute path outside cwd', async () => {
    const readTool = createReadToolDefinition(testCwd);
    const outsidePath = join(testCwd, '..', 'somefile.txt');
    await expect(readTool.execute({ path: outsidePath })).rejects.toThrow('Access denied');
  });

  it('should expand ~ to home directory, but still validate within cwd', async () => {
    // Since home dir is outside testCwd, this should be rejected
    const readTool = createReadToolDefinition(testCwd);
    await expect(readTool.execute({ path: '~/.bashrc' })).rejects.toThrow('Access denied');
  });

  it('should handle large files with maxLines limit', async () => {
    const largeContent = Array.from({ length: 1000 }, (_, i) => `Line ${i}`).join('\n');
    writeFileSync(join(testCwd, 'large.txt'), largeContent);

    const readTool = createReadToolDefinition(testCwd);
    const result = await readTool.execute({ path: 'large.txt', maxLines: 10 });

    expect(result.lineCount).toBe(10);
    expect(result.content).toContain('Line 0');
    expect(result.content).not.toContain('Line 10');
  });
});

describe('Write Tool', () => {
  let testCwd: string;

  beforeEach(() => {
    testCwd = setupTestEnv();
  });

  afterEach(() => {
    cleanupTestEnv(testCwd);
  });

  it('should write a new file', async () => {
    const writeTool = createWriteToolDefinition(testCwd);
    const result = await writeTool.execute({ path: 'newfile.txt', content: 'New content' });

    expect(result.success).toBe(true);
    expect(result.path).toBe('newfile.txt');
    // 'New content' = 11 bytes
    expect(result.bytesWritten).toBe(11);

    const fullPath = join(testCwd, 'newfile.txt');
    expect(existsSync(fullPath)).toBe(true);
    expect(readFileSync(fullPath, 'utf8')).toBe('New content');
  });

  it('should append to existing file', async () => {
    const writeTool = createWriteToolDefinition(testCwd);
    await writeTool.execute({ path: 'file1.txt', content: ' Appended', append: true });

    const fullPath = join(testCwd, 'file1.txt');
    expect(readFileSync(fullPath, 'utf8')).toBe('Hello World Appended');
  });

  it('should create directories when needed', async () => {
    const writeTool = createWriteToolDefinition(testCwd);
    const result = await writeTool.execute({ path: 'newdir/subdir/file.txt', content: 'Deep content' });

    expect(result.success).toBe(true);
    const fullPath = join(testCwd, 'newdir', 'subdir', 'file.txt');
    expect(existsSync(fullPath)).toBe(true);
  });

  it('should reject path traversal', async () => {
    const writeTool = createWriteToolDefinition(testCwd);
    await expect(writeTool.execute({ path: '../outside.txt', content: 'bad' })).rejects.toThrow('Access denied');
  });

  it('should reject write to file outside cwd', async () => {
    const writeTool = createWriteToolDefinition(testCwd);
    const outsidePath = join(testCwd, '..', 'outside.txt');
    await expect(writeTool.execute({ path: outsidePath, content: 'bad' })).rejects.toThrow('Access denied');
  });
});

describe('Edit Tool', () => {
  let testCwd: string;

  beforeEach(() => {
    testCwd = setupTestEnv();
  });

  afterEach(() => {
    cleanupTestEnv(testCwd);
  });

  it('should replace text in file', async () => {
    const editTool = createEditToolDefinition(testCwd);
    const result = await editTool.execute({ path: 'file1.txt', oldString: 'World', newString: 'Universe' });

    expect(result.success).toBe(true);
    expect(result.changed).toBe(true);
    expect(result.path).toBe('file1.txt');

    const fullPath = join(testCwd, 'file1.txt');
    expect(readFileSync(fullPath, 'utf8')).toBe('Hello Universe');
  });

  it('should return not changed if oldString not found', async () => {
    const editTool = createEditToolDefinition(testCwd);
    const result = await editTool.execute({ path: 'file1.txt', oldString: 'Nonexistent', newString: 'New' });

    expect(result.success).toBe(false);
    expect(result.changed).toBe(false);
  });

  it('should support dry run', async () => {
    const editTool = createEditToolDefinition(testCwd);
    const result = await editTool.execute({ path: 'file1.txt', oldString: 'World', newString: 'Universe', dryRun: true });

    expect(result.success).toBe(true);
    expect(result.changed).toBe(true);
    expect(result.dryRun).toBe(true);

    // File should be unchanged
    const fullPath = join(testCwd, 'file1.txt');
    expect(readFileSync(fullPath, 'utf8')).toBe('Hello World');
  });

  it('should reject path traversal', async () => {
    const editTool = createEditToolDefinition(testCwd);
    await expect(editTool.execute({ path: '../file1.txt', oldString: 'World', newString: 'X' })).rejects.toThrow('Access denied');
  });
});

describe('Ls Tool', () => {
  let testCwd: string;

  beforeEach(() => {
    testCwd = setupTestEnv();
  });

  afterEach(() => {
    cleanupTestEnv(testCwd);
  });

  it('should list current directory', async () => {
    const lsTool = createLsToolDefinition(testCwd);
    const result = await lsTool.execute({});

    expect(result.count).toBeGreaterThan(0);
    const names = result.entries.map((e: LsEntry) => e.name);
    expect(names).toContain('file1.txt');
    expect(names).toContain('file2.txt');
    expect(names).toContain('subdir');
  });

  it('should list subdirectory', async () => {
    const lsTool = createLsToolDefinition(testCwd);
    const result = await lsTool.execute({ path: 'subdir' });

    expect(result.count).toBe(1);
    expect(result.entries[0].name).toBe('nested.txt');
  });

  it('should respect includeHidden flag', async () => {
    const hiddenFile = join(testCwd, '.hidden');
    writeFileSync(hiddenFile, 'hidden');

    const lsTool = createLsToolDefinition(testCwd);
    const resultWithout = await lsTool.execute({ includeHidden: false });
    const resultWith = await lsTool.execute({ includeHidden: true });

    expect(resultWithout.entries.find((e: LsEntry) => e.name === '.hidden')).toBeUndefined();
    expect(resultWith.entries.find((e: LsEntry) => e.name === '.hidden')).toBeDefined();
  });

  it('should reject path traversal', async () => {
    const lsTool = createLsToolDefinition(testCwd);
    await expect(lsTool.execute({ path: '../' })).rejects.toThrow('Access denied');
  });

  it('should handle non-existent path', async () => {
    const lsTool = createLsToolDefinition(testCwd);
    await expect(lsTool.execute({ path: 'nonexistent' })).rejects.toThrow('Failed to read directory');
  });
});
