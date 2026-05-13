// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for TreeSelector molecule component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TreeSelector, type TreeSelectorTreeNode } from './tree-selector';
import type { RenderContext, KeyEvent } from '../atoms/base';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

function createKeyEvent(raw: string): KeyEvent {
  return { raw, name: raw, modifiers: {} };
}

describe('TreeSelector', () => {
  const createDir = (name: string, path: string, children: TreeSelectorTreeNode[] = []): TreeSelectorTreeNode => ({
    name,
    path,
    isDirectory: true,
    children,
  });
  const createFile = (name: string, path: string): TreeSelectorTreeNode => ({
    name,
    path,
    isDirectory: false,
  });

  let root: TreeSelectorTreeNode;
  let onSelect: vi.Mock;
  let onCancel: vi.Mock;
  let selector: TreeSelector;

  beforeEach(() => {
    root = createDir('root', '/root', [
      createDir('home', '/root/home', [
        createFile('file1.txt', '/root/home/file1.txt'),
        createDir('docs', '/root/home/docs', [
          createFile('readme.md', '/root/home/docs/readme.md'),
        ]),
      ]),
      createFile('readme.md', '/root/readme.md'),
    ]);
    onSelect = vi.fn();
    onCancel = vi.fn();
  });

  describe('constructor', () => {
    it('should create with root node and auto-expand root', () => {
      selector = new TreeSelector({ root, onSelect, onCancel });
      expect(selector['expandedDirs'].has(root.path)).toBe(true);
    });

    it('should build initial visible list', () => {
      selector = new TreeSelector({ root });
      expect(selector['visibleNodes'].length).toBeGreaterThan(0);
    });

    it('should set callbacks', () => {
      selector = new TreeSelector({ root, onSelect, onCancel });
      expect(selector['onSelect']).toBe(onSelect);
      expect(selector['onCancel']).toBe(onCancel);
    });

    it('should default selectedIndex to 0', () => {
      selector = new TreeSelector({ root });
      expect(selector['selectedIndex']).toBe(0);
    });
  });

  describe('buildVisibleList()', () => {
    it('should flatten tree respecting expandedDirs', () => {
      selector = new TreeSelector({ root });
      const nodes = selector['visibleNodes'];
      // root, home, file1.txt, docs, readme.md, root/readme.md
      // root expanded, home expanded, docs NOT expanded by default
      expect(nodes.some(n => n.node.name === 'root')).toBe(true);
      expect(nodes.some(n => n.node.name === 'home')).toBe(true);
      expect(nodes.some(n => n.node.name === 'file1.txt')).toBe(true);
      expect(nodes.some(n => n.node.name === 'docs')).toBe(true);
      expect(nodes.some(n => n.node.name === 'readme.md' && n.node.path === '/root/home/docs/readme.md')).toBe(false); // collaps
    });
  });

  describe('draw()', () => {
    beforeEach(() => {
      selector = new TreeSelector({ root });
    });

    it('should render a bordered box with title " File Browser "', () => {
      const result = selector.draw(defaultContext);
      expect(result[0].startsWith('┌')).toBe(true);
      expect(result.some(l => l.includes('File Browser'))).toBe(true);
    });

    it('should show file/directory icons', () => {
      const result = selector.draw(defaultContext);
      expect(result.some(l => l.includes('📁'))).toBe(true);
      expect(result.some(l => l.includes('📄'))).toBe(true);
    });

    it('should indent children with spaces', () => {
      const result = selector.draw(defaultContext);
      // home is depth 1, file1 is depth 2
      const fileLine = result.find(l => l.includes('file1.txt'));
      expect(fileLine).toContain('  ');
    });

    it('should show selected with ▶ prefix', () => {
      selector['selectedIndex'] = 2;
      const result = selector.draw(defaultContext);
      const line = result.find(l => l.includes('file1.txt'));
      expect(line?.startsWith('│▶')).toBe(true);
    });

    it('should display help text', () => {
      const result = selector.draw(defaultContext);
      expect(result.some(l => l.includes('Enter open  Esc cancel'))).toBe(true);
    });

    it('should respect visible height limit', () => {
      // Build deep tree
      const deep = createDir('deep', '/deep', Array.from({ length: 20 }, (_, i) => createFile(`f${i}`, `/deep/f${i}`)));
      selector = new TreeSelector({ root: deep });
      const result = selector.draw({ ...defaultContext, height: 10 });
      // Should only show a few items
      const fileLines = result.filter(l => l.includes('f'));
      expect(fileLines.length).toBeLessThan(20);
    });
  });

  describe('handleKey()', () => {
    beforeEach(() => {
      selector = new TreeSelector({ root, onSelect, onCancel });
      selector.isFocused = true;
    });

    it('should move selection up/down', () => {
      selector.handleKey(createKeyEvent('down'));
      expect(selector['selectedIndex']).toBe(1);
      selector.handleKey(createKeyEvent('up'));
      expect(selector['selectedIndex']).toBe(0);
    });

    it('should not move past boundaries', () => {
      selector['selectedIndex'] = selector['visibleNodes'].length - 1;
      selector.handleKey(createKeyEvent('down'));
      expect(selector['selectedIndex']).toBe(selector['visibleNodes'].length - 1);
    });

    it('should call onSelect on Enter', () => {
      selector.handleKey(createKeyEvent('\r'));
      expect(onSelect).toHaveBeenCalledWith(selector['visibleNodes'][0].node);
    });

    it('should call onCancel on Escape', () => {
      selector.handleKey(createKeyEvent('\x1b'));
      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('clearCache()', () => {
    it('should clear any stored cache', () => {
      selector = new TreeSelector({ root });
      selector['cache'] = ['test'];
      selector.clearCache();
      expect(selector['cache']).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty directory', () => {
      const emptyDir = createDir('empty', '/empty', []);
      selector = new TreeSelector({ root: emptyDir });
      const result = selector.draw(defaultContext);
      expect(result).toBeDefined();
    });

    it('should handle deep nesting', () => {
      let deep = createDir('l1', '/1', []);
      for (let i = 2; i <= 10; i++) {
        deep = createDir(`l${i}`, `/${i}`, [deep]);
      }
      selector = new TreeSelector({ root: deep });
      expect(selector['visibleNodes'].length).toBeGreaterThan(5);
    });

    it('should handle unicode names', () => {
      const uni = createDir('😀', '/emoji', [createFile('😁', '/emoji/file')]);
      selector = new TreeSelector({ root: uni });
      const result = selector.draw(defaultContext);
      expect(result.some(l => l.includes('😀'))).toBe(true);
    });
  });
});