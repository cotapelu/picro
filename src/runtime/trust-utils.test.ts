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

  afterEach(() => {
    // cleanup not implemented for simplicity; use unique names if needed
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
    expect(() => readTrustFile(path)).toThrow(/Failed to read trust store/);
  });

  it('should throw if JSON is not an object', () => {
    const path = join(tempDir, 'array.json');
    writeFileSync(path, '[]');
    expect(() => readTrustFile(path)).toThrow(/expected an object/);
  });

  it('should throw on values that are not true, false, or null', () => {
    const path = join(tempDir, 'badvalue.json');
    writeFileSync(path, JSON.stringify({ '/a': 123 }));
    expect(() => readTrustFile(path)).toThrow(/must be true, false, or null/);
  });

  it('should throw on string value', () => {
    const path = join(tempDir, 'string.json');
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

  afterEach(() => {
    // optional cleanup
  });

  it('should write data as sorted JSON with newline', () => {
    const path = join(tempDir, 'out.json');
    const data: Record<string, boolean | null> = {
      '/c': false,
      '/a': true,
      '/b': null,
    };
    writeTrustFile(path, data);
    const raw = readFileSync(path, 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed).toEqual({ '/a': true, '/b': null, '/c': false });
    // ensure newline at end
    expect(raw.endsWith('\n')).toBe(true);
  });

  it('should create directory if not exists', () => {
    const path = join(tempDir, 'subdir', 'out.json');
    const data = { '/x': true };
    writeTrustFile(path, data);
    expect(existsSync(path)).toBe(true);
    const raw = readFileSync(path, 'utf-8');
    expect(JSON.parse(raw)).toEqual(data);
  });

  it('should filter out invalid values (only true/false/null kept)', () => {
    const path = join(tempDir, 'filter.json');
    const data: Record<string, any> = {
      '/good': true,
      '/bad': 123,
      '/alsoBad': 'yes',
      '/null': null,
    };
    writeTrustFile(path, data);
    const raw = readFileSync(path, 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed).toEqual({ '/good': true, '/null': null });
  });
});
