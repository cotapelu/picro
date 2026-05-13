/**
 * Flex Layout Component
 *
 * Arranges children in a row or column with optional gap.
 * Supports basic distribution of space.
 */

import type { UIElement, RenderContext } from './base';
import { ElementContainer } from './base';
import { visibleWidth } from './internal-utils';

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
      const allChildrenLines = this.children.map(child => child.draw(context));
      const maxHeight = Math.max(...allChildrenLines.map(lines => lines.length));
      // Compute column widths for each child (max visible width of its lines)
      const childWidths = allChildrenLines.map(lines => {
        if (lines.length === 0) return 0;
        return Math.max(...lines.map(l => visibleWidth(l)));
      });
      // Pad each child's lines to maxHeight and ensure each line fills its column width
      const padded = allChildrenLines.map((lines, idx) => {
        const colWidth = childWidths[idx];
        // Pad existing lines to colWidth
        const paddedLines = lines.map(l => {
          const vw = visibleWidth(l);
          if (vw < colWidth) {
            return l + ' '.repeat(colWidth - vw);
          }
          return l;
        });
        // Add missing lines as spaces of colWidth
        const missing = maxHeight - lines.length;
        if (missing > 0) {
          const empty = ' '.repeat(colWidth);
          paddedLines.push(...new Array(missing).fill(empty));
        }
        return paddedLines;
      });
      // Combine horizontally
      for (let row = 0; row < maxHeight; row++) {
        const rowSegments: string[] = [];
        for (let c = 0; c < this.children.length; c++) {
          if (c > 0) {
            rowSegments.push(' '.repeat(gap));
          }
          rowSegments.push(padded[c][row]);
        }
        lines.push(rowSegments.join(''));
      }
    }
    return lines;
  }
}
