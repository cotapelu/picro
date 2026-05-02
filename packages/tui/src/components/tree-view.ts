/**
 * TreeView Component
 *
 * Displays a hierarchical tree structure with expand/collapse and selection.
 * Supports keyboard navigation (Up/Down/Enter/Left/Right).
 * Integrates with viewport scrolling for large trees.
 */

import type { UIElement, InteractiveElement, RenderContext, KeyEvent } from './base.js';
import { CURSOR_MARKER } from './base.js';
import { matchesKey } from './keys.js';

/**
 * Tree node data
 */
export interface TreeNode {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Child nodes */
  children?: TreeNode[];
  /** Whether expanded (default false) */
  expanded?: boolean;
}

/**
 * Options for TreeView
 */
export interface TreeViewOptions {
  /** Tree data (array of root nodes) */
  data: TreeNode[];
  /** Number of visible rows (viewport height) */
  visibleRows?: number;
  /** Called when a leaf node is selected (Enter on non-expandable) */
  onSelect?: (node: TreeNode) => void;
  /** Called when a node is expanded or collapsed */
  onToggle?: (node: TreeNode, expanded: boolean) => void;
}

/**
 * TreeView - renders a collapsible tree.
 */
export class TreeView implements UIElement, InteractiveElement {
  public isFocused = false;

  private data: TreeNode[];
  private onSelect?: (node: TreeNode) => void;
  private onToggle?: (node: TreeNode, expanded: boolean) => void;


  // Viewport configuration
  private visibleRows: number;
  private scrollOffset = 0;

  // Flattened list of visible nodes with depth
  private visibleNodes: Array<{ node: TreeNode; depth: number }> = [];
  private selectedIndex = 0;

  constructor(options: TreeViewOptions) {
    this.data = options.data;
    this.onSelect = options.onSelect;
    this.onToggle = options.onToggle;
    this.visibleRows = options.visibleRows ?? 20;
    // Ensure expanded flags default to false
    const ensureExpanded = (nodes: TreeNode[]) => {
      for (const n of nodes) {
        if (n.expanded === undefined) n.expanded = false;
        if (n.children) ensureExpanded(n.children);
      }
    };
    ensureExpanded(this.data);
    this.recomputeVisible();
  }

  /** Recompute flattened visible nodes based on expanded state */
  private recomputeVisible(): void {
    this.visibleNodes = [];
    const traverse = (nodes: TreeNode[], depth: number) => {
      for (const node of nodes) {
        this.visibleNodes.push({ node, depth });
        if (node.expanded && node.children) {
          traverse(node.children, depth + 1);
        }
      }
    };
    traverse(this.data, 0);
    // Clamp selected index
    if (this.selectedIndex >= this.visibleNodes.length) {
      this.selectedIndex = Math.max(0, this.visibleNodes.length - 1);
    }
    // Adjust scroll to keep selection in view
    this.adjustScroll();
  }

  /** Ensure selectedIndex is within the visible scroll viewport */
  private adjustScroll(): void {
    if (this.selectedIndex < this.scrollOffset) {
      this.scrollOffset = this.selectedIndex;
    } else if (this.selectedIndex >= this.scrollOffset + this.visibleRows) {
      this.scrollOffset = this.selectedIndex - this.visibleRows + 1;
    }
    // Clamp scroll to valid range
    const maxScroll = Math.max(0, this.visibleNodes.length - this.visibleRows);
    this.scrollOffset = Math.max(0, Math.min(this.scrollOffset, maxScroll));
  }

  draw(context: RenderContext): string[] {
    const lines: string[] = [];
    const startIdx = this.scrollOffset;
    const endIdx = Math.min(startIdx + this.visibleRows, this.visibleNodes.length);
    for (let i = startIdx; i < endIdx; i++) {
      const { node, depth } = this.visibleNodes[i];
      const indent = '  '.repeat(depth);
      const marker = this.isFocused && i === this.selectedIndex ? CURSOR_MARKER : '';
      let expandIcon = '';
      if (node.children && node.children.length > 0) {
        expandIcon = node.expanded ? '[-] ' : '[+] ';
      } else {
        expandIcon = '    ';
      }
      lines.push(marker + indent + expandIcon + node.label);
    }
    return lines;
  }

  handleKey(key: KeyEvent): void {
    if (matchesKey(key.raw, 'up')) {
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
      this.adjustScroll();
    } else if (matchesKey(key.raw, 'down')) {
      this.selectedIndex = Math.min(this.visibleNodes.length - 1, this.selectedIndex + 1);
      this.adjustScroll();
    } else if (matchesKey(key.raw, 'pageup')) {
      this.selectedIndex = Math.max(0, this.selectedIndex - this.visibleRows);
      this.adjustScroll();
    } else if (matchesKey(key.raw, 'pagedown')) {
      this.selectedIndex = Math.min(this.visibleNodes.length - 1, this.selectedIndex + this.visibleRows);
      this.adjustScroll();
    } else if (matchesKey(key.raw, 'enter')) {
      const { node } = this.visibleNodes[this.selectedIndex];
      if (node.children && node.children.length > 0) {
        node.expanded = !node.expanded;
        this.recomputeVisible();
        this.onToggle?.(node, node.expanded);
      } else {
        this.onSelect?.(node);
      }
    } else if (matchesKey(key.raw, 'right')) {
      const { node } = this.visibleNodes[this.selectedIndex];
      if (node.children && node.children.length > 0 && !node.expanded) {
        node.expanded = true;
        this.recomputeVisible();
        this.onToggle?.(node, true);
      }
    } else if (matchesKey(key.raw, 'left')) {
      const { node } = this.visibleNodes[this.selectedIndex];
      if (node.children && node.children.length > 0 && node.expanded) {
        node.expanded = false;
        this.recomputeVisible();
        this.onToggle?.(node, false);
      } else {
        for (let i = this.selectedIndex - 1; i >= 0; i--) {
          const candidate = this.visibleNodes[i];
          if (candidate.depth < this.visibleNodes[this.selectedIndex].depth) {
            this.selectedIndex = i;
            break;
          }
        }
        this.adjustScroll();
      }
    }
  }


  /** Serialize state (captures expanded flags and selected index) */
  serializeState(): any {
    const expandedMap: Record<string, boolean> = {};
    const walk = (nodes: TreeNode[]) => {
      for (const n of nodes) {
        expandedMap[n.id] = n.expanded || false;
        if (n.children) walk(n.children);
      }
    };
    walk(this.data);
    return {
      selectedIndex: this.selectedIndex,
      scrollOffset: this.scrollOffset,
      expanded: expandedMap,
    };
  }

  /** Deserialize state */
  deserializeState(state: any): void {
    if (state.selectedIndex !== undefined) this.selectedIndex = state.selectedIndex;
    if (state.scrollOffset !== undefined) this.scrollOffset = state.scrollOffset;
    if (state.expanded) {
      const apply = (nodes: TreeNode[]) => {
        for (const n of nodes) {
          if (state.expanded[n.id] !== undefined) n.expanded = state.expanded[n.id];
          if (n.children) apply(n.children);
        }
      };
      apply(this.data);
    }
    this.recomputeVisible();
    this.adjustScroll();
  }

  clearCache(): void {
    // no caching
  }
}
