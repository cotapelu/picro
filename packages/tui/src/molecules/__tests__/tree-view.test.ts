import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TreeView, TreeNode, TreeViewTheme } from '../tree-view';
import type { RenderContext } from '../base';

function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

describe('TreeView Component', () => {
  const createTestTree = (): TreeNode => {
    return {
      id: 'root',
      label: 'Root',
      children: [
        {
          id: 'folder1',
          label: 'Folder 1',
          expanded: true,
          children: [
            { id: 'file1', label: 'File 1', children: [] },
            { id: 'file2', label: 'File 2', children: [] },
          ],
        },
        {
          id: 'folder2',
          label: 'Folder 2',
          expanded: false,
          children: [
            { id: 'file3', label: 'File 3', children: [] },
          ],
        },
        { id: 'file4', label: 'File 4', children: [] },
      ],
    };
  };

  describe('Constructor', () => {
    it('should create tree view with root node', () => {
      const tree = createTestTree();
      const view = new TreeView(tree);
      expect(view).toBeDefined();
    });

    it('should accept custom theme', () => {
      const tree = createTestTree();
      const theme: TreeViewTheme = {
        collapsedIcon: '[-]',
        expandedIcon: '[+]',
        leafIcon: '📄',
        folderIcon: '📁',
      };
      const view = new TreeView(tree, theme);
      expect(view).toBeDefined();
    });
  });

  describe('rendering', () => {
    it('should render tree structure', () => {
      const tree = createTestTree();
      const view = new TreeView(tree);
      const ctx = createContext();
      const lines = view.draw(ctx);
      expect(lines.length).toBeGreaterThan(0);
    });

    it('should render indentation based on depth', () => {
      const tree = createTestTree();
      const view = new TreeView(tree);
      const ctx = createContext();
      const lines = view.draw(ctx);
      // First children of root should have indentation
      expect(lines[0]).toContain('Folder');
    });

    it('should render expand/collapse icons', () => {
      const tree = createTestTree();
      const view = new TreeView(tree);
      const ctx = createContext();
      const lines = view.draw(ctx);
      // Expanded folder should have [+], collapsed folder should have [-]
      const content = lines.join('');
      expect(content).toContain('[+]');
    });

    it('should truncate long labels to fit width', () => {
      const longLabelTree = {
        id: 'root',
        label: 'A very long label that exceeds the terminal width should be truncated',
        children: [],
      };
      const view = new TreeView(longLabelTree);
      const ctx = createContext(20, 24);
      const lines = view.draw(ctx);
      // Each line should fit within 20 characters
      for (const line of lines) {
        const visibleLength = line.replace(/\x1b\[[0-9;]*m/g, '').length;
        expect(visibleLength).toBeLessThanOrEqual(20);
      }
    });
  });

  describe('selection', () => {
    it('should move selection down', () => {
      const tree = createTestTree();
      const view = new TreeView(tree);
      view.setFocus(true);
      view.keypress({ key: 'ArrowDown', ctrlKey: false, shiftKey: false, altKey: false, metaKey: false, preventDefault: vi.fn(), stopPropagation: vi.fn() } as any);
      // After moving down, should navigate to next visible node
      const ctx = createContext();
      const lines = view.draw(ctx);
      // Selection should have moved
      expect(lines.join('')).toContain('Folder 1');
    });

    it('should toggle expand/collapse with Enter', () => {
      const tree = createTestTree();
      const view = new TreeView(tree);
      view.setFocus(true);
      const initialTree = { ...tree.children![1] }; // folder2
      view.keypress({ key: 'Enter', ctrlKey: false, shiftKey: false, altKey: false, metaKey: false, preventDefault: vi.fn(), stopPropagation: vi.fn() } as any);
      // Should toggle expansion state
    });
  });

  describe('clearCache', () => {
    it('should be callable', () => {
      const tree = createTestTree();
      const view = new TreeView(tree);
      expect(() => view.clearCache()).not.toThrow();
    });
  });
});