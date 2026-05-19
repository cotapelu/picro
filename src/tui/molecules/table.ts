/**
 * Table Component - Displays tabular data.
 *
 * Renders rows with aligned columns based on content width.
 * Headers are optional.
 */

import type { UIElement, RenderContext } from '../core/base';
import { visibleWidth } from '../core/internal-utils';

export interface TableOptions {
  /** Header row (optional) */
  headers?: string[];
  /** Data rows, each row is an array of cell values */
  rows: string[][];
}

/**
 * Table - renders a simple text table
 */
export class Table implements UIElement {
  constructor(public options: TableOptions) {}

  clearCache(): void {
    // no cache
  }

  draw(context: RenderContext): string[] {
    const lines: string[] = [];
    const { headers, rows } = this.options;
    const allRows = headers ? [headers, ...rows] : rows;

    // Compute column widths
    const colCount = allRows.reduce((max, row) => Math.max(max, row.length), 0);
    const colWidths: number[] = new Array(colCount).fill(0);
    for (const row of allRows) {
      for (let i = 0; i < row.length; i++) {
        const w = visibleWidth(row[i]);
        if (w > colWidths[i]) colWidths[i] = w;
      }
    }

    // Helper to pad a cell
    const padCell = (text: string, width: number): string => {
      const txt = text.trim();
      const txtWidth = visibleWidth(txt);
      if (txtWidth >= width) return txt;
      const pad = width - txtWidth;
      return txt + ' '.repeat(pad);
    };

    // Build lines with conditional spacing
    for (const row of allRows) {
      let line = '';
      for (let i = 0; i < colCount; i++) {
        const rawCell = row[i] ?? '';
        const trimmed = rawCell.trim();
        const cellWidth = visibleWidth(trimmed);
        const padded = padCell(rawCell, colWidths[i]);
        line += padded;
        if (i < colCount - 1 && cellWidth === colWidths[i]) {
          line += ' ';
        }
      }
      lines.push(line);
    }
    return lines;
  }
}
