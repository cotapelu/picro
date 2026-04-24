import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { FileTools } from '../src/tools/file-tools.js';

// Mock fs
vi.mock('fs', async () => {
  const actualFs = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actualFs,
    realpathSync: vi.fn().mockImplementation((p: string) => p),
    statSync: vi.fn().mockImplementation((p: string) => {
      if (p.includes('..') || p.startsWith('/etc')) throw new Error('ENOENT');
      return { isFile: () => true, isDirectory: () => false, mtime: { getTime: () => Date.now() } };
    }),
    readFileSync: vi.fn().mockReturnValue('file content'),
  };
});

describe('FileTools Security', () => {
  let tools: FileTools;

  beforeEach(() => {
    tools = new FileTools({ basePath: '/project' });
    vi.clearAllMocks();
  });

  it('should allow paths inside basePath', () => {
    // @ts-ignore
    expect(() => tools.validatePath('/project/src/file.ts')).not.toThrow();
  });

  it('should reject paths outside basePath', () => {
    // @ts-ignore
    expect(() => tools.validatePath('/etc/passwd')).toThrow('Path not allowed');
  });

  it('should block path traversal attempts', () => {
    // Resolve a path that escapes basePath
    const resolved = path.resolve('/project', '../etc/passwd');
    // @ts-ignore
    expect(() => tools.validatePath(resolved)).toThrow('Path not allowed');
  });
});
