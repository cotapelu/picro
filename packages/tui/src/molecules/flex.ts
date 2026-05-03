/**
 * Flex Layout Component
 *
 * Arranges children in a row or column with optional gap.
 * Supports basic distribution of space.
 */

import type { UIElement, RenderContext } from '../atoms/base.js';
import { ElementContainer } from '../atoms/base.js';

export interface FlexOptions {
  /** Direction: row (horizontal) or column (vertical) */
  direction: 'row' | 'column';
  /** Gap in lines (for column) or columns (for row) */
  gap?: number;
}

/**
 * Flex - simple layout manager.
 *
 * Currently implements column-direction stacking with gap.
 * Row-direction layout could be added in future.
 */
export class Flex extends ElementContainer {
  constructor(public options: FlexOptions = { direction: 'column', gap: 0 }) {
    super();
  }

  clearCache(): void {
    for (const child of this.children) child.clearCache?.();
  }

  draw(context: RenderContext): string[] {
    const lines: string[] = [];
    const { direction, gap = 0 } = this.options;
    if (direction === 'column') {
      for (let i = 0; i < this.children.length; i++) {
        if (i > 0) {
          for (let g = 0; g < gap; g++) lines.push('');
        }
        const childLines = this.children[i].draw(context);
        lines.push(...childLines);
      }
    } else {
      // Row direction: combine children horizontally line by line
      // First, gather all child lines (using full context width)
      const allChildrenLines = this.children.map(child => child.draw(context));
      // Determine max height among children
      const maxHeight = Math.max(...allChildrenLines.map(lines => lines.length));
      // Pad each child's lines to maxHeight
      const padded = allChildrenLines.map(lines => {
        const empty = new Array(maxHeight - lines.length).fill('');
        return [...lines, ...empty];
      });
      // Combine horizontally: for each line row, concatenate child lines with gap columns
      for (let row = 0; row < maxHeight; row++) {
        const rowSegments: string[] = [];
        for (let c = 0; c < this.children.length; c++) {
          if (c > 0) {
            // Add gap of spaces
            rowSegments.push(' '.repeat(gap));
          }
          rowSegments.push(padded[c][row] || '');
        }
        lines.push(rowSegments.join(''));
      }
    }
    return lines;
  }
}
