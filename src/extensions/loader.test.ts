// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadExtensions, loadExtension } from './loader.js';
import { createExtensionRuntime } from './runner.js';

// Mock fs
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  statSync: vi.fn(() => ({ isDirectory: () => false })),
}));

// Mock dynamic import
vi.stubGlobal('import', vi.fn());

describe('extensions/loader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global as any).import = vi.fn();
  });

  describe('loadExtensions', () => {
    it('returns empty when no paths', async () => {
      const result = await loadExtensions([], '/cwd');
      expect(result.extensions).toEqual([]);
      expect(result.errors).toEqual([]);
      expect(result.runtime).toBeDefined();
    });

    it('error when path does not exist', async () => {
      const exists = require('node:fs').existsSync as any;
      exists.mockReturnValue(false);

      const result = await loadExtensions(['bad'], '/cwd');
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.extensions.length).toBe(0);
    });

    it('collision detection for extension names', async () => {
      const exists = require('node:fs').existsSync as any;
      exists.mockReturnValue(true);
      const stat = require('node:fs').statSync as any;
      stat.mockReturnValue({ isDirectory: () => false });

      const ext1 = { name: 'dup', tools: [], commands: [] };
      const ext2 = { name: 'dup', tools: [], commands: [] };

      (global as any).import.mockResolvedValueOnce({ default: () => ext1 });
      (global as any).import.mockResolvedValueOnce({ default: () => ext2 });

      const result = await loadExtensions(['e1.js', 'e2.js'], '/cwd');
      expect(result.errors.some(e => e.error.includes('Duplicate extension name'))).toBe(true);
    });
  });

  describe('loadExtension', () => {
    it('throws if path missing', async () => {
      const exists = require('node:fs').existsSync as any;
      exists.mockReturnValue(false);
      await expect(loadExtension('missing', '/cwd', null, {} as any)).rejects.toThrow('does not exist');
    });

    it('loads valid extension', async () => {
      const exists = require('node:fs').existsSync as any;
      exists.mockReturnValue(true);
      const stat = require('node:fs').statSync as any;
      stat.mockReturnValue({ isDirectory: () => false });

      const ext = { name: 'test', tools: [], commands: [] };
      (global as any).import.mockResolvedValue({ default: () => ext });

      const result = await loadExtension('ext.js', '/cwd', null, {} as any);
      expect(result?.name).toBe('test');
    });

    it('throws when factory missing', async () => {
      const exists = require('node:fs').existsSync as any;
      exists.mockReturnValue(true);
      const stat = require('node:fs').statSync as any;
      stat.mockReturnValue({ isDirectory: () => false });

      (global as any).import.mockResolvedValue({}); // no factory

      await expect(loadExtension('ext.js', '/cwd', null, {} as any)).rejects.toThrow('must export');
    });
  });
});
