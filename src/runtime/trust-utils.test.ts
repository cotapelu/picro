import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  findNearestTrustEntry,
  readTrustFile,
  writeTrustFile,
  normalizeCwd,
} from './trust-manager.js';
import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

describe('findNearestTrustEntry', () => {
  it('should return exact match', () => {
    const data: Record<string, boolean | null> = {
      '/a': true,
      '/a/b': false,
    };
    const result = findNearestTrustEntry(data, '/a');
    expect(result).toEqual({ path: '/a', decision: true });
  });

  it('should return parent decision when child not exact', () => {
    const data: Record<string, boolean | null> = {
      '/a': true,
      '/a/b': false,
    };
    const result = findNearestTrustEntry(data, '/a/b/c');
    expect(result).toEqual({ path: '/a/b', decision: false });
  });

  it('should return nearest (deepest) parent', () => {
    const data: Record<string, boolean | null> = {
      '/a': true,
      '/a/b': false,
      '/a/b/c': true,
    };
    const result = findNearestTrustEntry(data, '/a/b/c/d');
    expect(result).toEqual({ path: '/a/b/c', decision: true });
  });

  it('should return null when no matching parent', () => {
    const data: Record<string, boolean | null> = {
      '/x': true,
    };
    const result = findNearestTrustEntry(data, '/a/b');
    expect(result).toBeNull();
  });

  it('should handle root directory', () => {
    const data: Record<string, boolean | null> = {
      '/': false,
    };
    const result = findNearestTrustEntry(data, '/any/sub/dir');
    expect(result).toEqual({ path: '/', decision: false });
  });
});

describe('normalizeCwd', () => {
  it('returns cwd unchanged', () => {
    expect(normalizeCwd('/some/path')).toBe('/some/path');
  });
});

describe('readTrustFile', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(homedir(), '.pi-test', 'trust-utils');
    mkdirSync(tempDir, { recursive: true });
  });

  it('should return empty object if file does not exist', () => {
    const path = join(tempDir, 'nonexistent.json');
    const data = readTrustFile(path);
    expect(data).toEqual({});
  });

  it('should parse valid trust file', () => {
    const path = join(tempDir, 'valid.json');
    const content = JSON.stringify({ '/a': true, '/b': false, '/c': null }, null, 2);
    writeFileSync(path, content);
    const data = readTrustFile(path);
    expect(data).toEqual({ '/a': true, '/b': false, '/c': null });
  });

  it('should throw on invalid JSON', () => {
    const path = join(tempDir, 'invalid.json');
    writeFileSync(path, 'not json');
    expect(() => readTrustFile(path)).toThrow();
  });

  it('should throw on invalid value types', () => {
    const path = join(tempDir, 'invalid-values.json');
    writeFileSync(path, JSON.stringify({ '/a': 'yes' }));
    expect(() => readTrustFile(path)).toThrow();
  });
});

describe('writeTrustFile', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(homedir(), '.pi-test', 'trust-utils-write');
    mkdirSync(tempDir, { recursive: true });
  });

  it('should write and read back trust file', () => {
    const path = join(tempDir, 'trust.json');
    const data: Record<string, boolean | null> = { '/a': true, '/b': false };
    writeTrustFile(path, data);
    const result = readTrustFile(path);
    expect(result).toEqual(data);
  });

  it('should sort keys when writing', () => {
    const path = join(tempDir, 'sorted.json');
    writeTrustFile(path, { '/z': true, '/a': false, '/m': null });
    const content = readFileSync(path, 'utf-8');
    const lines = content.split('\n').filter(l => l.includes('"'));
    expect(lines[0].includes('"/a"')).toBe(true);
    expect(lines[1].includes('"/m"')).toBe(true);
    expect(lines[2].includes('"/z"')).toBe(true);
  });
});
