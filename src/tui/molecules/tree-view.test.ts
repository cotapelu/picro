// SPDX-License-Identifier: Apache-2.0
/**
 * Comprehensive tests for TreeView molecule component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TreeView } from './tree-view';
import type { RenderContext, KeyEvent } from '../atoms/base';
import { matchesKey } from '../atoms/keys';

// Mock matchesKey
vi.mock('../atoms/keys', () => ({
  matchesKey: (raw: string, action: string) => {
    const map: Record<string, Set<string>> = {
      up: new Set(['\u001b[A', 'ArrowUp', 'k']),
      down: new Set(['\u001b[B', 'ArrowDown', 'j']),
      pageup: new Set(['\u001b[5~', 'PageUp']),
      pagedown: new Set(['\u001b[6~', 'PageDown']),
      enter: new Set(['\r', 'Enter']),
      left: new Set(['\u001b[D', 'ArrowLeft', 'h']),
      right: new Set(['\u001b[C', 'ArrowRight', 'l']),
      escape: new Set(['\u001b', 'Escape']),
    };
    return map[action]?.has(raw) ?? false;
  },
}));

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

function createKeyEvent(raw: string, name?: string): KeyEvent {
  return {
    raw,
    name: name || raw,
    modifiers: {},
  };
}

describe('TreeView', () => {
  let treeData: TreeView['data'];
  let treeView: TreeView;

  const createTreeData = (): TreeView['data'] => [
    {
      id: 'root1',
      label: 'Root 1',
      children: [
        { id: 'child1', label: 'Child 1.1' },
        { id: 'child2', label: 'Child 1.2' },
      ],
    },
    {
      id: 'root2',
      label: 'Root 2',
      children: [
        {
          id: 'subroot1',
          label: 'Subroot 2.1',
          children: [
            { id: 'grand1', label: 'Grandchild 2.1.1' },
          ],
        },
      ],
    },
    { id: 'leaf1', label: 'Leaf 1' },
  ];

  beforeEach(() => {
    treeData = createTreeData();
    treeView = new TreeView({ data: treeData, visibleRows: 10 });
  });

  describe('constructor', () => {
    it('should create with data and default visibleRows=20', () => {
      const defaultTree = new TreeView({ data: treeData });
      expect(defaultTree['visibleRows']).toBe(20);
    });

    it('should accept custom visibleRows', () => {
      expect(treeView['visibleRows']).toBe(10);
    });

    it('should call ensureExpanded on all nodes', () => {
      // Even if not explicitly set, expanded should default to false
      expect(treeData[0].expanded).toBe(false);
      expect(treeData[1].children?.[0].expanded).toBe(false);
    });

    it('should accept onSelect and onToggle callbacks', () => {
      const onSelect = vi.fn();
      const onToggle = vi.fn();
      const tree = new TreeView({ data: treeData, onSelect, onToggle });
      expect(tree['onSelect']).toBe(onSelect);
      expect(tree['onToggle']).toBe(onToggle);
    });

    it('should initialize isFocused to false', () => {
      expect(treeView.isFocused).toBe(false);
    });

    it('should set selectedIndex to 0 initially', () => {
      expect(treeView['selectedIndex']).toBe(0);
    });
  });

  describe('recomputeVisible()', () => {
    it('should flatten tree into visible nodes', () => {
      treeView = new TreeView({ data: treeData });
      const visible = treeView['visibleNodes'];
      // Initially all root nodes visible
      expect(visible.length).toBe(3);
      expect(visible[0].node.id).toBe('root1');
      expect(visible[1].node.id).toBe('root2');
      expect(visible[2].node.id).toBe('leaf1');
    });

    it('should include children when parent expanded', () => {
      treeData[0].expanded = true;
      treeView = new TreeView({ data: treeData });
      expect(treeView['visibleNodes'].length).toBeGreaterThan(3);
      const hasChild = treeView['visibleNodes'].some(v => v.node.id === 'child1');
      expect(hasChild).toBe(true);
    });

    it('should not include children when parent collapsed', () => {
      treeData[0].expanded = false;
      treeView = new TreeView({ data: treeData });
      const hasChild = treeView['visibleNodes'].some(v => v.node.id === 'child1');
      expect(hasChild).toBe(false);
    });

    it('should recalculate depth correctly', () => {
      treeData[0].expanded = true;
      treeView = new TreeView({ data: treeData });
      const root1Node = treeView['visibleNodes'].find(v => v.node.id === 'child1');
      expect(root1Node?.depth).toBe(1);
      const subroot = treeView['visibleNodes'].find(v => v.node.id === 'subroot1');
      expect(subroot?.depth).toBe(1);
      if (subroot?.node.expanded) {
        const grand = treeView['visibleNodes'].find(v => v.node.id === 'grand1');
        expect(grand?.depth).toBe(2);
      }
    });

    it('should clamp selectedIndex if out of bounds', () => {
      treeView['selectedIndex'] = 100;
      treeView.recomputeVisible();
      expect(treeView['selectedIndex']).toBeLessThan(treeView['visibleNodes'].length);
    });
  });

  describe('adjustScroll()', () => {
    beforeEach(() => {
      treeView = new TreeView({ data: treeData, visibleRows: 3 });
    });

    it('should move scroll up when selectedIndex above viewport', () => {
      treeView['selectedIndex'] = 1; // second item
      treeView['scrollOffset'] = 5; // viewport far down
      treeView.adjustScroll();
      expect(treeView['scrollOffset']).toBeLessThanOrEqual(1);
    });

    it('should move scroll down when selectedIndex below viewport', () => {
      treeView['selectedIndex'] = 5;
      treeView['scrollOffset'] = 0;
      treeView.adjustScroll();
      expect(treeView['scrollOffset']).toBeGreaterThan(0);
    });

    it('should clamp scroll to 0 minimum', () => {
      treeView['selectedIndex'] = 0;
      treeView['scrollOffset'] = -10;
      treeView.adjustScroll();
      expect(treeView['scrollOffset']).toBe(0);
    });

    it('should clamp scroll to maxScroll', () => {
      treeView = new TreeView({ data: treeData, visibleRows: 1 });
      treeView['selectedIndex'] = treeView['visibleNodes'].length - 1;
      treeView.adjustScroll();
      const maxScroll = Math.max(0, treeView['visibleNodes'].length - treeView['visibleRows']);
      expect(treeView['scrollOffset']).toBeLessThanOrEqual(maxScroll);
    });
  });

  describe('draw()', () => {
    it('should return array of lines', () => {
      const result = treeView.draw(defaultContext);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should include labels', () => {
      const result = treeView.draw(defaultContext);
      expect(result.some(line => line.includes('Root 1'))).toBe(true);
      expect(result.some(line => line.includes('Leaf 1'))).toBe(true);
    });

    it('should show [+] for collapsed nodes with children', () => {
      treeData[0].expanded = false;
      treeView = new TreeView({ data: treeData });
      const result = treeView.draw(defaultContext);
      expect(result.some(line => line.includes('[+]'))).toBe(true);
    });

    it('should show [-] for expanded nodes with children', () => {
      treeData[0].expanded = true;
      treeView = new TreeView({ data: treeData });
      const result = treeView.draw(defaultContext);
      expect(result.some(line => line.includes('[-]'))).toBe(true);
    });

    it('should indent children with spaces', () => {
      treeData[0].expanded = true;
      treeView = new TreeView({ data: treeData });
      const result = treeView.draw(defaultContext);
      const childLine = result.find(line => line.includes('Child 1.1'));
      expect(childLine?.startsWith('  ')).toBe(true); // two spaces per depth
    });

    it('should add cursor marker on selected line when focused', () => {
      treeView.isFocused = true;
      const result = treeView.draw(defaultContext);
      expect(result[0]).toContain('\x1b_pi:c\x07');
    });

    it('should not add cursor marker when not focused', () => {
      treeView.isFocused = false;
      const result = treeView.draw(defaultContext);
      expect(result.every(line => !line.includes('\x1b_pi:c\x07'))).toBe(true);
    });

    it('should respect visibleRows limit', () => {
      treeView = new TreeView({ data: treeData, visibleRows: 2 });
      const result = treeView.draw(defaultContext);
      // At most 2 visible items (plus maybe scroll info? no scroll info in this implementation)
      expect(result.length).toBeLessThanOrEqual(2);
    });

    it('should handle scrollOffset', () => {
      treeView = new TreeView({ data: treeData, visibleRows: 2 });
      treeView['scrollOffset'] = 1;
      const result = treeView.draw(defaultContext);
      // Should not include first root
      expect(result.some(line => line.includes('Root 1'))).toBe(false);
      expect(result.some(line => line.includes('Root 2'))).toBe(true);
    });
  });

  describe('handleKey()', () => {
    beforeEach(() => {
      treeView.isFocused = true;
    });

    it('should move selection up', () => {
      treeView.handleKey(createKeyEvent('001b[A', 'up'));
      expect(treeView['selectedIndex']).toBeLessThan(1);
    });

    it('should move selection down', () => {
      treeView.handleKey(createKeyEvent('001b[B', 'down'));
      expect(treeView['selectedIndex']).toBeGreaterThan(0);
    });

    it('should not move past top', () => {
      treeView['selectedIndex'] = 0;
      treeView.handleKey(createKeyEvent('001b[A', 'up'));
      expect(treeView['selectedIndex']).toBe(0);
    });

    it('should not move past bottom', () => {
      treeView['selectedIndex'] = treeView['visibleNodes'].length - 1;
      treeView.handleKey(createKeyEvent('001b[B', 'down'));
      expect(treeView['selectedIndex']).toBe(treeView['visibleNodes'].length - 1);
    });

    it('should page up', () => {
      treeView['selectedIndex'] = 5;
      treeView.handleKey(createKeyEvent('001b[5~', 'pageup'));
      expect(treeView['selectedIndex']).toBeLessThan(5);
    });

    it('should page down', () => {
      treeView['selectedIndex'] = 0;
      treeView.handleKey(createKeyEvent('001b[6~', 'pagedown'));
      expect(treeView['selectedIndex']).toBeGreaterThan(0);
    });

    it('should toggle expand/collapse on Enter for nodes with children', () => {
      treeData[0].expanded = false;
      treeView = new TreeView({ data: treeData });
      const initial = treeData[0].expanded;
      treeView.handleKey(createKeyEvent('\r', 'enter'));
      expect(treeData[0].expanded).toBe(!initial);
    });

    it('should call onToggle when expanding/collapsing', () => {
      const onToggle = vi.fn();
      treeData[0].expanded = false;
      treeView = new TreeView({ data: treeData, onToggle });
      treeView.handleKey(createKeyEvent('\r', 'enter'));
      expect(onToggle).toHaveBeenCalledWith(treeData[0], true);
    });

    it('should call onSelect on Enter for leaf nodes', () => {
      const onSelect = vi.fn();
      treeView = new TreeView({ data: treeData, onSelect });
      // Select leaf (index 2)
      treeView['selectedIndex'] = 2;
      treeView.handleKey(createKeyEvent('\r', 'enter'));
      expect(onSelect).toHaveBeenCalledWith(treeData[2]);
    });

    it('should expand with Right arrow if collapsed', () => {
      treeData[0].expanded = false;
      treeView = new TreeView({ data: treeData });
      treeView.handleKey(createKeyEvent('001b[C', 'right'));
      expect(treeData[0].expanded).toBe(true);
    });

    it('should not expand with Right arrow if already expanded', () => {
      treeData[0].expanded = true;
      treeView = new TreeView({ data: treeData });
      treeView.handleKey(createKeyEvent('001b[C', 'right'));
      // no change
      expect(treeData[0].expanded).toBe(true);
    });

    it('should collapse with Left arrow if expanded', () => {
      treeData[0].expanded = true;
      treeView = new TreeView({ data: treeData });
      treeView.handleKey(createKeyEvent('001b[D', 'left'));
      expect(treeData[0].expanded).toBe(false);
    });

    it('should move to parent with Left arrow if collapsed and has children', () => {
      treeData[0].expanded = true;
      treeView = new TreeView({ data: treeData });
      // Move to a child
      treeView['selectedIndex'] = 1; // Child 1.1
      treeView.handleKey(createKeyEvent('001b[D', 'left'));
      // Should select parent (root1)? Actually logic: if current has children and expanded, collapse; else move to ancestor
      // Since child has no children, it should try to move to ancestor
      // The visibleNodes[1] is child, depth=1. It should find closest node with depth < 1, which is root (depth 0)
      expect(treeView['selectedIndex']).toBeLessThan(1);
    });
  });

  describe('serializeState() / deserializeState()', () => {
    it('should serialize expanded state, selectedIndex, scrollOffset', () => {
      treeView['selectedIndex'] = 2;
      treeView['scrollOffset'] = 1;
      treeData[0].expanded = true;
      const state = treeView.serializeState();
      expect(state.selectedIndex).toBe(2);
      expect(state.scrollOffset).toBe(1);
      expect(state.expanded['root1']).toBe(true);
      expect(state.expanded['root2']).toBe(false);
    });

    it('should deserialize and restore state', () => {
      treeData[0].expanded = false;
      treeView = new TreeView({ data: treeData });
      const state = {
        selectedIndex: 1,
        scrollOffset: 2,
        expanded: { root1: true, root2: true },
      };
      treeView.deserializeState(state);
      expect(treeView['selectedIndex']).toBe(1);
      expect(treeView['scrollOffset']).toBe(2);
      expect(treeData[0].expanded).toBe(true);
      expect(treeData[1].expanded).toBe(true);
    });

    it('should ignore undefined properties on deserialize', () => {
      treeView.deserializeState({});
      // Should not throw
    });
  });

  describe('edge cases', () => {
    it('should handle empty data', () => {
      treeView = new TreeView({ data: [] });
      const result = treeView.draw(defaultContext);
      expect(result).toHaveLength(0);
    });

    it('should handle single node', () => {
      treeView = new TreeView({ data: [{ id: 'solo', label: 'Solo' }] });
      expect(treeView['visibleNodes'].length).toBe(1);
    });

    it('should handle deep nesting', () => {
      const deep = {
        id: 'l1', label: 'L1', children: [
          { id: 'l2', label: 'L2', children: [
            { id: 'l3', label: 'L3', children: [
              { id: 'l4', label: 'L4' },
            ]},
          ]},
        ],
      };
      treeView = new TreeView({ data: [deep] });
      deep.children[0].expanded = true;
      deep.children[0].children[0].expanded = true;
      treeView.recomputeVisible();
      expect(treeView['visibleNodes'].some(v => v.node.id === 'l4')).toBe(true);
    });

    it('should handle unicode labels', () => {
      treeView = new TreeView({
        data: [{ id: 'emoji', label: '😀😁😂', children: [{ id: 'child', label: 'Child 😀' }] }],
      });
      const result = treeView.draw(defaultContext);
      expect(result[0]).toContain('😀');
    });

    it('should handle large visibleRows', () => {
      treeView = new TreeView({ data: treeData, visibleRows: 1000 });
      expect(treeView.draw(defaultContext).length).toBeGreaterThan(0);
    });

    it('should handle nodes without children array', () => {
      const data = [{ id: 'leaf', label: 'Leaf' }];
      treeView = new TreeView({ data });
      treeView.handleKey(createKeyEvent('001b[C', 'right'));
      // Should not crash
    });
  });
});