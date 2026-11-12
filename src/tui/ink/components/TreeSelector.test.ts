// SPDX-License-Identifier: Apache-2.0
/**
 * TreeSelector rendering/flattening helpers.
 *
 * 1. clipToWidth() measured the plain text but sliced the RAW string, so a
 *    coloured row was truncated far too early and the slice could land inside an
 *    escape sequence, emitting a broken control code to the terminal.
 * 2. The stored selection index was never clamped when the visible list shrank,
 *    so the highlight stayed on a stale position while Up had to be pressed
 *    several times before the index walked back into the window.
 */

import { describe, it, expect } from 'vitest';
import { clipToWidth, flattenTree, isMultiRoot, type SessionTreeNode } from './TreeSelector.js';

function node(id: string, children: SessionTreeNode[] = [], extra: Partial<SessionTreeNode['entry']> = {}): SessionTreeNode {
  return { entry: { id, type: 'message', parentId: null, ...extra }, children };
}

/** Same, but children point back at their parent (as a real session tree does). */
function parented(id: string, childIds: string[], extra: Partial<SessionTreeNode['entry']> = {}): SessionTreeNode {
  return {
    entry: { id, type: 'message', parentId: null, ...extra },
    children: childIds.map((child) => ({ entry: { id: child, type: 'message', parentId: id }, children: [] })),
  };
}

describe('clipToWidth', () => {
  it('leaves a plain short line untouched', () => {
    expect(clipToWidth('hello', 10)).toBe('hello');
  });

  it('truncates a plain long line to the requested columns', () => {
    expect(clipToWidth('abcdefghij', 5)).toBe('abcde');
  });

  it('truncates by visible width, not by ANSI byte count', () => {
    // Colour codes must not consume the budget: the visible text is "hello".
    const coloured = '\x1b[32mhello\x1b[39m';
    expect(clipToWidth(coloured, 4)).toBe('\x1b[32mhell');
  });

  it('never cuts inside an escape sequence', () => {
    const coloured = '\x1b[38;5;120mhello world\x1b[39m';
    const clipped = clipToWidth(coloured, 5);
    // A broken sequence would leave a dangling ESC without a final byte.
    expect(clipped).not.toMatch(/\x1b\[[0-9;]*$/);
    expect(clipped.startsWith('\x1b[38;5;120m')).toBe(true);
  });

  it('keeps a wide (CJK) line within the requested columns', () => {
    const clipped = clipToWidth('你好世界', 5);
    expect(clipped.length).toBeLessThanOrEqual(5);
  });

  it('handles a zero or negative width', () => {
    expect(clipToWidth('abc', 0)).toBe('');
  });
});

describe('flattenTree', () => {
  it('flattens a single chain with no connectors', () => {
    const root = parented('a', ['b']);
    root.children[0]!.children = [
      { entry: { id: 'c', type: 'message', parentId: 'b' }, children: [] },
    ];
    const flat = flattenTree([root], 'c');
    expect(flat.map((f) => f.node.entry.id)).toEqual(['a', 'b', 'c']);
    expect(flat.every((f) => f.indent === 0)).toBe(true);
  });

  it('puts the branch containing the active leaf first', () => {
    const left = node('left', [node('left-child')]);
    const right = node('right', [node('right-child')]);
    const flat = flattenTree([left, right], 'right-child');
    expect(flat[0]!.node.entry.id).toBe('right');
  });

  it('indents children of a branching node', () => {
    const tree = [parented('root', ['c1', 'c2'])];
    const flat = flattenTree(tree, 'c2');
    expect(flat[0]!.indent).toBe(0);
    expect(flat[1]!.indent).toBe(1);
    expect(flat[2]!.indent).toBe(1);
  });

  it('marks the last sibling', () => {
    const tree = [parented('root', ['c1', 'c2'])];
    const flat = flattenTree(tree, 'c1');
    const c1 = flat.find((f) => f.node.entry.id === 'c1')!;
    const c2 = flat.find((f) => f.node.entry.id === 'c2')!;
    expect(c1.isLast).toBe(false);
    expect(c2.isLast).toBe(true);
  });

  it('adds a gutter for open ancestors', () => {
    // depth 3 chain where each level branches, so connectors are displayed
    const tree = [
      parented('a', ['a1', 'a2']),
      parented('b', ['b1']),
    ];
    // Re-parent both under a shared root 'r' with proper parentIds.
    tree.forEach((root) => { root.entry.parentId = 'r'; });
    const flat = flattenTree([{ entry: { id: 'r', type: 'message', parentId: null }, children: tree }], 'b1');
    const a1 = flat.find((f) => f.node.entry.id === 'a1')!;
    expect(a1.gutters.length).toBeGreaterThan(0);
    // 'b' holds the active leaf, so it is reordered before 'a' and 'a' becomes
    // the last child: its gutter is closed rather than open.
    expect(a1.gutters).toEqual([{ position: 0, show: false }]);
  });
});

describe('isMultiRoot', () => {
  it('is false for a single root chain', () => {
    const flat = flattenTree([parented('a', ['b'])], 'b');
    expect(isMultiRoot(flat, flat)).toBe(false);
  });

  it('is false for a single root that branches', () => {
    // Only the root itself sits at indent 0; its children are indented, yet the
    // old indent-based check still saw several indent-0 rows and reported a
    // multi-root tree, shifting every row one column left.
    const flat = flattenTree([parented('root', ['c1', 'c2'])], 'c1');
    expect(flat.filter((f) => f.indent === 0)).toHaveLength(1);
    expect(isMultiRoot(flat, flat)).toBe(false);
  });

  it('is true when several roots are visible', () => {
    const flat = flattenTree([node('a'), node('b')], 'b');
    expect(flat.every((f) => f.isVirtualRootChild)).toBe(true);
    expect(isMultiRoot(flat, flat)).toBe(true);
  });
});
