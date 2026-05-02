/**
 * Grid Layout Component
 *
 * Arranges children in a grid with a fixed number of columns.
 * Supports gap between columns and rows.
 */

import type { UIElement, RenderContext } from './base.js';
import { ElementContainer } from './base.js';

export interface GridOptions {
  /** Number of columns */
  columns: number;
  /** Horizontal gap between columns (in cells) */
  columnGap?: number;
  /** Vertical gap between rows (in lines) */
  rowGap?: number;
}

/**
 * Grid - simple grid layout.
 *
 * Children are placed left-to-right, then top-to-bottom.
 */
export class Grid extends ElementContainer {
  constructor(public options: GridOptions = { columns: 1, columnGap: 0, rowGap: 0 }) {
    super();
  }

  clearCache(): void {
    for (const child of this.children) child.clearCache?.();
  }

  draw(context: RenderContext): string[] {
    const lines: string[] = [];
    const { columns, columnGap = 0, rowGap = 0 } = this.options;
    if (columns <= 0 || this.children.length === 0) return lines;

    // Compute cell width
    const totalGapWidth = (columns - 1) * columnGap;
    const cellWidth = Math.max(1, Math.floor((context.width - totalGapWidth) / columns));

    // Partition children into rows
    const rows: UIElement[][] = [];
    for (let i = 0; i < this.children.length; i += columns) {
      rows.push(this.children.slice(i, i + columns));
    }

    // For each row, render
    for (let r = 0; r < rows.length; r++) {
      const rowChildren = rows[r];
      // Render each child with cell context
      const cellContext: RenderContext = { width: cellWidth, height: context.height, theme: context.theme };
      const childLinesArr = rowChildren.map(child => child.draw(cellContext));
      // Row height = max lines among children
      const rowHeight = Math.max(...childLinesArr.map(lines => lines.length));
      // For each line index in this row
      for (let lineIdx = 0; lineIdx < rowHeight; lineIdx++) {
        const rowSegments: string[] = [];
        for (let c = 0; c < rowChildren.length; c++) {
          if (c > 0) {
            rowSegments.push(' '.repeat(columnGap));
          }
          const childLines = childLinesArr[c];
          const line = childLines[lineIdx] ?? '';
          // Pad line to cellWidth with spaces to avoid width miscalc due to missing fill
          const pad = cellWidth - (line.length); // crude; should use visibleWidth
          rowSegments.push(line + ' '.repeat(Math.max(0, pad)));
        }
        lines.push(rowSegments.join(''));
      }
      // Add row gap between rows (except after last)
      if (r < rows.length - 1 && rowGap > 0) {
        for (let g = 0; g < rowGap; g++) lines.push('');
      }
    }

    return lines;
  }
}
