import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { SearchTools } from '../src/tools/search-tools.js';

// Mock fs
vi.mock('fs', async () => {
  const actualFs = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actualFs,
    existsSync: vi.fn().mockReturnValue(true),
    statSync: vi.fn().mockReturnValue({ isDirectory: () => true }),
    readdirSync: vi.fn().mockReturnValue([]),
    readFileSync: vi.fn().mockReturnValue('content'),
    realpathSync: vi.fn().mockImplementation((p: string) => p), // identity
  };
});

describe('SearchTools Security', () => {
  let tools: SearchTools;

  beforeEach(() => {
    tools = new SearchTools({ basePath: '/allowed' });
    vi.clearAllMocks();
  });

  it('should validatePath allow paths within basePath', () => {
    // @ts-ignore - accessing private method
    tools.validatePath('/allowed/subdir/file.txt');
    // Should not throw
  });

  it('should validatePath reject paths outside basePath', () => {
    // @ts-ignore
    expect(() => tools.validatePath('/etc/passwd')).toThrow('Path not allowed');
  });

  it('should reject paths outside basePath after normalization', () => {
    // Simulate a path that resolves outside basePath
    // @ts-ignore
    const resolved = path.resolve('/allowed', '../etc/passwd'); // -> '/etc/passwd'
    expect(() => tools.validatePath(resolved)).toThrow('Path not allowed');
  });
});
