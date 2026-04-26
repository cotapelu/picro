/**
 * Tree Selector Component
 * File tree navigation
 */

import type { UIElement, InteractiveElement, RenderContext, KeyEvent } from './base.js';
import { visibleWidth, truncateText } from './internal-utils.js';

export interface TreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: TreeNode[];
}

export interface TreeSelectorOptions {
  root: TreeNode;
  onSelect?: (node: TreeNode) => void;
  onCancel?: () => void;
}

export class TreeSelector implements UIElement, InteractiveElement {
  private root: TreeNode;
  private expandedDirs: Set<string> = new Set();
  private visibleNodes: { node: TreeNode; depth: number }[] = [];
  private selectedIndex: number = 0;
  private onSelect?: (node: TreeNode) => void;
  private onCancel?: () => void;
  public isFocused = false;

  constructor(options: TreeSelectorOptions) {
    this.root = options.root;
    this.expandedDirs.add(options.root.path);
    this.onSelect = options.onSelect;
    this.onCancel = options.onCancel;
    this.buildVisibleList();
  }

  private buildVisibleList(): void {
    this.visibleNodes = [];
    this.flatten(this.root, 0);
  }

  private flatten(node: TreeNode, depth: number): void {
    this.visibleNodes.push({ node, depth });
    if (node.isDirectory && this.expandedDirs.has(node.path)) {
      for (const child of node.children || []) {
        this.flatten(child, depth + 1);
      }
    }
  }

  draw(context: RenderContext): string[] {
    const width = context.width;
    const borderWidth = width - 2;
    const lines: string[] = [];

    this.buildVisibleList();

    lines.push('┌' + '─'.repeat(borderWidth) + '┐');
    const title = ' File Browser ';
    const titlePad = ' '.repeat(Math.max(0, Math.floor((borderWidth - title.length) / 2)));
    lines.push('│' + titlePad + title + titlePad + '│');
    lines.push('├' + '─'.repeat(borderWidth) + '┤');

    for (let i = 0; i < this.visibleNodes.length && i < context.height - 6; i++) {
      const { node, depth } = this.visibleNodes[i]!;
      const isSelected = i === this.selectedIndex;
      const prefix = isSelected ? '▶ ' : '  ';
      const indent = '  '.repeat(depth);
      const icon = node.isDirectory ? '📁' : '📄';
      const line = prefix + indent + icon + ' ' + node.name;
      lines.push('│' + truncateText(line, borderWidth) + ' '.repeat(borderWidth - visibleWidth(line)) + '│');
    }

    while (lines.length < context.height - 3) {
      lines.push('│' + ' '.repeat(borderWidth) + '│');
    }

    lines.push('├' + '─'.repeat(borderWidth) + '┤');
    const help = '↑↓ navigate  Enter open  Esc cancel';
    lines.push('│ ' + help + ' '.repeat(borderWidth - help.length - 2) + '│');
    lines.push('└' + '─'.repeat(borderWidth) + '┘');

    return lines;
  }

  handleKey(key: KeyEvent): void {
    const data = key.raw;

    if (data === '\x1b') {
      this.onCancel?.();
      return;
    }

    if (data === '\r' || data === '\n') {
      const { node } = this.visibleNodes[this.selectedIndex] || {};
      if (node) this.onSelect?.(node);
      return;
    }

    if (data === '\x1b[A' || data === 'up') {
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
      return;
    }

    if (data === '\x1b[B' || data === 'down') {
      this.selectedIndex = Math.min(this.visibleNodes.length - 1, this.selectedIndex + 1);
      return;
    }
  }

  clearCache(): void {
    // No cache
  }
}
