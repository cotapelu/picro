// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for resource-bundle atom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SimpleResourceBundle, loadBundleFromFile, createBundleFromUrls, saveBundle, type ResourceBundle } from './resource-bundle';

// Mock fs and fetch
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

vi.stubGlobal('fetch', vi.fn());
vi.stubGlobal('Buffer', { from: () => ({ toString: () => 'aGVsbG8=' }) });

describe('ResourceBundle', () => {
  describe('SimpleResourceBundle', () => {
    it('should store resources in map', () => {
      const resources = new Map([['test.png', 'base64data']]);
      const bundle = new SimpleResourceBundle(resources);
      expect(bundle.get('test.png')).toBe('base64data');
      expect(bundle.has('test.png')).toBe(true);
    });

    it('names() should return all keys', () => {
      const resources = new Map([['a', '1'], ['b', '2']]);
      const bundle = new SimpleResourceBundle(resources);
      expect(bundle.names().sort()).toEqual(['a', 'b']);
    });

    it('get() should return undefined for missing', () => {
      const bundle = new SimpleResourceBundle(new Map());
      expect(bundle.get('missing')).toBeUndefined();
    });
  });

  describe('loadBundleFromFile()', () => {
    beforeEach(() => {
      (require('fs').readFileSync as any).mockReturnValue(JSON.stringify({ resources: { 'img.png': 'data' } }));
    });

    it('should read and parse JSON file', async () => {
      const bundle = await loadBundleFromFile('/path/bundle.json');
      expect(bundle.has('img.png')).toBe(true);
    });

    it('should handle bare object without resources wrapper', async () => {
      (require('fs').readFileSync as any).mockReturnValue(JSON.stringify({ 'img.png': 'data' }));
      const bundle = await loadBundleFromFile('/path/bundle.json');
      expect(bundle.has('img.png')).toBe(true);
    });
  });

  describe('createBundleFromUrls()', () => {
    it('should fetch each URL and store base64', async () => {
      const mockFetch = vi.mocked(global.fetch) as any;
      mockFetch.mockResolvedValue({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(1)) });
      const bundle = await createBundleFromUrls(['http://example.com/img.png']);
      expect(bundle.has('http://example.com/img.png')).toBe(true);
    });

    it('should throw on fetch failure', async () => {
      const mockFetch = vi.mocked(global.fetch) as any;
      mockFetch.mockResolvedValue({ ok: false, statusText: 'Not Found' });
      await expect(createBundleFromUrls(['http://bad'])).rejects.toThrow('Failed to fetch');
    });
  });

  describe('saveBundle()', () => {
    beforeEach(() => {
      vi.mocked(require('fs').writeFileSync).mockClear();
    });

    it('should write JSON file', async () => {
      const bundle = new SimpleResourceBundle(new Map([['test', 'data']]));
      await saveBundle(bundle, '/out/bundle.json');
      (require('fs').writeFileSync as any).toHaveBeenCalled();
    });
  });
});