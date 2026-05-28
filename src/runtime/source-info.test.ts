import { describe, it, expect } from 'vitest';
import {
  createSyntheticSourceInfo,
  createFileSourceInfo,
  createMemorySourceInfo,
  createSessionSourceInfo,
  type SourceInfo,
} from './source-info.js';

describe('SourceInfo factories', () => {
  describe('createSyntheticSourceInfo', () => {
    it('creates with required fields and defaults', () => {
      const info = createSyntheticSourceInfo('file', 'Test Source');
      expect(info.type).toBe('file');
      expect(info.name).toBe('Test Source');
      expect(info.id).toMatch(/^src-file-\d+$/);
      expect(info.timestamp).toBeGreaterThan(0);
      expect(info.path).toBeUndefined();
      expect(info.metadata).toBeUndefined();
    });

    it('allows overriding id and path', () => {
      const info = createSyntheticSourceInfo('tool', 'Tool', {
        id: 'custom-id',
        path: '/path/to/tool',
        metadata: { version: '1.0' },
      });
      expect(info.id).toBe('custom-id');
      expect(info.path).toBe('/path/to/tool');
      expect(info.metadata).toEqual({ version: '1.0' });
    });

    it('accepts all type variants', () => {
      const types: SourceInfo['type'][] = ['file', 'memory', 'session', 'tool', 'user', 'assistant'];
      types.forEach(type => {
        const info = createSyntheticSourceInfo(type, type);
        expect(info.type).toBe(type);
      });
    });
  });

  describe('createFileSourceInfo', () => {
    it('extracts name from path', () => {
      const info = createFileSourceInfo('/home/user/file.txt');
      expect(info.name).toBe('file.txt');
      expect(info.path).toBe('/home/user/file.txt');
    });

    it('uses fallback name if path ends with slash', () => {
      const info = createFileSourceInfo('/some/dir/');
      // trailing slash yields empty string from split/pop
      expect(info.name).toBe('');
    });

    it('supports custom id and metadata', () => {
      const info = createFileSourceInfo('/a/b/c', {
        id: 'file-1',
        metadata: { size: 100 },
      });
      expect(info.id).toBe('file-1');
      expect(info.metadata).toEqual({ size: 100 });
    });
  });

  describe('createMemorySourceInfo', () => {
    it('constructs id with prefix', () => {
      const info = createMemorySourceInfo('mem-123');
      expect(info.id).toBe('src-memory-mem-123');
      expect(info.name).toBe('Memory: mem-123');
    });

    it('allows custom name', () => {
      const info = createMemorySourceInfo('id', { name: 'Custom Mem' });
      expect(info.name).toBe('Custom Mem');
    });
  });

  describe('createSessionSourceInfo', () => {
    it('constructs id and name from sessionId', () => {
      const info = createSessionSourceInfo('sess-abc');
      expect(info.id).toBe('src-session-sess-abc');
      expect(info.name).toBe('Session: sess-abc');
    });

    it('type is session', () => {
      const info = createSessionSourceInfo('sess');
      expect(info.type).toBe('session');
    });

    it('supports metadata', () => {
      const info = createSessionSourceInfo('sess', { metadata: { user: 'alice' } });
      expect(info.metadata).toEqual({ user: 'alice' });
    });
  });
});
