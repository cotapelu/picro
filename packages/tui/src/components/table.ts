/**
 * Table Component - Displays tabular data.
 *
 * Renders rows with aligned columns based on content width.
 * Headers are optional.
 */

import type { UIElement, RenderContext } from './base.js';
import { visibleWidth } from './internal-utils.js';

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

    // Build lines
    for (const row of allRows) {
      const line = row.map((cell, i) => padCell(cell, colWidths[i])).join(' ');
      lines.push(line);
    }
    return lines;
  }
}
