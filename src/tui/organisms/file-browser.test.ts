// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for FileBrowser organism component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FileBrowser, type FileEntry } from './file-browser';
import type { RenderContext } from '../core/base';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

describe('FileBrowser', () => {
  let entries: FileEntry[];
  let onSelect: vi.Mock;
  let browser: FileBrowser;

  beforeEach(() => {
    entries = [
      { name: 'dir1/', path: '/dir1', isDir: true },
      { name: 'dir2/', path: '/dir2', isDir: true },
      { name: 'file.txt', path: '/file.txt', isDir: false },
    ];
    onSelect = vi.fn();
  });

  describe('constructor', () => {
    it('should create with entries and visibleRows', () => {
      browser = new FileBrowser(entries, 10);
      expect(browser).toBeInstanceOf(FileBrowser);
      expect(browser['entries']).toHaveLength(3);
    });

    it('should format items with icons', () => {
      browser = new FileBrowser(entries, 5);
      const sl = browser.getSelectList();
      const items = sl['items'];
      expect(items[0].label).toContain('📁');
      expect(items[2].label).toContain('📄');
    });

    it('should set onSelect callback', () => {
      browser = new FileBrowser(entries, 5, onSelect);
      // OnSelect is passed to SelectList
    });
  });

  describe('setEntries()', () => {
    it('should update entries and refresh select list', () => {
      browser = new FileBrowser(entries, 5);
      const newEntries = [{ name: 'newfile', path: '/newfile', isDir: false }];
      browser.setEntries(newEntries);
      expect(browser['entries']).toHaveLength(1);
    });
  });

  describe('getSelectList()', () => {
    it('should return the internal SelectList', () => {
      browser = new FileBrowser(entries, 5);
      const sl = browser.getSelectList();
      expect(sl).toBeDefined();
    });
  });

  describe('draw()', () => {
    it('should delegate to SelectList draw', () => {
      browser = new FileBrowser(entries, 5);
      const result = browser.draw(defaultContext);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('clearCache()', () => {
    it('should be no-op', () => {
      browser = new FileBrowser(entries, 5);
      expect(() => browser.clearCache()).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty entries', () => {
      browser = new FileBrowser([], 5);
      expect(() => browser.draw(defaultContext)).not.toThrow();
    });

    it('should handle entries with special chars', () => {
      const special: FileEntry[] = [{ name: '😀', path: '/emoji', isDir: false }];
      browser = new FileBrowser(special, 5);
      const result = browser.draw(defaultContext);
      expect(result.some(l => l.includes('😀'))).toBe(true);
    });
  });
});